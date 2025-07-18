class EnhancedChat {
    constructor() {
        this.socket = null;
        this.currentUserId = null;
        this.currentConversation = null;
        this.typingTimeout = null;
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.isInCall = false;
        this.callType = null; // 'audio' or 'video'
        
        this.init();
    }
    
    init() {
        // Initialize Socket.IO connection
        this.socket = io();
        this.setupSocketListeners();
        this.setupEventListeners();
        this.setupWebRTC();
        
        // Get current user ID from the page
        this.currentUserId = document.querySelector('[data-user-id]')?.dataset.userId;
        
        if (this.currentUserId) {
            this.socket.emit('user_online', this.currentUserId);
        }
    }
    
    setupSocketListeners() {
        // New message received
        this.socket.on('new_message', (message) => {
            console.log('Received new message via socket:', message);
            this.handleNewMessage(message);
            this.playNotificationSound();
        });
        
        // Message sent confirmation
        this.socket.on('message_sent', (message) => {
            console.log('Message sent confirmation received:', message);
            this.updateMessageStatus(message._id, message.status || 'delivered');
        });
        
        // Message error
        this.socket.on('message_error', (errorMsg) => {
            console.error('Message error received:', errorMsg);
            this.showError(errorMsg || 'Failed to send message');
        });
        
        // Friend online/offline status
        this.socket.on('friend_online', (data) => {
            this.updateFriendOnlineStatus(data.userId, true);
        });
        
        this.socket.on('friend_offline', (data) => {
            this.updateFriendOnlineStatus(data.userId, false, data.lastSeen);
        });
        
        // Typing indicators
        this.socket.on('user_typing', (data) => {
            this.showTypingIndicator(data.senderId, data.isTyping);
        });
        
        // Message read receipts
        this.socket.on('message_read_receipt', (data) => {
            this.updateMessageReadStatus(data.messageId, data.readAt);
        });
        
        this.socket.on('messages_read', (data) => {
            this.updateConversationReadStatus(data.conversationId, data.readAt);
        });
        
        // Video call events
        this.socket.on('incoming_video_call', (data) => {
            this.handleIncomingCall(data, 'video');
        });
        
        this.socket.on('incoming_audio_call', (data) => {
            this.handleIncomingCall(data, 'audio');
        });
        
        this.socket.on('call_response', (data) => {
            this.handleCallResponse(data);
        });
        
        this.socket.on('call_ended', (data) => {
            this.handleCallEnded(data);
        });
        
        // WebRTC signaling
        this.socket.on('webrtc_offer', (data) => {
            this.handleWebRTCOffer(data);
        });
        
        this.socket.on('webrtc_answer', (data) => {
            this.handleWebRTCAnswer(data);
        });
        
        this.socket.on('webrtc_ice_candidate', (data) => {
            this.handleWebRTCIceCandidate(data);
        });
    }
    
    setupEventListeners() {
        // Message input typing detection
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('input', () => {
                this.handleTyping();
            });
            
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        // Video call button
        const videoCallBtn = document.getElementById('videoCallBtn');
        if (videoCallBtn) {
            videoCallBtn.addEventListener('click', () => {
                this.initiateVideoCall();
            });
        }
        
        // Audio call button
        const audioCallBtn = document.getElementById('audioCallBtn');
        if (audioCallBtn) {
            audioCallBtn.addEventListener('click', () => {
                this.initiateAudioCall();
            });
        }
        
        // End call button
        const endCallBtn = document.getElementById('endCallBtn');
        if (endCallBtn) {
            endCallBtn.addEventListener('click', () => {
                this.endCall();
            });
        }
        
        // Mark messages as read when conversation is opened
        document.addEventListener('click', (e) => {
            if (e.target.closest('.conversation-item')) {
                const friendId = e.target.closest('.conversation-item').dataset.friendId;
                if (friendId) {
                    this.markMessagesAsRead(friendId);
                }
            }
        });
    }
    
    setupWebRTC() {
        // WebRTC configuration
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }
    
    handleNewMessage(message) {
        // Add message to current conversation if it's open
        if (this.currentConversation && 
            (message.sender._id === this.currentConversation || 
             message.receiver === this.currentConversation)) {
            this.appendMessageToChat(message);
        }
        
        // Update conversation list
        this.updateConversationList();
        
        // Show notification if not in current conversation
        if (!this.currentConversation || 
            (message.sender._id !== this.currentConversation && 
             message.receiver !== this.currentConversation)) {
            this.showNotification(message);
        }
    }
    
    handleTyping() {
        if (!this.currentConversation) return;
        
        // Send typing start event
        this.socket.emit('typing_start', {
            senderId: this.currentUserId,
            receiverId: this.currentConversation
        });
        
        // Clear existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        // Set timeout to send typing stop event
        this.typingTimeout = setTimeout(() => {
            this.socket.emit('typing_stop', {
                senderId: this.currentUserId,
                receiverId: this.currentConversation
            });
        }, 1000);
    }
    
    showTypingIndicator(senderId, isTyping) {
        const typingIndicator = document.getElementById('typingIndicator');
        if (!typingIndicator) return;
        
        if (isTyping && senderId === this.currentConversation) {
            typingIndicator.style.display = 'block';
            typingIndicator.textContent = 'Typing...';
        } else {
            typingIndicator.style.display = 'none';
        }
    }
    
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();
        
        if (!content || !this.currentConversation) return;
        
        try {
            // Show temporary message with sending status
            const tempId = 'msg-' + Date.now();
            this.appendMessageToChat({
                _id: tempId,
                content: content,
                createdAt: new Date(),
                isSender: true,
                status: 'sent'
            });
            
            // Clear input immediately for better UX
            messageInput.value = '';
            
            // Send message to server
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    receiverId: this.currentConversation,
                    content: content,
                    messageType: 'text'
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                this.showError(error.error || 'Failed to send message');
                
                // Mark message as failed
                const msgElement = document.getElementById(tempId);
                if (msgElement) {
                    const statusElement = msgElement.querySelector('.read-status');
                    if (statusElement) {
                        statusElement.className = 'read-status error';
                        statusElement.textContent = '!'; 
                    }
                    
                    const metaElement = msgElement.querySelector('.message-meta');
                    if (metaElement) {
                        metaElement.innerHTML += '<span class="error-text">Failed to send</span>';
                    }
                }
            }
            
            // Note: On success, the socket event will handle updating the message status
        } catch (error) {
            console.error('Send message error:', error);
            this.showError('Failed to send message');
        }
    }
    
    markMessagesAsRead(friendId) {
        if (!friendId || !this.currentUserId) return;
        
        this.socket.emit('message_read', {
            senderId: friendId,
            receiverId: this.currentUserId
        });
        
        // Also make API call to mark as read
        fetch('/api/chat/mark-read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                friendId: friendId
            })
        }).catch(error => {
            console.error('Mark as read error:', error);
        });
    }
    
    async initiateVideoCall() {
        if (!this.currentConversation) return;
        
        try {
            const response = await fetch('/api/chat/video-call', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    receiverId: this.currentConversation
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.callType = 'video';
                this.showCallInterface('Calling...', 'outgoing');
                await this.setupLocalStream(true); // true for video
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to initiate video call');
            }
        } catch (error) {
            console.error('Video call error:', error);
            this.showError('Failed to initiate video call');
        }
    }
    
    async initiateAudioCall() {
        if (!this.currentConversation) return;
        
        try {
            const response = await fetch('/api/chat/audio-call', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    receiverId: this.currentConversation
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.callType = 'audio';
                this.showCallInterface('Calling...', 'outgoing');
                await this.setupLocalStream(false); // false for audio only
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to initiate audio call');
            }
        } catch (error) {
            console.error('Audio call error:', error);
            this.showError('Failed to initiate audio call');
        }
    }
    
    async handleIncomingCall(data, type) {
        this.callType = type;
        const accept = confirm(`Incoming ${type} call from ${data.callerName}. Accept?`);
        
        if (accept) {
            this.socket.emit('call_response', {
                callerId: data.callerId,
                receiverId: this.currentUserId,
                accepted: true
            });
            
            this.showCallInterface(`${type} call with ${data.callerName}`, 'incoming');
            await this.setupLocalStream(type === 'video');
        } else {
            this.socket.emit('call_response', {
                callerId: data.callerId,
                receiverId: this.currentUserId,
                accepted: false
            });
        }
    }
    
    handleCallResponse(data) {
        if (data.accepted) {
            this.showCallInterface('Connected', 'active');
            this.createPeerConnection();
        } else {
            this.showError('Call was declined');
            this.hideCallInterface();
        }
    }
    
    handleCallEnded(data) {
        this.endCall();
        this.showNotification({ content: `Call ended by ${data.endedBy}` });
    }
    
    async setupLocalStream(includeVideo) {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: includeVideo,
                audio: true
            });
            
            const localVideo = document.getElementById('localVideo');
            if (localVideo && includeVideo) {
                localVideo.srcObject = this.localStream;
            }
            
            return this.localStream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            this.showError('Failed to access camera/microphone');
            throw error;
        }
    }
    
    createPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.rtcConfig);
        
        // Add local stream to peer connection
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }
        
        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo) {
                remoteVideo.srcObject = this.remoteStream;
            }
        };
        
        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('webrtc_ice_candidate', {
                    receiverId: this.currentConversation,
                    candidate: event.candidate
                });
            }
        };
        
        this.isInCall = true;
    }
    
    async handleWebRTCOffer(data) {
        if (!this.peerConnection) {
            this.createPeerConnection();
        }
        
        await this.peerConnection.setRemoteDescription(data.offer);
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        
        this.socket.emit('webrtc_answer', {
            senderId: this.currentUserId,
            receiverId: data.senderId,
            answer: answer
        });
    }
    
    async handleWebRTCAnswer(data) {
        if (this.peerConnection) {
            await this.peerConnection.setRemoteDescription(data.answer);
        }
    }
    
    async handleWebRTCIceCandidate(data) {
        if (this.peerConnection) {
            await this.peerConnection.addIceCandidate(data.candidate);
        }
    }
    
    endCall() {
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Clear remote stream
        this.remoteStream = null;
        
        // Hide call interface
        this.hideCallInterface();
        
        // Notify other participant
        if (this.isInCall) {
            this.socket.emit('call_ended', {
                participantId: this.currentConversation,
                endedBy: this.currentUserId
            });
        }
        
        this.isInCall = false;
        this.callType = null;
    }
    
    showCallInterface(status, type) {
        let callInterface = document.getElementById('callInterface');
        if (!callInterface) {
            callInterface = document.createElement('div');
            callInterface.id = 'callInterface';
            callInterface.className = 'call-interface';
            document.body.appendChild(callInterface);
        }
        
        callInterface.innerHTML = `
            <div class="call-container">
                <div class="call-header">
                    <h3>${status}</h3>
                    <span class="call-type">${this.callType} call</span>
                </div>
                <div class="call-videos">
                    ${this.callType === 'video' ? `
                        <video id="remoteVideo" autoplay playsinline></video>
                        <video id="localVideo" autoplay playsinline muted></video>
                    ` : `
                        <div class="audio-call-indicator">
                            <i class="fas fa-phone"></i>
                            <p>Audio Call in Progress</p>
                        </div>
                    `}
                </div>
                <div class="call-controls">
                    <button id="endCallBtn" class="btn btn-danger">
                        <i class="fas fa-phone-slash"></i> End Call
                    </button>
                </div>
            </div>
        `;
        
        callInterface.style.display = 'block';
        
        // Re-attach event listener for end call button
        const endCallBtn = document.getElementById('endCallBtn');
        if (endCallBtn) {
            endCallBtn.addEventListener('click', () => {
                this.endCall();
            });
        }
    }
    
    hideCallInterface() {
        const callInterface = document.getElementById('callInterface');
        if (callInterface) {
            callInterface.style.display = 'none';
        }
    }
    
    updateFriendOnlineStatus(userId, isOnline, lastSeen = null) {
        // Update online status indicators in friend list
        const friendElements = document.querySelectorAll(`[data-friend-id="${userId}"]`);
        friendElements.forEach(element => {
            const statusIndicator = element.querySelector('.online-status');
            if (statusIndicator) {
                statusIndicator.className = `online-status ${isOnline ? 'online' : 'offline'}`;
                statusIndicator.title = isOnline ? 'Online' : `Last seen: ${this.formatLastSeen(lastSeen)}`;
            }
        });
    }
    
    updateMessageReadStatus(messageId, readAt) {
        // Update message read status in UI
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            const statusElement = messageElement.querySelector('.read-status');
            if (statusElement) {
                statusElement.className = 'read-status read';
                statusElement.textContent = this.getStatusIcon('read');
                statusElement.title = `Read at ${new Date(readAt).toLocaleTimeString()}`;
            }
        }
    }
    
    updateConversationReadStatus(conversationId, readAt) {
        // Update all messages in a conversation as read
        const messages = document.querySelectorAll('.message.sent');
        messages.forEach(message => {
            const statusElement = message.querySelector('.read-status');
            if (statusElement && statusElement.className !== 'read-status read') {
                statusElement.className = 'read-status read';
                statusElement.textContent = this.getStatusIcon('read');
                statusElement.title = `Read at ${new Date(readAt).toLocaleTimeString()}`;
            }
        });
    }
    
    formatLastSeen(lastSeen) {
        if (!lastSeen) return 'a while ago';
        
        const now = new Date();
        const lastSeenDate = new Date(lastSeen);
        const diffMs = now - lastSeenDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return lastSeenDate.toLocaleDateString();
    }
    
    appendMessageToChat(message) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.isSender ? 'sent' : 'received'}`;
        
        // Add message ID for reference (useful for updating status later)
        if (message._id) {
            messageElement.id = message._id;
        }
        
        messageElement.innerHTML = `
            <div class="message-content">
                <p>${this.escapeHtml(message.content)}</p>
                <div class="message-meta">
                    <span class="timestamp">${this.formatTimestamp(message.createdAt)}</span>
                    ${message.isSender ? `<span class="read-status ${message.status || 'sent'}">${this.getStatusIcon(message.status || 'sent')}</span>` : ''}
                </div>
            </div>
        `;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    getStatusIcon(status) {
        switch (status) {
            case 'sent': return '✓';
            case 'delivered': return '✓✓';
            case 'read': return '✓✓';
            default: return '';
        }
    }
    
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`New message from ${message.senderInfo?.fullName || 'Friend'}`, {
                body: message.content,
                icon: '/images/logo.png'
            });
        }
    }
    
    playNotificationSound() {
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(e => console.log('Could not play notification sound'));
    }
    
    showError(message) {
        // Create or update error toast
        let errorToast = document.getElementById('errorToast');
        if (!errorToast) {
            errorToast = document.createElement('div');
            errorToast.id = 'errorToast';
            errorToast.className = 'toast error-toast';
            document.body.appendChild(errorToast);
        }
        
        errorToast.textContent = message;
        errorToast.style.display = 'block';
        
        setTimeout(() => {
            errorToast.style.display = 'none';
        }, 5000);
    }
    
    updateConversationList() {
        // Refresh conversation list
        fetch('/api/chat/conversations')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.renderConversationList(data.conversations);
                }
            })
            .catch(error => {
                console.error('Error updating conversation list:', error);
            });
    }
    
    renderConversationList(conversations) {
        const conversationList = document.getElementById('conversationList');
        if (!conversationList) return;
        
        conversationList.innerHTML = conversations.map(conv => `
            <div class="conversation-item" data-friend-id="${conv.friend._id}">
                <div class="friend-avatar">
                    <img src="${conv.friend.avatar}" alt="${conv.friend.fullName}">
                    <div class="online-status ${conv.friend.isOnline ? 'online' : 'offline'}"></div>
                </div>
                <div class="conversation-info">
                    <h4>${conv.friend.fullName}</h4>
                    <p class="last-message">${conv.lastMessage.content}</p>
                    <span class="timestamp">${this.formatTimestamp(conv.lastMessage.timestamp)}</span>
                </div>
                ${conv.unreadCount > 0 ? `<div class="unread-badge">${conv.unreadCount}</div>` : ''}
            </div>
        `).join('');
    }
}

// Initialize enhanced chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Initialize enhanced chat
    window.enhancedChat = new EnhancedChat();
});

// CSS for call interface and enhanced features
const style = document.createElement('style');
style.textContent = `
    .call-interface {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: none;
    }
    
    .call-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        color: white;
    }
    
    .call-header {
        text-align: center;
        padding: 20px;
        background: rgba(0, 0, 0, 0.5);
    }
    
    .call-videos {
        flex: 1;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    
    #remoteVideo {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    #localVideo {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 200px;
        height: 150px;
        object-fit: cover;
        border: 2px solid white;
        border-radius: 8px;
    }
    
    .audio-call-indicator {
        text-align: center;
    }
    
    .audio-call-indicator i {
        font-size: 4rem;
        margin-bottom: 20px;
    }
    
    .call-controls {
        text-align: center;
        padding: 20px;
        background: rgba(0, 0, 0, 0.5);
    }
    
    .online-status {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        position: absolute;
        bottom: 2px;
        right: 2px;
        border: 2px solid white;
    }
    
    .online-status.online {
        background: #4CAF50;
    }
    
    .online-status.offline {
        background: #9E9E9E;
    }
    
    .message .read-status {
        color: #4CAF50;
        margin-left: 5px;
    }
    
    .message .read-status.sent {
        color: #9E9E9E;
    }
    
    .message .read-status.delivered {
        color: #2196F3;
    }
    
    .message .read-status.error {
        color: #f44336;
        font-weight: bold;
    }
    
    .error-text {
        color: #f44336;
        font-size: 0.7rem;
        margin-left: 5px;
    }
    
    .typing-indicator {
        font-style: italic;
        color: #666;
        padding: 5px 10px;
        display: none;
    }
    
    .error-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 9999;
        display: none;
    }
    
    .unread-badge {
        background: #f44336;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        position: absolute;
        top: 5px;
        right: 5px;
    }
`;
document.head.appendChild(style);