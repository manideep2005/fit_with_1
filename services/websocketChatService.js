const WebSocket = require('ws');
const ChatService = require('./chatService');

class WebSocketChatService {
  constructor() {
    this.connectedUsers = new Map(); // userId -> WebSocket
    this.wss = null;
  }

  initialize(server) {
    try {
      // Create WebSocket server
      this.wss = new WebSocket.Server({ 
        server,
        path: '/ws/chat'
      });

      this.wss.on('connection', (ws, req) => {
        console.log('🔌 New WebSocket connection for chat');
        
        ws.on('message', async (data) => {
          try {
            const message = JSON.parse(data);
            await this.handleMessage(ws, message);
          } catch (error) {
            console.error('❌ WebSocket message error:', error);
          }
        });

        ws.on('close', () => {
          // Remove user from connected users
          for (const [userId, userWs] of this.connectedUsers.entries()) {
            if (userWs === ws) {
              this.connectedUsers.delete(userId);
              console.log(`❌ User ${userId} disconnected from chat`);
              break;
            }
          }
        });

        ws.on('error', (error) => {
          console.error('❌ WebSocket error:', error);
        });
      });

      console.log('✅ WebSocket Chat Service initialized');
    } catch (error) {
      console.error('❌ WebSocket Chat Service initialization failed:', error);
    }
  }

  async handleMessage(ws, message) {
    try {
      switch (message.type) {
        case 'register':
          this.handleUserRegistration(ws, message.data.userId);
          break;
          
        case 'send_message':
          await this.handleSendMessage(message.data.userId, message.data);
          break;
          
        case 'typing_start':
          this.handleTypingStatus(message.data.userId, message.data.receiverId, true);
          break;
          
        case 'typing_stop':
          this.handleTypingStatus(message.data.userId, message.data.receiverId, false);
          break;
      }
    } catch (error) {
      console.error('❌ Message handling error:', error);
    }
  }

  handleUserRegistration(ws, userId) {
    this.connectedUsers.set(userId, ws);
    console.log(`✅ User ${userId} registered for real-time chat`);
    
    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      data: { userId, timestamp: new Date().toISOString() }
    }));
  }

  async handleSendMessage(senderId, messageData) {
    try {
      // Save message to database
      const message = await ChatService.sendMessage(
        senderId,
        messageData.receiverId,
        messageData.content,
        messageData.messageType || 'text'
      );

      // Send to receiver in real-time
      const receiverWs = this.connectedUsers.get(messageData.receiverId);
      if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
        receiverWs.send(JSON.stringify({
          type: 'new_message',
          data: {
            _id: message._id,
            senderId,
            receiverId: messageData.receiverId,
            content: messageData.content,
            messageType: messageData.messageType || 'text',
            timestamp: new Date().toISOString(),
            senderName: message.sender.fullName,
            isFromCurrentUser: false
          }
        }));
      }

      // Send confirmation to sender
      const senderWs = this.connectedUsers.get(senderId);
      if (senderWs && senderWs.readyState === WebSocket.OPEN) {
        senderWs.send(JSON.stringify({
          type: 'message_sent',
          data: {
            _id: message._id,
            senderId,
            receiverId: messageData.receiverId,
            content: messageData.content,
            messageType: messageData.messageType || 'text',
            timestamp: new Date().toISOString(),
            senderName: message.sender.fullName,
            isFromCurrentUser: true,
            status: 'sent'
          }
        }));
      }

      return message;
    } catch (error) {
      console.error('❌ Send message error:', error);
      throw error;
    }
  }

  handleTypingStatus(senderId, receiverId, isTyping) {
    const receiverWs = this.connectedUsers.get(receiverId);
    if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
      receiverWs.send(JSON.stringify({
        type: 'typing_status',
        data: {
          senderId,
          isTyping,
          timestamp: new Date().toISOString()
        }
      }));
    }
  }

  // Get online users count
  getOnlineUsersCount() {
    return this.connectedUsers.size;
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  // Broadcast message to all connected users (for system messages)
  broadcast(message) {
    const messageStr = JSON.stringify(message);
    this.connectedUsers.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }
}

module.exports = new WebSocketChatService();