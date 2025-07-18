// Chat Socket Handler
document.addEventListener('DOMContentLoaded', function() {
    // Initialize socket connection
    let socket;
    try {
        socket = io();
        console.log('Socket.IO initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Socket.IO:', error);
        socket = {
            // Fallback mock socket if real socket fails
            on: () => {},
            emit: () => {}
        };
    }
    
    let currentUserId = null;
    
    // Get current user ID from multiple possible sources
    let userIdElement = document.querySelector('[data-user-id]');
    if (!userIdElement) {
        // Try to get from window.user if available
        if (window.user && window.user._id) {
            currentUserId = window.user._id;
        }
        // Try to get from a script tag with user data
        const userScript = document.querySelector('script[data-user]');
        if (userScript) {
            try {
                const userData = JSON.parse(userScript.dataset.user);
                currentUserId = userData._id;
            } catch (e) {
                console.error('Failed to parse user data from script tag:', e);
            }
        }
    } else {
        currentUserId = userIdElement.dataset.userId;
    }
    
    if (currentUserId) {
        console.log('Current user ID:', currentUserId);
        
        // Authenticate with socket server
        if (socket.connected) {
            socket.emit('authenticate', { userId: currentUserId });
            socket.emit('join', { userId: currentUserId });
        } else {
            console.log('Socket not connected, will authenticate when connected');
            socket.on('connect', () => {
                console.log('Socket connected, authenticating user');
                socket.emit('authenticate', { userId: currentUserId });
                socket.emit('join', { userId: currentUserId });
            });
        }
    } else {
        console.error('Could not find current user ID');
    }
    
    // Socket event listeners
    socket.on('connect', () => {
        console.log('Connected to socket server with ID:', socket.id);
        
        // Join user's room for private messages
        if (currentUserId) {
            console.log('Joining room for user:', currentUserId);
            socket.emit('join', { userId: currentUserId });
        }
    });
    
    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });
    
    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
    });
    
    // Handle new messages
    socket.on('new_message', (message) => {
        console.log('New message received:', message);
        
        if (!message) {
            console.error('Received empty message');
            return;
        }
        
        // Check if this message belongs to the current conversation
        const currentFriend = window.currentFriend;
        const senderId = message.sender?._id || message.sender;
        const receiverId = message.receiver;
        
        console.log('Message details:', {
            senderId,
            receiverId,
            currentFriend,
            currentUserId
        });
        
        if (currentFriend && 
            ((senderId === currentFriend) || 
             (receiverId === currentFriend && senderId === currentUserId))) {
            
            console.log('Message belongs to current conversation, adding to UI');
            // Add message to UI
            addMessageToUI(message);
            
            // Play notification sound
            playNotificationSound();
            
            // Mark as read if it's from the current conversation
            if (senderId === currentFriend) {
                markMessageAsRead(message._id);
            }
        } else {
            console.log('Message is from another conversation, updating list');
            // Update conversation list to show unread message
            updateConversationList();
            
            // Show notification
            showNotification(message);
        }
    });
    
    // Handle message sent confirmation
    socket.on('message_sent', (message) => {
        console.log('Message sent confirmation:', message);
        
        // Find temporary message and update its status
        const tempMessage = document.getElementById('msg-' + message._id);
        if (tempMessage) {
            const statusElement = tempMessage.querySelector('.read-status');
            if (statusElement) {
                statusElement.className = 'read-status delivered';
                statusElement.textContent = '✓✓';
            }
        }
    });
    
    // Handle message error
    socket.on('message_error', (error) => {
        console.error('Message error:', error);
        showErrorToast('Failed to send message: ' + error);
    });
    
    // Handle friend online/offline status
    socket.on('friend_online', (data) => {
        updateFriendStatus(data.userId, true);
    });
    
    socket.on('friend_offline', (data) => {
        updateFriendStatus(data.userId, false, data.lastSeen);
    });
    
    // Handle typing indicators
    socket.on('user_typing', (data) => {
        showTypingIndicator(data.senderId, data.isTyping);
    });
    
    // Handle message read receipts
    socket.on('message_read_receipt', (data) => {
        updateMessageReadStatus(data.messageId, data.readAt);
    });
    
    socket.on('messages_read', (data) => {
        updateConversationReadStatus(data.conversationId, data.readAt);
    });
    
    // Handle authentication response
    socket.on('authenticated', (data) => {
        if (data.success) {
            console.log('Socket authentication successful for user:', data.userId);
        } else {
            console.error('Socket authentication failed:', data.error);
        }
    });
    
    // Helper functions
    function addMessageToUI(message) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) {
            console.error('Chat messages container not found');
            return;
        }
        
        // Make sure the chat messages container is visible
        chatMessages.style.display = 'block';
        
        // Hide any empty chat message
        const emptyChat = document.querySelector('.empty-chat');
        if (emptyChat) {
            emptyChat.style.display = 'none';
        }
        
        // Determine if the current user is the sender
        const senderId = message.sender?._id || message.sender;
        const isSender = senderId === currentUserId;
        
        // Format timestamp
        const timestamp = new Date(message.createdAt || new Date()).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        const statusIcon = isSender ? getStatusIcon(message.status || 'sent') : '';
        const statusClass = isSender ? `read-status ${message.status || 'sent'}` : '';
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isSender ? 'sent' : 'received'}`;
        messageElement.id = message._id || 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Set message content with proper escaping
        const content = message.content || '';
        
        messageElement.innerHTML = `
            <div class="message-content">
                <p>${escapeHtml(content)}</p>
                <div class="message-meta">
                    <span class="timestamp">${timestamp}</span>
                    ${isSender ? `<span class="${statusClass}">${statusIcon}</span>` : ''}
                </div>
            </div>
        `;
        
        // Add to chat and scroll to bottom
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function getStatusIcon(status) {
        switch (status) {
            case 'sent': return '✓';
            case 'delivered': return '✓✓';
            case 'read': return '✓✓';
            case 'error': return '!';
            default: return '✓';
        }
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function updateFriendStatus(userId, isOnline, lastSeen = null) {
        const friendElements = document.querySelectorAll(`[data-friend-id="${userId}"]`);
        friendElements.forEach(element => {
            const statusIndicator = element.querySelector('.online-status');
            if (statusIndicator) {
                statusIndicator.className = `online-status ${isOnline ? 'online' : 'offline'}`;
                statusIndicator.title = isOnline ? 'Online' : `Last seen: ${formatLastSeen(lastSeen)}`;
            }
        });
        
        // Update status in chat header if this is the current friend
        if (window.currentFriend === userId) {
            const friendStatus = document.getElementById('friendStatus');
            if (friendStatus) {
                const indicator = friendStatus.querySelector('.online-indicator');
                const statusText = friendStatus.querySelector('.status-text');
                
                if (indicator) {
                    indicator.className = `online-indicator ${isOnline ? '' : 'offline'}`;
                }
                
                if (statusText) {
                    statusText.textContent = isOnline ? 'Online' : `Last seen ${formatLastSeen(lastSeen)}`;
                }
            }
        }
    }
    
    function formatLastSeen(lastSeen) {
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
    
    function showTypingIndicator(senderId, isTyping) {
        const typingIndicator = document.getElementById('typingIndicator');
        if (!typingIndicator) return;
        
        if (isTyping && senderId === window.currentFriend) {
            typingIndicator.style.display = 'block';
        } else {
            typingIndicator.style.display = 'none';
        }
    }
    
    function updateMessageReadStatus(messageId, readAt) {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            const statusElement = messageElement.querySelector('.read-status');
            if (statusElement) {
                statusElement.className = 'read-status read';
                statusElement.textContent = getStatusIcon('read');
                statusElement.title = `Read at ${new Date(readAt).toLocaleTimeString()}`;
            }
        }
    }
    
    function updateConversationReadStatus(conversationId, readAt) {
        // Update all sent messages in the current conversation as read
        const sentMessages = document.querySelectorAll('.message.sent');
        sentMessages.forEach(message => {
            const statusElement = message.querySelector('.read-status');
            if (statusElement && statusElement.className !== 'read-status read') {
                statusElement.className = 'read-status read';
                statusElement.textContent = getStatusIcon('read');
                statusElement.title = `Read at ${new Date(readAt).toLocaleTimeString()}`;
            }
        });
    }
    
    function markMessageAsRead(messageId) {
        socket.emit('message_read', {
            messageId: messageId,
            senderId: window.currentFriend,
            receiverId: currentUserId
        });
        
        // Also make API call to mark as read
        fetch('/api/chat/mark-read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                friendId: window.currentFriend
            })
        }).catch(error => {
            console.error('Mark as read error:', error);
        });
    }
    
    function updateConversationList() {
        fetch('/api/chat/conversations')
            .then(response => response.json())
            .then(data => {
                if (data.success && typeof window.displayConversations === 'function') {
                    window.displayConversations(data.conversations);
                }
            })
            .catch(error => {
                console.error('Error updating conversation list:', error);
            });
    }
    
    function showNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const senderName = message.sender?.fullName || 'Someone';
            new Notification(`New message from ${senderName}`, {
                body: message.content,
                icon: '/images/logo.png'
            });
        }
        
        playNotificationSound();
    }
    
    function playNotificationSound() {
        try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.play().catch(e => console.log('Could not play notification sound'));
        } catch (e) {
            console.log('Notification sound not available');
        }
    }
    
    function showErrorToast(message) {
        let errorToast = document.getElementById('errorToast');
        if (!errorToast) {
            errorToast = document.createElement('div');
            errorToast.id = 'errorToast';
            errorToast.className = 'error-toast';
            document.body.appendChild(errorToast);
        }
        
        errorToast.textContent = message;
        errorToast.style.display = 'block';
        
        setTimeout(() => {
            errorToast.style.display = 'none';
        }, 5000);
    }
    
    // Expose socket to window for use in other scripts
    window.chatSocket = socket;
    
    // Handle typing events
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        let typingTimeout = null;
        
        messageInput.addEventListener('input', () => {
            if (!window.currentFriend) return;
            
            // Send typing start event
            socket.emit('typing_start', {
                senderId: currentUserId,
                receiverId: window.currentFriend
            });
            
            // Clear existing timeout
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }
            
            // Set timeout to send typing stop event
            typingTimeout = setTimeout(() => {
                socket.emit('typing_stop', {
                    senderId: currentUserId,
                    receiverId: window.currentFriend
                });
            }, 1000);
        });
    }
    
    // Override the sendMessage function to use socket
    window.originalSendMessage = window.sendMessage;
    window.sendMessage = async function() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();
        
        if (!content || !window.currentFriend) return;
        
        try {
            console.log('Sending message to friend:', window.currentFriend);
            // Show sending indicator immediately for better UX
            const messagesArea = document.getElementById('chatMessages');
            if (!messagesArea) {
                console.error('Chat messages container not found');
                return;
            }
            
            const tempId = 'msg-' + Date.now();
            const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            
            // Add message to UI immediately with pending status
            messagesArea.innerHTML += `
                <div id="${tempId}" class="message sent">
                    <div class="message-content">
                        <p>${escapeHtml(content)}</p>
                        <div class="message-meta">
                            <span class="timestamp">${timestamp}</span>
                            <span class="read-status sent">✓</span>
                        </div>
                    </div>
                </div>
            `;
            messagesArea.scrollTop = messagesArea.scrollHeight;
            
            // Clear input immediately
            messageInput.value = '';
            
            // Try socket first for real-time delivery
            console.log('Emitting send_message event with data:', {
                receiver: window.currentFriend,
                content: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
                messageType: 'text'
            });
            
            socket.emit('send_message', {
                receiverId: window.currentFriend,
                content: content,
                messageType: 'text'
            });
            
            // Also send via API as backup
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    receiverId: window.currentFriend,
                    content: content,
                    messageType: 'text'
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                // Show error status
                const msgElement = document.getElementById(tempId);
                if (msgElement) {
                    const statusElement = msgElement.querySelector('.read-status');
                    if (statusElement) {
                        statusElement.className = 'read-status error';
                        statusElement.textContent = '!';
                    }
                    
                    const metaElement = msgElement.querySelector('.message-meta');
                    if (metaElement) {
                        metaElement.innerHTML += '<span style="color: #f44336; font-size: 0.8rem; margin-left: 5px;">Failed</span>';
                    }
                }
                console.error('Failed to send message:', data.error);
                showErrorToast('Failed to send message: ' + data.error);
            } else {
                // Update the message ID to the real one for future reference
                const msgElement = document.getElementById(tempId);
                if (msgElement && data.message && data.message._id) {
                    msgElement.id = data.message._id;
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            showErrorToast('Failed to send message. Please try again.');
        }
    };
});