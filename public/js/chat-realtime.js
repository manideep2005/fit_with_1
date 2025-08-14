// FCM + Polling Chat System
class ChatRealtime {
  constructor() {
    this.currentFriendId = null;
    this.lastMessageTime = new Date().toISOString();
    this.pollingInterval = null;
    this.isTabActive = true;
    this.fcmToken = null;
    this.typingTimeout = null;
    this.isTyping = false;
    
    this.initFCM();
    this.initPolling();
    this.initVisibilityChange();
    this.initTypingIndicator();
  }

  async initFCM() {
    try {
      // Firebase config
      const firebaseConfig = {
        apiKey: "AIzaSyA2EJ2UwHchs7YxO9f2-94c2uQyTXTUToY",
        authDomain: "fit-with-ai-b005e.firebaseapp.com",
        projectId: "fit-with-ai-b005e",
        storageBucket: "fit-with-ai-b005e.firebasestorage.app",
        messagingSenderId: "281180252594",
        appId: "1:281180252594:web:dc920906daec0c5bd4dcab"
      };

      // Import Firebase modules
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js');
      const { getMessaging, getToken, onMessage } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging.js');

      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);

      // Request permission and get token
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.fcmToken = await getToken(messaging, {
          vapidKey: 'BCIhj5YLSmS_PCD3oO7KVmI3MGGoS34tg9X6AAPS9RWVZH-rM-niTiM1Ryf5WCnsxLEUdps0WDP-KKS_d2bMlbA'
        });

        // Register token with server
        await fetch('/api/notifications/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: this.fcmToken })
        });

        console.log('✅ FCM token registered');
      }

      // Listen for foreground messages
      onMessage(messaging, (payload) => {
        console.log('📱 FCM message received:', payload);
        
        if (payload.notification) {
          this.showNotification(payload.notification.title, payload.notification.body);
        }
        
        // Refresh messages if in chat
        if (this.currentFriendId) {
          this.checkForNewMessages();
        }
      });

    } catch (error) {
      console.error('❌ FCM initialization failed:', error);
    }
  }

  initPolling() {
    // Light polling every 3 seconds when tab is active
    this.pollingInterval = setInterval(() => {
      if (this.isTabActive && this.currentFriendId) {
        this.checkForNewMessages();
      }
    }, 3000);
  }

  initVisibilityChange() {
    document.addEventListener('visibilitychange', () => {
      this.isTabActive = !document.hidden;
      
      if (this.isTabActive && this.currentFriendId) {
        // Check for messages when tab becomes active
        this.checkForNewMessages();
      }
    });
  }

  async checkForNewMessages() {
    if (!this.currentFriendId) return;

    try {
      const response = await fetch(`/api/chat/messages/${this.currentFriendId}/new?since=${this.lastMessageTime}`);
      const data = await response.json();
      
      if (data.success) {
        if (data.messages.length > 0) {
          this.displayNewMessages(data.messages);
          this.lastMessageTime = new Date().toISOString();
        }
        
        // Handle typing status
        if (data.isTyping !== undefined) {
          this.showTypingIndicator(data.isTyping);
        }
      }
    } catch (error) {
      console.error('❌ Polling error:', error);
    }
  }

  displayNewMessages(messages) {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;

    messages.forEach(message => {
      const messageElement = this.createMessageElement(message);
      messagesContainer.appendChild(messageElement);
    });

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  createMessageElement(message) {
    const div = document.createElement('div');
    div.className = `message ${message.isFromCurrentUser ? 'sent' : 'received'}`;
    
    const statusIcon = message.isFromCurrentUser ? this.getStatusIcon(message.status) : '';
    
    div.innerHTML = `
      <div class="message-content">${message.content}</div>
      <div class="message-time">
        ${new Date(message.timestamp).toLocaleTimeString()}
        ${statusIcon}
      </div>
    `;
    return div;
  }

  getStatusIcon(status) {
    switch(status) {
      case 'sent': return '<i class="fas fa-check message-status sent-status"></i>';
      case 'delivered': return '<i class="fas fa-check-double message-status delivered-status"></i>';
      case 'read': return '<i class="fas fa-check-double message-status read-status"></i>';
      default: return '<i class="fas fa-clock message-status pending-status"></i>';
    }
  }

  initTypingIndicator() {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
      messageInput.addEventListener('input', () => {
        this.handleTyping();
      });
      
      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          this.stopTyping();
        }
      });
    }
  }

  handleTyping() {
    if (!this.currentFriendId) return;
    
    if (!this.isTyping) {
      this.isTyping = true;
      this.sendTypingStatus(true);
    }
    
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.stopTyping();
    }, 2000);
  }

  stopTyping() {
    if (this.isTyping) {
      this.isTyping = false;
      this.sendTypingStatus(false);
    }
    clearTimeout(this.typingTimeout);
  }

  async sendTypingStatus(isTyping) {
    try {
      await fetch('/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendId: this.currentFriendId,
          isTyping: isTyping
        })
      });
    } catch (error) {
      console.error('❌ Typing status error:', error);
    }
  }

  showTypingIndicator(show) {
    let typingDiv = document.getElementById('typing-indicator');
    
    if (show) {
      if (!typingDiv) {
        typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = `
          <div class="typing-dots">
            <span></span><span></span><span></span>
          </div>
          <span class="typing-text">typing...</span>
        `;
        
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
          messagesContainer.appendChild(typingDiv);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }
    } else {
      if (typingDiv) {
        typingDiv.remove();
      }
    }
  }

  showNotification(title, body) {
    if (Notification.permission === 'granted' && !this.isTabActive) {
      new Notification(title, {
        body: body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png'
      });
    }
  }

  setCurrentFriend(friendId) {
    this.currentFriendId = friendId;
    this.lastMessageTime = new Date().toISOString();
  }

  destroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.chatRealtime = new ChatRealtime();
});

// Export for use in other scripts
window.ChatRealtime = ChatRealtime;