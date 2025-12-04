// Advanced WhatsApp-like Chat System
class AdvancedChatSystem {
    constructor() {
        this.socket = null;
        this.currentFriend = null;
        this.friends = [];
        this.conversations = new Map();
        this.onlineUsers = new Set();
        this.typingUsers = new Map();
        this.messageQueue = [];
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.typingTimeout = null;
        this.lastSeenMap = new Map();
        this.unreadCounts = new Map();
        
        this.init();
    }

    init() {
        this.setupSocket();
        this.setupEventListeners();
        this.loadInitialData();
        this.startHeartbeat();
    }

    setupSocket() {
        // Skip socket setup if in Vercel environment
        if (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('localhost') === false) {
            console.log('🚫 Socket disabled in production environment');
            this.isConnected = false;
            return;
        }
        
        try {
            this.socket = io('/', {
                transports: ['websocket', 'polling'],
                upgrade: true,
                rememberUpgrade: true,
                timeout: 5000
            });
        } catch (error) {
            console.log('🚫 Socket connection failed, using HTTP fallback');
            this.isConnected = false;
            return;
        }

        if (this.socket) {
            this.socket.on('connect', () => {
                console.log('✅ Connected to chat server');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.showConnectionStatus('Connected', 'success');
                
                // Register user
                this.socket.emit('register', {
                    userId: window.currentUserId,
                    userInfo: {
                        name: window.currentUserName,
                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(window.currentUserName || 'User')}&background=6C63FF&color=fff`
                    }
                });

                // Process queued messages
                this.processMessageQueue();
            });
        }

        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from chat server');
            this.isConnected = false;
            this.showConnectionStatus('Disconnected', 'error');
            this.attemptReconnect();
        });

        // Message events
        this.socket.on('new message', (data) => {
            this.handleNewMessage(data);
        });

        this.socket.on('message delivered', (data) => {
            this.updateMessageStatus(data.messageId, 'delivered');
        });

        this.socket.on('message read', (data) => {
            this.updateMessageStatus(data.messageId, 'read');
        });

        // Presence events
        this.socket.on('user online', (data) => {
            this.handleUserOnline(data);
        });

        this.socket.on('user offline', (data) => {
            this.handleUserOffline(data);
        });

        this.socket.on('presence update', (data) => {
            this.updatePresenceStatus(data);
        });

        // Typing events
        this.socket.on('typing', (data) => {
            this.showTypingIndicator(data.from, true);
        });

        this.socket.on('stop typing', (data) => {
            this.showTypingIndicator(data.from, false);
        });

        // Friend request events
        this.socket.on('friend request', (data) => {
            this.handleFriendRequest(data);
        });

        this.socket.on('friend request accepted', (data) => {
            this.handleFriendRequestAccepted(data);
        });

        // Error handling
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showError('Connection error: ' + error.message);
        });
    }

    setupEventListeners() {
        // Message input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Typing indicators
            let typingTimer;
            messageInput.addEventListener('input', () => {
                if (this.currentFriend && this.isConnected) {
                    this.socket.emit('typing', { to: this.currentFriend });
                    
                    clearTimeout(typingTimer);
                    typingTimer = setTimeout(() => {
                        this.socket.emit('stop typing', { to: this.currentFriend });
                    }, 1000);
                }
            });
        }

        // Send button
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Friend list clicks
        document.addEventListener('click', (e) => {
            const friendItem = e.target.closest('.friend-item');
            if (friendItem) {
                const friendId = friendItem.dataset.friendId;
                const friendName = friendItem.querySelector('.friend-info h4').textContent;
                this.selectFriend(friendId, friendName);
            }
        });

        // Window focus/blur for read receipts
        window.addEventListener('focus', () => {
            if (this.currentFriend) {
                this.markMessagesAsRead(this.currentFriend);
            }
        });

        // Page visibility for online status
        document.addEventListener('visibilitychange', () => {
            if (this.socket && this.isConnected) {
                this.socket.emit('presence update', {
                    status: document.hidden ? 'away' : 'online'
                });
            }
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadFriends(),
                this.loadConversations()
            ]);
            
            // Simulate online status if socket not connected
            if (!this.isConnected) {
                setTimeout(() => this.simulateOnlineStatus(), 1000);
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async loadFriends() {
        try {
            const response = await fetch('/api/chat/friends');
            const data = await response.json();
            
            if (data.success) {
                this.friends = data.friends;
                this.renderFriendsList();
            }
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    }

    async loadConversations() {
        try {
            console.log('💬 Loading conversations...');
            const response = await fetch('/api/chat/conversations');
            const data = await response.json();
            
            console.log('📨 Conversations loaded:', data.conversations?.length || 0);
            
            if (data.success && data.conversations) {
                data.conversations.forEach(conv => {
                    this.conversations.set(conv.friendId || conv.friend._id, {
                        friendId: conv.friendId || conv.friend._id,
                        lastMessage: conv.lastMessage?.content || '',
                        lastMessageTime: conv.lastMessageTime || 0,
                        unreadCount: conv.unreadCount || 0
                    });
                    
                    if (conv.unreadCount > 0) {
                        this.unreadCounts.set(conv.friendId || conv.friend._id, conv.unreadCount);
                    }
                });
                this.updateUnreadBadge();
                console.log('✅ Conversations processed successfully');
            } else {
                console.log('❌ No conversations found or error loading');
            }
        } catch (error) {
            console.error('❌ Error loading conversations:', error);
        }
    }

    renderFriendsList() {
        const friendsList = document.getElementById('friendsList');
        if (!friendsList) return;

        if (this.friends.length === 0) {
            friendsList.innerHTML = `
                <div class="no-friends">
                    <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 15px;"></i>
                    <p>No friends yet</p>
                    <button class="add-friend-btn" onclick="openAddFriendModal()">Add Friends</button>
                </div>
            `;
            return;
        }

        // Sort friends by last message time and online status
        const sortedFriends = [...this.friends].sort((a, b) => {
            const aOnline = this.onlineUsers.has(a._id);
            const bOnline = this.onlineUsers.has(b._id);
            
            if (aOnline && !bOnline) return -1;
            if (!aOnline && bOnline) return 1;
            
            const aConv = this.conversations.get(a._id);
            const bConv = this.conversations.get(b._id);
            
            const aTime = aConv?.lastMessageTime || 0;
            const bTime = bConv?.lastMessageTime || 0;
            
            return bTime - aTime;
        });

        const friendsHtml = sortedFriends.map(friend => {
            const isOnline = this.onlineUsers.has(friend._id);
            const lastSeen = this.lastSeenMap.get(friend._id);
            const unreadCount = this.unreadCounts.get(friend._id) || 0;
            const conversation = this.conversations.get(friend._id);
            
            return `
                <div class="friend-item ${this.currentFriend === friend._id ? 'active' : ''}" 
                     data-friend-id="${friend._id}">
                    <div class="friend-avatar-container">
                        <div class="friend-avatar" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600;">
                            ${friend.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div class="online-indicator ${isOnline ? 'online' : 'offline'}"></div>
                    </div>
                    <div class="friend-info">
                        <div class="friend-header">
                            <h4>${friend.fullName}</h4>
                            <span class="last-message-time">${conversation ? this.formatMessageTime(conversation.lastMessageTime) : ''}</span>
                        </div>
                        <div class="friend-status">
                            <p class="status-text">${this.getStatusText(isOnline, lastSeen)}</p>
                            ${unreadCount > 0 ? `<span class="unread-count">${unreadCount > 99 ? '99+' : unreadCount}</span>` : ''}
                        </div>
                        ${conversation?.lastMessage ? `
                            <div class="last-message">
                                ${conversation.lastMessage.length > 30 ? 
                                    conversation.lastMessage.substring(0, 30) + '...' : 
                                    conversation.lastMessage}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        friendsList.innerHTML = friendsHtml;
    }

    selectFriend(friendId, friendName) {
        console.log('👥 Selecting friend:', friendId, friendName);
        
        this.currentFriend = friendId;
        
        // Update UI elements
        const chatTitle = document.getElementById('chatTitle');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const chatOptions = document.getElementById('chatOptions');
        const presenceStatus = document.getElementById('presenceStatus');
        
        if (chatTitle) chatTitle.textContent = friendName;
        if (messageInput) messageInput.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        if (chatOptions) chatOptions.style.display = 'block';
        if (presenceStatus) presenceStatus.style.display = 'flex';
        
        // Update presence status
        this.updatePresenceDisplay(friendId);
        
        // Mark messages as read
        this.markMessagesAsRead(friendId);
        
        // Load messages
        this.loadMessages(friendId);
        
        // Update active state
        document.querySelectorAll('.friend-item').forEach(item => {
            item.classList.remove('active');
        });
        const friendItem = document.querySelector(`[data-friend-id="${friendId}"]`);
        if (friendItem) {
            friendItem.classList.add('active');
        }
        
        console.log('✅ Friend selected successfully');
    }

    async loadMessages(friendId, limit = 50, skip = 0) {
        try {
            console.log('📥 Loading messages for friend:', friendId, 'limit:', limit, 'skip:', skip);
            const response = await fetch(`/api/chat/messages/${friendId}?limit=${limit}&skip=${skip}`);
            const data = await response.json();
            
            console.log('📨 Messages loaded:', data.messages?.length || 0);
            
            if (data.success && data.messages) {
                // Store messages in conversation for this friend
                if (!this.conversations.has(friendId)) {
                    this.conversations.set(friendId, {
                        friendId: friendId,
                        messages: [],
                        lastMessageTime: 0,
                        unreadCount: 0
                    });
                }
                
                const conversation = this.conversations.get(friendId);
                
                if (skip === 0) {
                    // Fresh load - replace all messages
                    conversation.messages = data.messages;
                } else {
                    // Loading older messages - prepend to existing
                    conversation.messages = [...data.messages, ...conversation.messages];
                }
                
                this.renderMessages(conversation.messages);
                
                // Add load more button if there might be more messages
                if (data.messages.length === limit) {
                    this.addLoadMoreButton(friendId, conversation.messages.length);
                }
            } else {
                console.log('❌ No messages found or error loading messages');
                if (skip === 0) {
                    this.renderMessages([]);
                }
            }
        } catch (error) {
            console.error('❌ Error loading messages:', error);
            if (skip === 0) {
                this.renderMessages([]);
            }
        }
    }
    
    addLoadMoreButton(friendId, currentCount) {
        const messagesArea = document.getElementById('messagesArea');
        if (!messagesArea) return;
        
        // Remove existing load more button
        const existingButton = messagesArea.querySelector('.load-more-btn');
        if (existingButton) {
            existingButton.remove();
        }
        
        // Add new load more button at the top
        const loadMoreBtn = document.createElement('div');
        loadMoreBtn.className = 'load-more-btn';
        loadMoreBtn.innerHTML = `
            <button onclick="window.advancedChat.loadOlderMessages('${friendId}', ${currentCount})" 
                    style="width: 100%; padding: 10px; margin: 10px 0; background: #f0f0f0; border: 1px solid #ddd; border-radius: 5px; cursor: pointer;">
                <i class="fas fa-chevron-up"></i> Load older messages
            </button>
        `;
        
        messagesArea.insertBefore(loadMoreBtn, messagesArea.firstChild);
    }
    
    async loadOlderMessages(friendId, skip) {
        console.log('🔄 Loading older messages for:', friendId, 'skip:', skip);
        await this.loadMessages(friendId, 50, skip);
    }

    renderMessages(messages) {
        const messagesArea = document.getElementById('messagesArea');
        if (!messagesArea) {
            console.log('❌ Messages area not found');
            return;
        }

        console.log('🎨 Rendering messages:', messages.length);

        if (!messages || messages.length === 0) {
            messagesArea.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 15px; color: #ccc;"></i>
                    <p style="color: #666;">No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }

        // Sort messages by timestamp (oldest first)
        const sortedMessages = messages.sort((a, b) => 
            new Date(a.createdAt) - new Date(b.createdAt)
        );

        console.log('🔄 Sorted messages:', sortedMessages.length, 'First:', sortedMessages[0]?.createdAt, 'Last:', sortedMessages[sortedMessages.length - 1]?.createdAt);

        const messagesHtml = sortedMessages.map(message => {
            const isSender = message.sender._id === (window.currentUserId || '<%= user._id %>');
            const time = this.formatMessageTime(message.createdAt);
            
            return `
                <div class="message ${isSender ? 'sent' : 'received'}" data-message-id="${message._id}">
                    <div class="message-content">
                        ${this.escapeHtml(message.content)}
                    </div>
                    <div class="message-meta">
                        <span class="message-time">${time}</span>
                        ${isSender ? this.getMessageStatusIcon(message.status || 'sent') : ''}
                    </div>
                </div>
            `;
        }).join('');

        messagesArea.innerHTML = messagesHtml;
        this.scrollToBottom();
        
        console.log('✅ Messages rendered successfully');
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();
        
        if (!content || !this.currentFriend) return;

        const tempId = 'temp_' + Date.now();
        const message = {
            _id: tempId,
            content: content,
            sender: { _id: window.currentUserId, fullName: window.currentUserName },
            receiver: { _id: this.currentFriend },
            createdAt: new Date().toISOString(),
            status: 'sending'
        };

        // Add to UI immediately
        this.addMessageToUI(message, true);
        messageInput.value = '';

        try {
            // Always use HTTP API for message sending
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    receiverId: this.currentFriend,
                    content: content,
                    messageType: 'text'
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Update temp message with real message data
                this.updateMessageStatus(tempId, 'sent');
                console.log('✅ Message sent successfully');
            } else {
                this.updateMessageStatus(tempId, 'failed');
                console.error('❌ Failed to send message:', result.error);
            }
        } catch (error) {
            this.updateMessageStatus(tempId, 'failed');
            console.error('❌ Error sending message:', error);
        }
    }

    addMessageToUI(message, isSender = false) {
        const messagesArea = document.getElementById('messagesArea');
        if (!messagesArea) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSender ? 'sent' : 'received'}`;
        messageDiv.dataset.messageId = message._id;

        const time = this.formatMessageTime(message.createdAt);
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${this.escapeHtml(message.content)}
            </div>
            <div class="message-meta">
                <span class="message-time">${time}</span>
                ${isSender ? this.getMessageStatusIcon(message.status) : ''}
            </div>
        `;

        messagesArea.appendChild(messageDiv);
        this.scrollToBottom();

        // Update conversation
        this.updateConversation(message);
    }

    handleNewMessage(data) {
        const { message, sender } = data;
        
        // Add to UI if it's the current conversation
        if (message.sender._id === this.currentFriend) {
            this.addMessageToUI(message, false);
            
            // Mark as read if window is focused
            if (!document.hidden) {
                this.markMessageAsRead(message._id);
            }
        } else {
            // Update unread count
            const currentUnread = this.unreadCounts.get(message.sender._id) || 0;
            this.unreadCounts.set(message.sender._id, currentUnread + 1);
        }

        // Show notification if not focused on sender
        if (message.sender._id !== this.currentFriend || document.hidden) {
            this.showNotification(sender.fullName, message.content, sender.avatar);
        }

        // Update conversations and friends list
        this.updateConversation(message);
        this.renderFriendsList();
        this.updateUnreadBadge();

        // Play sound
        this.playNotificationSound();
    }

    updateConversation(message) {
        const friendId = message.sender._id === (window.currentUserId || '<%= user._id %>') ? 
            message.receiver._id : message.sender._id;
        
        this.conversations.set(friendId, {
            friendId: friendId,
            lastMessage: message.content,
            lastMessageTime: new Date(message.createdAt).getTime(),
            unreadCount: this.unreadCounts.get(friendId) || 0
        });
    }

    updateMessageStatus(messageId, status) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            const statusIcon = messageEl.querySelector('.message-status');
            if (statusIcon) {
                statusIcon.outerHTML = this.getMessageStatusIcon(status);
            }
        }
    }

    getMessageStatusIcon(status) {
        switch (status) {
            case 'sending':
                return '<i class="fas fa-clock message-status status-sending"></i>';
            case 'sent':
                return '<i class="fas fa-check message-status status-sent"></i>';
            case 'delivered':
                return '<i class="fas fa-check-double message-status status-delivered"></i>';
            case 'read':
                return '<i class="fas fa-check-double message-status status-read"></i>';
            case 'queued':
                return '<i class="fas fa-hourglass-half message-status status-queued"></i>';
            default:
                return '';
        }
    }

    handleUserOnline(data) {
        this.onlineUsers.add(data.userId);
        this.updatePresenceDisplay(data.userId);
        this.renderFriendsList();
    }

    handleUserOffline(data) {
        this.onlineUsers.delete(data.userId);
        if (data.lastSeen) {
            this.lastSeenMap.set(data.userId, data.lastSeen);
        }
        this.updatePresenceDisplay(data.userId);
        this.renderFriendsList();
    }
    
    // Simulate online status for demo purposes
    simulateOnlineStatus() {
        // Mark some friends as online randomly
        this.friends.forEach(friend => {
            if (Math.random() > 0.5) {
                this.onlineUsers.add(friend._id);
            }
        });
        this.renderFriendsList();
    }

    updatePresenceStatus(data) {
        if (data.userId) {
            if (data.status === 'online') {
                this.onlineUsers.add(data.userId);
            } else {
                this.onlineUsers.delete(data.userId);
                if (data.lastSeen) {
                    this.lastSeenMap.set(data.userId, data.lastSeen);
                }
            }
            this.updatePresenceDisplay(data.userId);
            this.renderFriendsList();
        }
    }

    updatePresenceDisplay(userId) {
        if (userId !== this.currentFriend) return;

        const presenceDot = document.getElementById('presenceDot');
        const presenceText = document.getElementById('presenceText');
        
        if (!presenceDot || !presenceText) return;

        const isOnline = this.onlineUsers.has(userId);
        const lastSeen = this.lastSeenMap.get(userId);

        if (isOnline) {
            presenceDot.className = 'presence-dot dot-online';
            presenceText.textContent = 'Online';
        } else {
            presenceDot.className = 'presence-dot dot-offline';
            if (lastSeen) {
                presenceText.textContent = `Last seen ${this.formatLastSeen(lastSeen)}`;
            } else {
                presenceText.textContent = 'Offline';
            }
        }
    }

    showTypingIndicator(userId, isTyping) {
        if (userId !== this.currentFriend) return;

        const typingIndicator = document.getElementById('typingIndicator');
        if (!typingIndicator) return;

        if (isTyping) {
            this.typingUsers.set(userId, true);
            typingIndicator.style.display = 'inline';
            typingIndicator.textContent = 'typing...';
        } else {
            this.typingUsers.delete(userId);
            if (this.typingUsers.size === 0) {
                typingIndicator.style.display = 'none';
            }
        }
    }

    async markMessagesAsRead(friendId) {
        try {
            const response = await fetch(`/api/chat/mark-read/${friendId}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.unreadCounts.delete(friendId);
                this.updateUnreadBadge();
                this.renderFriendsList();
            }
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    async markMessageAsRead(messageId) {
        try {
            await fetch(`/api/chat/messages/${messageId}/read`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }

    updateUnreadBadge() {
        const totalUnread = Array.from(this.unreadCounts.values()).reduce((sum, count) => sum + count, 0);
        const badge = document.getElementById('unreadBadge');
        
        if (badge) {
            if (totalUnread > 0) {
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.socket.emit('send message', message);
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            
            setTimeout(() => {
                console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                this.setupSocket();
            }, delay);
        }
    }

    startHeartbeat() {
        // Check online status periodically via HTTP
        setInterval(async () => {
            try {
                const response = await fetch('/api/chat/online-status');
                const data = await response.json();
                
                if (data.success && data.friends) {
                    // Update online status from server
                    this.onlineUsers.clear();
                    data.friends.forEach(friend => {
                        if (friend.isOnline) {
                            this.onlineUsers.add(friend._id);
                        }
                    });
                    this.renderFriendsList();
                }
            } catch (error) {
                // Fallback: simulate some users online
                if (this.friends.length > 0 && this.onlineUsers.size === 0) {
                    this.simulateOnlineStatus();
                }
            }
        }, 10000); // Check every 10 seconds
    }

    // Utility functions
    getStatusText(isOnline, lastSeen) {
        if (isOnline) return 'Online';
        if (lastSeen) return `Last seen ${this.formatLastSeen(lastSeen)}`;
        return 'Offline';
    }

    formatMessageTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        
        return date.toLocaleDateString();
    }

    formatLastSeen(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollToBottom() {
        const messagesArea = document.getElementById('messagesArea');
        if (messagesArea) {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    }

    showConnectionStatus(message, type) {
        const toast = document.createElement('div');
        toast.className = `connection-toast ${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    showError(message) {
        console.error('Chat error:', message);
        this.showConnectionStatus(message, 'error');
    }

    showNotification(title, body, icon) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: icon,
                badge: '/favicon.ico'
            });
        }
    }

    playNotificationSound() {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            audio.volume = 0.1;
            audio.play().catch(() => {});
        } catch (error) {
            // Ignore sound errors
        }
    }

    handleFriendRequest(data) {
        this.showNotification('Friend Request', `${data.senderName} sent you a friend request`, data.senderAvatar);
    }

    handleFriendRequestAccepted(data) {
        this.showNotification('Friend Request Accepted', `${data.friendName} accepted your friend request`, data.friendAvatar);
        this.loadFriends();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.chat-container')) {
        window.advancedChat = new AdvancedChatSystem();
    }
});

// Export for global access
window.AdvancedChatSystem = AdvancedChatSystem;