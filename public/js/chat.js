// Chat functionality for real-time messaging
class ChatManager {
    constructor() {
        this.socket = io();
        this.currentConversationId = null;
        this.currentFriendId = null;
        this.messageInput = document.getElementById('message-input');
        this.messagesContainer = document.getElementById('messages-container');
        this.conversationsList = document.querySelector('.conversation-list');
        
        console.log('ChatManager initialized:', {
            messageInput: !!this.messageInput,
            messagesContainer: !!this.messagesContainer,
            conversationsList: !!this.conversationsList
        });
        
        this.init();
    }
    
    init() {
        try {
            this.setupEventListeners();
            this.loadConversations();
            this.setupSocket();
            console.log('ChatManager initialization completed');
        } catch (error) {
            console.error('ChatManager initialization failed:', error);
        }
    }

    setupSocket() {
      this.socket.on('connect', () => {
        console.log('Connected to Socket.IO server');
        this.socket.emit('join', window.currentUserId);
      });

      this.socket.on('new message', (message) => {
        this.addMessageToUI(message, false);
      });
    }
    
    setupEventListeners() {
        console.log('Setting up event listeners...');

        // Event delegation for conversation list
        if (this.conversationsList) {
            this.conversationsList.addEventListener('click', (e) => {
                const conversationItem = e.target.closest('.conversation-item');
                if (conversationItem) {
                    const friendId = conversationItem.dataset.friendId;
                    const friendName = conversationItem.querySelector('.conversation-name').textContent;
                    const friendAvatar = conversationItem.querySelector('.conversation-avatar').style.backgroundImage;
                    const friendInfo = {
                        _id: friendId,
                        fullName: friendName,
                        avatar: friendAvatar
                    };
                    this.loadConversation(friendId, friendInfo);
                }
            });
        }
        
        // Send message on button click
        const sendBtn = document.querySelector('.send-btn');
        console.log('Send button found:', !!sendBtn);
        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                console.log('Send button clicked');
                e.preventDefault();
                this.sendMessage();
            });
        }
        
        // Send message on Enter key
        if (this.messageInput) {
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('Enter key pressed');
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        // New chat buttons (both in header and sidebar)
        const newChatBtns = document.querySelectorAll('.new-chat-btn, .btn-primary');
        console.log('New chat buttons found:', newChatBtns.length);
        newChatBtns.forEach((btn, index) => {
            const hasNewChatText = btn.textContent.includes('New Chat');
            const hasPlusIcon = btn.querySelector('i.fa-plus');
            console.log(`Button ${index}:`, { hasNewChatText, hasPlusIcon, text: btn.textContent.trim() });
            
            if (hasNewChatText || hasPlusIcon) {
                btn.addEventListener('click', (e) => {
                    console.log('New chat button clicked');
                    e.preventDefault();
                    this.showAddFriendModal();
                });
            }
        });
        
        // Start chat button in no-conversation area
        const startChatBtn = document.querySelector('.start-chat-btn');
        console.log('Start chat button found:', !!startChatBtn);
        if (startChatBtn) {
            startChatBtn.addEventListener('click', (e) => {
                console.log('Start chat button clicked');
                e.preventDefault();
                this.showAddFriendModal();
            });
        }
        
        console.log('Event listeners setup completed');
    }
    
    async loadConversations() {
        try {
            console.log('Loading conversations...');
            const response = await fetch('/api/chat/conversations');
            console.log('Conversations response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Conversations result:', result);
            
            if (result.success) {
                console.log('Conversations loaded:', result.conversations.length);
                this.renderConversations(result.conversations);
            } else {
                console.error('Failed to load conversations:', result.error);
                this.showError('Failed to load conversations: ' + result.error);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            this.showError('Failed to load conversations');
        }
    }
    
    renderConversations(conversations) {
        if (!this.conversationsList) return;
        
        this.conversationsList.innerHTML = '';
        
        conversations.forEach(conv => {
            const conversationItem = document.createElement('li');
            conversationItem.className = 'conversation-item';
            conversationItem.dataset.friendId = conv.friend._id;
            
            conversationItem.innerHTML = `
                <div class="conversation-user">
                    <div class="conversation-avatar" style="background-image: url('${conv.friend.avatar}'); background-size: cover;">
                        ${conv.friend.avatar.includes('ui-avatars') ? conv.friend.firstName.charAt(0) : ''}
                    </div>
                    <div class="conversation-name">${conv.friend.firstName}</div>
                    <div class="conversation-time">${this.formatTime(conv.lastMessage.timestamp)}</div>
                </div>
                <div class="conversation-preview">
                    <div class="conversation-message">
                        ${conv.lastMessage.isFromCurrentUser ? 'You: ' : ''}
                        ${conv.lastMessage.content.length > 30 ? 
                            conv.lastMessage.content.substring(0, 30) + '...' : 
                            conv.lastMessage.content}
                    </div>
                    ${conv.unreadCount > 0 ? `<div class="unread-count">${conv.unreadCount}</div>` : ''}
                </div>
            `;
            
            this.conversationsList.appendChild(conversationItem);
        });
    }
    
    async loadConversation(friendId, friendInfo) {
        try {
            // Update active conversation
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`[data-friend-id="${friendId}"]`)?.classList.add('active');
            
            this.currentFriendId = friendId;
            this.currentConversationId = this.createConversationId(window.currentUserId, friendId);
            
            // Update chat header
            this.updateChatHeader(friendInfo);
            
            // Load messages
            const response = await fetch(`/api/chat/messages/${friendId}`);
            const result = await response.json();
            
            if (result.success) {
                this.renderMessages(result.messages);
                this.showChatArea();
            } else {
                console.error('Failed to load messages:', result.error);
            }
        } catch (error) {
            console.error('Error loading conversation:', error);
        }
    }
    
    updateChatHeader(friendInfo) {
        const chatHeader = document.querySelector('.chat-header');
        if (!chatHeader) return;
        
        const chatUser = chatHeader.querySelector('.chat-user');
        if (chatUser) {
            chatUser.innerHTML = `
                <div class="chat-avatar" style="background-image: url('${friendInfo.avatar}'); background-size: cover;">
                    ${friendInfo.avatar.includes('ui-avatars') ? friendInfo.firstName.charAt(0) : ''}
                </div>
                <div>
                    <div class="chat-name">${friendInfo.fullName}</div>
                    <div class="chat-status">Online</div>
                </div>
            `;
        }
    }
    
    renderMessages(messages) {
        if (!this.messagesContainer) return;
        
        this.messagesContainer.innerHTML = '';
        
        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            const isCurrentUser = msg.sender._id === window.currentUserId;
            messageDiv.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
            
            const senderName = isCurrentUser ? window.currentUserName : msg.sender.fullName;
            const avatarUrl = isCurrentUser ? 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(window.currentUserName)}&background=6C63FF&color=fff` :
                `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender.fullName)}&background=6C63FF&color=fff`;
            
            messageDiv.innerHTML = `
                <div class="message-avatar" style="background-image: url('${avatarUrl}'); background-size: cover;">
                    ${senderName.charAt(0)}
                </div>
                <div class="message-content">
                    <div class="message-bubble">${this.escapeHtml(msg.content)}</div>
                    <div class="message-time">
                        ${this.formatTime(msg.createdAt)}
                        ${isCurrentUser ? '<i class="fas fa-check" style="margin-left: 4px;"></i>' : ''}
                    </div>
                </div>
            `;
            
            this.messagesContainer.appendChild(messageDiv);
        });
        
        // Scroll to bottom
        this.scrollToBottom();
    }
    
    async sendMessage() {
        console.log('sendMessage called');
        console.log('Current state:', {
            hasMessageInput: !!this.messageInput,
            currentFriendId: this.currentFriendId,
            inputValue: this.messageInput?.value
        });
        
        if (!this.messageInput) {
            console.error('Message input not found');
            this.showError('Message input not found');
            return;
        }
        
        if (!this.currentFriendId) {
            console.error('No friend selected');
            this.showError('Please select a friend to send message to');
            return;
        }
        
        const content = this.messageInput.value.trim();
        if (!content) {
            console.log('Empty message content');
            return;
        }
        
        console.log('Sending message:', { receiverId: this.currentFriendId, content });
        console.log('Client-side window.currentUserId:', window.currentUserId);

        const message = {
          sender: window.currentUserId,
          receiver: this.currentFriendId,
          content: content,
          createdAt: new Date().toISOString()
        };

        this.socket.emit('send message', message);
        this.addMessageToUI(message, true);
        this.messageInput.value = '';
        this.scrollToBottom();
        this.loadConversations();
    }
    
    addMessageToUI(message, isCurrentUser) {
        if (!this.messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
        
        const senderName = isCurrentUser ? window.currentUserName : message.sender.fullName;
        const avatarUrl = isCurrentUser ? 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(window.currentUserName)}&background=6C63FF&color=fff` :
            `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender.fullName)}&background=6C63FF&color=fff`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar" style="background-image: url('${avatarUrl}'); background-size: cover;">
                ${senderName.charAt(0)}
            </div>
            <div class="message-content">
                <div class="message-bubble">${this.escapeHtml(message.content)}</div>
                <div class="message-time">
                    ${this.formatTime(message.createdAt)}
                    ${isCurrentUser ? '<i class="fas fa-check" style="margin-left: 4px;"></i>' : ''}
                </div>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
    }
    
    showChatArea() {
        const noConversation = document.querySelector('.no-conversation');
        const chatHeader = document.querySelector('.chat-header');
        const messagesContainer = document.querySelector('.messages-container');
        const messageInputContainer = document.querySelector('.message-input-container');
        
        if (noConversation) noConversation.style.display = 'none';
        if (chatHeader) chatHeader.style.display = 'flex';
        if (messagesContainer) messagesContainer.style.display = 'block';
        if (messageInputContainer) messageInputContainer.style.display = 'flex';
    }
    
    showAddFriendModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Send Friend Request</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <input type="email" id="friend-email" placeholder="Enter friend's email address" class="form-input">
                    <textarea id="friend-message" placeholder="Add a personal message (optional)" class="form-input" rows="3" style="resize: vertical;">Hi! I would like to connect with you on our fitness journey.</textarea>
                    <div id="search-results"></div>
                </div>
                <div class="modal-footer">
                    <button id="send-request-btn" class="btn btn-primary">Send Friend Request</button>
                    <button class="modal-close btn btn-secondary">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup modal event listeners
        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });
        
        const sendRequestBtn = modal.querySelector('#send-request-btn');
        const friendEmailInput = modal.querySelector('#friend-email');
        const friendMessageInput = modal.querySelector('#friend-message');
        
        sendRequestBtn.addEventListener('click', async () => {
            const email = friendEmailInput.value.trim();
            const message = friendMessageInput.value.trim();
            if (!email) return;
            
            try {
                const response = await fetch('/api/chat/send-friend-request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        friendEmail: email,
                        message: message || 'Hi! I would like to connect with you on our fitness journey.'
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.showSuccess('Friend request sent successfully!');
                    modal.remove();
                    this.loadConversations();
                } else {
                    this.showError(result.error);
                }
            } catch (error) {
                console.error('Error sending friend request:', error);
                this.showError('Failed to send friend request');
            }
        });
        
        // Search functionality
        friendEmailInput.addEventListener('input', this.debounce(async (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) {
                modal.querySelector('#search-results').innerHTML = '';
                return;
            }
            
            try {
                const response = await fetch(`/api/chat/search-users?q=${encodeURIComponent(query)}`);
                const result = await response.json();
                
                if (result.success) {
                    this.renderSearchResults(result.users, modal.querySelector('#search-results'), friendEmailInput);
                }
            } catch (error) {
                console.error('Error searching users:', error);
            }
        }, 300));
        
        // Show friend requests button
        this.addFriendRequestsButton(modal);
    }
    
    addFriendRequestsButton(modal) {
        const modalBody = modal.querySelector('.modal-body');
        const requestsBtn = document.createElement('button');
        requestsBtn.className = 'btn btn-outline-primary';
        requestsBtn.style.marginTop = '10px';
        requestsBtn.innerHTML = '<i class="fas fa-inbox"></i> View Friend Requests';
        requestsBtn.addEventListener('click', () => {
            modal.remove();
            this.showFriendRequestsModal();
        });
        modalBody.appendChild(requestsBtn);
    }
    
    async showFriendRequestsModal() {
        try {
            const response = await fetch('/api/chat/friend-requests');
            const result = await response.json();
            
            if (!result.success) {
                this.showError('Failed to load friend requests');
                return;
            }
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Friend Requests</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="pending-requests"></div>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-close btn btn-secondary">Close</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Setup modal event listeners
            modal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => modal.remove());
            });
            
            this.renderFriendRequests(result.requests, modal.querySelector('#pending-requests'));
            
        } catch (error) {
            console.error('Error loading friend requests:', error);
            this.showError('Failed to load friend requests');
        }
    }
    
    renderFriendRequests(requests, container) {
        if (requests.length === 0) {
            container.innerHTML = '<p class="no-results">No pending friend requests</p>';
            return;
        }
        
        requests.forEach(request => {
            const requestDiv = document.createElement('div');
            requestDiv.className = 'friend-request-item';
            requestDiv.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar" style="background-image: url('${request.sender.avatar}'); background-size: cover;">
                        ${request.sender.firstName.charAt(0)}
                    </div>
                    <div class="user-details">
                        <div class="user-name">${request.sender.fullName}</div>
                        <div class="user-email">${request.sender.email}</div>
                        <div class="request-message">${request.message}</div>
                        <div class="request-date">${this.formatTime(request.createdAt)}</div>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="btn btn-sm btn-success accept-btn" data-request-id="${request._id}">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button class="btn btn-sm btn-danger reject-btn" data-request-id="${request._id}">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            `;
            
            // Add event listeners for accept/reject buttons
            const acceptBtn = requestDiv.querySelector('.accept-btn');
            const rejectBtn = requestDiv.querySelector('.reject-btn');
            
            acceptBtn.addEventListener('click', () => this.handleFriendRequest(request._id, 'accept', requestDiv));
            rejectBtn.addEventListener('click', () => this.handleFriendRequest(request._id, 'reject', requestDiv));
            
            container.appendChild(requestDiv);
        });
    }
    
    async handleFriendRequest(requestId, action, requestDiv) {
        try {
            const response = await fetch(`/api/chat/friend-requests/${requestId}/${action}`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(`Friend request ${action}ed successfully!`);
                requestDiv.remove();
                this.loadConversations(); // Refresh conversations
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error(`Error ${action}ing friend request:`, error);
            this.showError(`Failed to ${action} friend request`);
        }
    }
    
    renderSearchResults(users, container, emailInput) {
        container.innerHTML = '';
        
        if (users.length === 0) {
            container.innerHTML = '<p class="no-results">No users found</p>';
            return;
        }
        
        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'search-result-item';
            
            let buttonText = 'Select';
            let buttonClass = 'btn-primary';
            let isDisabled = false;
            
            switch(user.friendshipStatus) {
                case 'friends':
                    buttonText = 'Already Friends';
                    buttonClass = 'btn-secondary';
                    isDisabled = true;
                    break;
                case 'request_sent':
                    buttonText = 'Request Sent';
                    buttonClass = 'btn-secondary';
                    isDisabled = true;
                    break;
                case 'request_received':
                    buttonText = 'Request Received';
                    buttonClass = 'btn-warning';
                    break;
                default:
                    buttonText = 'Select';
                    buttonClass = 'btn-primary';
            }
            
            userDiv.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar" style="background-image: url('${user.avatar}'); background-size: cover;">
                        ${user.firstName.charAt(0)}
                    </div>
                    <div class="user-details">
                        <div class="user-name">${user.fullName}</div>
                        <div class="user-email">${user.email}</div>
                        <div class="user-status">${this.formatFriendshipStatus(user.friendshipStatus)}</div>
                    </div>
                </div>
                <button class="btn btn-sm ${buttonClass}" ${isDisabled ? 'disabled' : ''}>
                    ${buttonText}
                </button>
            `;
            
            if (!isDisabled) {
                const selectBtn = userDiv.querySelector('button');
                selectBtn.addEventListener('click', () => {
                    emailInput.value = user.email;
                });
            }
            
            container.appendChild(userDiv);
        });
    }
    
    formatFriendshipStatus(status) {
        switch(status) {
            case 'friends': return 'Friends';
            case 'request_sent': return 'Friend request sent';
            case 'request_received': return 'Sent you a friend request';
            case 'not_friends': return 'Not connected';
            default: return '';
        }
    }
    
    
    
    // Utility functions
    createConversationId(userId1, userId2) {
        return [userId1, userId2].sort().join('_');
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on chat page
    if (document.querySelector('.chat-container')) {
        window.chatManager = new ChatManager();
    }
});

// Global functions for backward compatibility
function loadConversation(conversationId) {
    // This function is called from the EJS template
    // We'll handle it through the ChatManager instead
    console.log('loadConversation called with:', conversationId);
}

function sendMessage() {
    if (window.chatManager) {
        window.chatManager.sendMessage();
    }
}