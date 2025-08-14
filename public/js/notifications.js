// Firebase Push Notification Manager for Chat Messages
class ChatNotificationManager {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.permission = 'default';
    this.fcmToken = null;
    this.messaging = null;
    this.soundEnabled = true;
    this.unreadCount = 0;
    
    // Firebase config from your .env.firebase
    this.firebaseConfig = {
      apiKey: "AIzaSyA2EJ2UwHchs7YxO9f2-94c2uQyTXTUToY",
      authDomain: "fit-with-ai-b005e.firebaseapp.com",
      projectId: "fit-with-ai-b005e",
      storageBucket: "fit-with-ai-b005e.appspot.com",
      messagingSenderId: "123456789", // You'll need to add this to your Firebase config
      appId: "1:123456789:web:abcdef123456" // You'll need to add this to your Firebase config
    };
    
    this.vapidKey = "BCIhj5YLSmS_PCD3oO7KVmI3MGGoS34tg9X6AAPS9RWVZH-rM-niTiM1Ryf5WCnsxLEUdps0WDP-KKS_d2bMlbA";
    
    this.init();
  }

  async init() {
    if (!this.isSupported) {
      console.warn('Push notifications not supported in this browser');
      this.fallbackToBrowserNotifications();
      return;
    }

    try {
      // Load Firebase SDK dynamically
      await this.loadFirebaseSDK();
      
      // Initialize Firebase
      if (!window.firebase.apps.length) {
        window.firebase.initializeApp(this.firebaseConfig);
      }
      
      this.messaging = window.firebase.messaging();
      
      // Load preferences
      this.loadPreferences();
      
      // Check current permission
      this.permission = Notification.permission;
      
      // Set up message listener for foreground messages
      this.setupForegroundMessageListener();
      
      console.log('✅ Firebase Chat Notifications initialized');
      
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      this.fallbackToBrowserNotifications();
    }
  }

  async loadFirebaseSDK() {
    return new Promise((resolve, reject) => {
      if (window.firebase) {
        resolve();
        return;
      }

      // Load Firebase SDK
      const script1 = document.createElement('script');
      script1.src = 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js';
      
      const script2 = document.createElement('script');
      script2.src = 'https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js';
      
      script1.onload = () => {
        script2.onload = () => resolve();
        script2.onerror = () => reject(new Error('Failed to load Firebase Messaging'));
        document.head.appendChild(script2);
      };
      
      script1.onerror = () => reject(new Error('Failed to load Firebase App'));
      document.head.appendChild(script1);
    });
  }

  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        
        if (this.messaging) {
          // Get FCM token
          const token = await this.messaging.getToken({ vapidKey: this.vapidKey });
          
          if (token) {
            this.fcmToken = token;
            console.log('✅ FCM Token obtained:', token.substring(0, 20) + '...');
            
            // Send token to server
            await this.registerTokenWithServer(token);
            
            // Show test notification
            this.showTestNotification();
            
            return true;
          } else {
            console.log('❌ No registration token available');
            return false;
          }
        } else {
          // Fallback to browser notifications
          this.showTestNotification();
          return true;
        }
      } else {
        console.log('❌ Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async registerTokenWithServer(token) {
    try {
      const response = await fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fcmToken: token })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ FCM token registered with server');
      } else {
        console.error('❌ Failed to register FCM token:', result.error);
      }
    } catch (error) {
      console.error('❌ Error registering FCM token:', error);
    }
  }

  setupForegroundMessageListener() {
    if (!this.messaging) return;
    
    this.messaging.onMessage((payload) => {
      console.log('📱 Foreground message received:', payload);
      
      const { notification, data } = payload;
      
      if (data && data.type === 'chat_message') {
        // Handle chat message notification
        this.handleChatMessageNotification(notification, data);
      } else if (data && data.type === 'friend_request') {
        // Handle friend request notification
        this.handleFriendRequestNotification(notification, data);
      } else {
        // Generic notification
        this.showBrowserNotification(notification.title, notification.body, notification.icon);
      }
    });
  }

  handleChatMessageNotification(notification, data) {
    // Don't show notification if chat window is focused and it's from the current conversation
    if (document.hasFocus() && window.currentFriend === data.senderId) {
      return;
    }
    
    // Update unread count
    this.updateUnreadCount(this.unreadCount + 1);
    
    // Show notification
    this.showBrowserNotification(
      notification.title || `New message from ${data.senderName}`,
      notification.body || data.message,
      data.senderAvatar || '/favicon.ico',
      {
        tag: `chat-${data.senderId}`,
        data: {
          type: 'chat_message',
          senderId: data.senderId,
          senderName: data.senderName
        }
      }
    );
    
    // Play sound
    if (this.soundEnabled) {
      this.playNotificationSound();
    }
  }

  handleFriendRequestNotification(notification, data) {
    this.showBrowserNotification(
      notification.title || 'New Friend Request',
      notification.body || `${data.senderName} sent you a friend request`,
      data.senderAvatar || '/favicon.ico',
      {
        tag: 'friend-request',
        requireInteraction: true,
        data: {
          type: 'friend_request',
          senderId: data.senderId,
          senderName: data.senderName
        }
      }
    );
    
    if (this.soundEnabled) {
      this.playNotificationSound();
    }
  }

  showBrowserNotification(title, body, icon, options = {}) {
    if (this.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(title, {
        body: body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: options.tag || 'default',
        requireInteraction: options.requireInteraction || false,
        silent: !this.soundEnabled,
        data: options.data || {},
        ...options
      });

      // Auto close after 5 seconds (unless requireInteraction is true)
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // Handle notification click
      notification.onclick = (event) => {
        window.focus();
        notification.close();
        
        const data = event.target.data || {};
        
        if (data.type === 'chat_message') {
          // Focus on the chat with the sender
          const focusEvent = new CustomEvent('focusChat', {
            detail: { 
              senderId: data.senderId, 
              senderName: data.senderName 
            }
          });
          window.dispatchEvent(focusEvent);
        } else if (data.type === 'friend_request') {
          // Open friend requests modal
          const friendRequestEvent = new CustomEvent('openFriendRequests');
          window.dispatchEvent(friendRequestEvent);
        }
      };

    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }

  showTestNotification() {
    this.showBrowserNotification(
      'Fit-With-AI Chat',
      'Push notifications are now enabled for chat messages!',
      '/favicon.ico',
      { tag: 'test-notification' }
    );
  }

  playNotificationSound() {
    try {
      const audio = new Audio();
      audio.volume = 0.3;
      
      // Simple notification sound
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
      
      audio.play().catch(e => {
        console.log('Audio play blocked by browser');
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  updateUnreadCount(count) {
    this.unreadCount = Math.max(0, count);
    
    // Update browser tab title
    const baseTitle = 'Fit-With-AI';
    document.title = this.unreadCount > 0 ? `(${this.unreadCount}) ${baseTitle}` : baseTitle;
    
    // Update favicon with notification badge
    this.updateFavicon(this.unreadCount > 0);
    
    // Dispatch event for UI updates
    const event = new CustomEvent('unreadCountChanged', {
      detail: { count: this.unreadCount }
    });
    window.dispatchEvent(event);
  }

  updateFavicon(hasNotification) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      
      // Draw base favicon
      ctx.fillStyle = '#6C63FF';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('F', 16, 22);
      
      // Add notification dot
      if (hasNotification) {
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(24, 8, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add white border to dot
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Update favicon
      let link = document.querySelector('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = canvas.toDataURL();
      
    } catch (error) {
      console.error('Error updating favicon:', error);
    }
  }

  fallbackToBrowserNotifications() {
    console.log('🔄 Using browser notifications as fallback');
    this.messaging = null;
    this.permission = Notification.permission;
  }

  loadPreferences() {
    try {
      const prefs = localStorage.getItem('chatNotificationPrefs');
      if (prefs) {
        const parsed = JSON.parse(prefs);
        this.soundEnabled = parsed.soundEnabled !== false;
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  }

  savePreferences() {
    try {
      const prefs = {
        soundEnabled: this.soundEnabled
      };
      localStorage.setItem('chatNotificationPrefs', JSON.stringify(prefs));
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.savePreferences();
    return this.soundEnabled;
  }

  clearUnreadCount() {
    this.updateUnreadCount(0);
  }

  getStatus() {
    return {
      supported: this.isSupported,
      permission: this.permission,
      soundEnabled: this.soundEnabled,
      fcmToken: this.fcmToken ? this.fcmToken.substring(0, 20) + '...' : null,
      unreadCount: this.unreadCount
    };
  }
}

// Create global instance
window.chatNotifications = new ChatNotificationManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Chat notification system ready');
  
  // Auto-request permission if not already granted
  if (window.chatNotifications.permission === 'default') {
    // Show a subtle prompt to enable notifications
    setTimeout(() => {
      if (confirm('Enable push notifications for chat messages?')) {
        window.chatNotifications.requestPermission();
      }
    }, 2000);
  }
});