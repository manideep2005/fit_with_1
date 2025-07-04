
console.log('[ChatManagerV2] Script loaded');

class ChatManagerV2 {
    constructor() {
        console.log('[ChatManagerV2] Constructor called');
        this.socket = io();
        this.messageInput = document.getElementById('message-input');
        this.messagesContainer = document.getElementById('messages-container');
        this.conversationsList = document.querySelector('.conversation-list');
        this.chatMainArea = document.querySelector('.chat-main-area');
        this.noConversationArea = document.querySelector('.no-conversation');
        this.init();
    }

    init() {
        console.log('[ChatManagerV2] Initializing...');
        this.setupSocket();
        this.setupEventListeners();
        this.loadConversations();
    }

    setupSocket() {
        console.log('[ChatManagerV2] Setting up Socket.IO...');
        this.socket.on('connect', () => {
            console.log('[ChatManagerV2] Connected to Socket.IO server');
            this.socket.emit('join', window.currentUserId);
        });

        this.socket.on('new message', (message) => {
            console.log('[ChatManagerV2] Received new message:', message);
            this.addMessageToUI(message, false);
        });
    }

    setupEventListeners() {
        console.log('[ChatManagerV2] Setting up event listeners...');
        if (this.conversationsList) {
            this.conversationsList.addEventListener('click', (e) => {
                const conversationItem = e.target.closest('.conversation-item');
                if (conversationItem) {
                    console.log('[ChatManagerV2] Conversation item clicked');
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
        } else {
            console.error('[ChatManagerV2] Conversations list not found!');
        }

        const sendBtn = document.querySelector('.send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.sendMessage();
            });
        } else {
            console.error('[ChatManagerV2] Send button not found!');
        }

        if (this.messageInput) {
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        } else {
            console.error('[ChatManagerV2] Message input not found!');
        }
    }

    async loadConversations() {
        console.log('[ChatManagerV2] Loading conversations...');
        try {
            const response = await fetch('/api/chat/conversations');
            const result = await response.json();
            if (result.success) {
                console.log(`[ChatManagerV2] ${result.conversations.length} conversations loaded`);
                this.renderConversations(result.conversations);
            } else {
                console.error('[ChatManagerV2] Failed to load conversations:', result.error);
            }
        } catch (error) {
            console.error('[ChatManagerV2] Error loading conversations:', error);
        }
    }

    renderConversations(conversations) {
        console.log('[ChatManagerV2] Rendering conversations...');
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
        console.log(`[ChatManagerV2] Loading conversation with friend: ${friendId}`);
        try {
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`[data-friend-id="${friendId}"]`)?.classList.add('active');

            this.currentFriendId = friendId;

            this.updateChatHeader(friendInfo);

            const response = await fetch(`/api/chat/messages/${friendId}`);
            const result = await response.json();

            if (result.success) {
                console.log(`[ChatManagerV2] ${result.messages.length} messages loaded`);
                this.renderMessages(result.messages);
                this.showChatArea();
            } else {
                console.error('[ChatManagerV2] Failed to load messages:', result.error);
            }
        } catch (error) {
            console.error('[ChatManagerV2] Error loading conversation:', error);
        }
    }

    updateChatHeader(friendInfo) {
        console.log('[ChatManagerV2] Updating chat header');
        const chatHeader = document.querySelector('.chat-header');
        if (!chatHeader) return;

        chatHeader.innerHTML = `
            <div class="chat-user">
                <div class="chat-avatar" style="background-image: url('${friendInfo.avatar}'); background-size: cover;">
                    ${friendInfo.avatar.includes('ui-avatars') ? friendInfo.fullName.charAt(0) : ''}
                </div>
                <div>
                    <div class="chat-name">${friendInfo.fullName}</div>
                    <div class="chat-status">Online</div>
                </div>
            </div>
            <div class="chat-actions">
                <div class="chat-action-btn">
                    <i class="fas fa-phone"></i>
                </div>
                <div class="chat-action-btn">
                    <i class="fas fa-video"></i>
                </div>
                <div class="chat-action-btn">
                    <i class="fas fa-ellipsis-v"></i>
                </div>
            </div>
        `;
    }

    renderMessages(messages) {
        console.log('[ChatManagerV2] Rendering messages...');
        if (!this.messagesContainer) return;

        this.messagesContainer.innerHTML = '';

        messages.forEach(msg => {
            this.addMessageToUI(msg, msg.sender._id === window.currentUserId);
        });

        this.scrollToBottom();
    }

    sendMessage() {
        console.log('[ChatManagerV2] Sending message...');
        const content = this.messageInput.value.trim();
        if (!content) return;

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
        console.log('[ChatManagerV2] Adding message to UI');
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
        console.log('[ChatManagerV2] Showing chat area');
        if (this.noConversationArea) this.noConversationArea.style.display = 'none';
        if (this.chatMainArea) this.chatMainArea.style.display = 'flex';
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
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[ChatManagerV2] DOMContentLoaded event fired');
    if (document.querySelector('.chat-container')) {
        console.log('[ChatManagerV2] Chat container found, initializing ChatManagerV2');
        window.chatManager = new ChatManagerV2();
    }
});
