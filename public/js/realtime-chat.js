class RealtimeChat {
  constructor() {
    this.ws = null;
    this.currentFriendId = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.typingTimeout = null;
    
    this.connect();
  }

  connect() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ Connected to realtime chat');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Register user
        this.send({
          type: 'register',
          data: { userId: window.currentUserId }
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Message parsing error:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('❌ Disconnected from realtime chat');
        this.isConnected = false;
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

    } catch (error) {
      console.error('❌ Connection error:', error);
      this.attemptReconnect();
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      console.log(`🔄 Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.showConnectionError();
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket not connected, message queued');
      // Could implement message queuing here
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case 'connected':
        this.showConnectionStatus('Connected', 'success');
        break;
        
      case 'new_message':
        this.displayNewMessage(message.data);
        this.playNotificationSound();
        break;
        
      case 'message_sent':
        this.updateMessageStatus(message.data);
        break;
        
      case 'typing_status':
        this.showTypingIndicator(message.data.isTyping);
        break;
    }
  }

  // Send message
  sendMessage(receiverId, content, messageType = 'text') {
    if (!this.isConnected) {
      this.showError('Not connected to chat server');
      return;
    }

    this.send({
      type: 'send_message',
      data: {
        receiverId,
        content,
        messageType
      }
    });

    // Add message to UI immediately (optimistic update)
    this.addMessageToUI({
      content,
      isFromCurrentUser: true,
      timestamp: new Date().toISOString(),
      status: 'sending'
    });
  }

  // Display new message
  displayNewMessage(messageData) {
    if (messageData.senderId === this.currentFriendId || 
        messageData.receiverId === this.currentFriendId) {
      this.addMessageToUI({
        ...messageData,
        isFromCurrentUser: false
      });
    }
    
    // Update conversations list
    this.updateConversationsList(messageData);
  }

  addMessageToUI(messageData) {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;

    const messageElement = this.createMessageElement(messageData);
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  createMessageElement(messageData) {
    const div = document.createElement('div');
    div.className = `message ${messageData.isFromCurrentUser ? 'sent' : 'received'}`;
    
    const statusIcon = messageData.isFromCurrentUser ? 
      this.getStatusIcon(messageData.status) : '';
    
    div.innerHTML = `
      <div class="message-content">${this.escapeHtml(messageData.content)}</div>
      <div class="message-time">
        ${new Date(messageData.timestamp).toLocaleTimeString()}
        ${statusIcon}
      </div>
    `;
    
    return div;
  }

  getStatusIcon(status) {
    switch(status) {
      case 'sending': return '<i class="fas fa-clock message-status pending-status"></i>';
      case 'sent': return '<i class="fas fa-check message-status sent-status"></i>';
      case 'delivered': return '<i class="fas fa-check-double message-status delivered-status"></i>';
      case 'read': return '<i class="fas fa-check-double message-status read-status"></i>';
      default: return '';
    }
  }

  // Typing indicators
  startTyping(receiverId) {
    this.send({
      type: 'typing_start',
      data: { receiverId }
    });
    
    // Auto-stop typing after 3 seconds
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.stopTyping(receiverId);
    }, 3000);
  }

  stopTyping(receiverId) {
    this.send({
      type: 'typing_stop',
      data: { receiverId }
    });
    clearTimeout(this.typingTimeout);
  }

  showTypingIndicator(isTyping) {
    let indicator = document.getElementById('typing-indicator');
    
    if (isTyping) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.className = 'typing-indicator';
        indicator.innerHTML = `
          <div class="typing-dots">
            <span></span><span></span><span></span>
          </div>
          <span class="typing-text">typing...</span>
        `;
        
        const container = document.getElementById('messages-container');
        if (container) {
          container.appendChild(indicator);
          container.scrollTop = container.scrollHeight;
        }
      }
    } else {
      if (indicator) {
        indicator.remove();
      }
    }
  }

  // Utility functions
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  playNotificationSound() {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore autoplay restrictions
    } catch (error) {
      // Ignore sound errors
    }
  }

  showConnectionStatus(message, type) {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `connection-status ${type}`;
      
      setTimeout(() => {
        statusEl.textContent = '';
        statusEl.className = 'connection-status';
      }, 3000);
    }
  }

  showConnectionError() {
    this.showConnectionStatus('Connection lost. Please refresh the page.', 'error');
  }

  showError(message) {
    console.error('Chat error:', message);
    // Could show toast notification here
  }

  updateMessageStatus(messageData) {
    // Update message status in UI
    const messages = document.querySelectorAll('.message.sent');
    // Implementation depends on your UI structure
  }

  updateConversationsList(messageData) {
    // Update the conversations list with new message
    // Implementation depends on your conversations UI
  }

  // Set current conversation
  setCurrentFriend(friendId) {
    this.currentFriendId = friendId;
  }

  // Cleanup
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    clearTimeout(this.typingTimeout);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.currentUserId) {
    window.realtimeChat = new RealtimeChat();
  }
});

// Export for use in other scripts
window.RealtimeChat = RealtimeChat;