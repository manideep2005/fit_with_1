const ChatService = require('./chatService');
const WebSocket = require('ws');

class RealtimeChatService {
  constructor() {
    this.connectedUsers = new Map(); // userId -> WebSocket
    this.userTopics = new Map(); // userId -> Set of topics
    this.useKafka = false;
    this.kafkaService = null;
  }

  async initialize() {
    try {
      // Try to initialize Kafka first
      try {
        this.kafkaService = require('./kafkaService');
        await this.kafkaService.subscribeToMessages(
          ['chat-messages', 'typing-status'], 
          this.handleKafkaMessage.bind(this)
        );
        this.useKafka = true;
        console.log('✅ Realtime Chat Service initialized with Kafka');
      } catch (kafkaError) {
        console.log('⚠️  Kafka not available, using WebSocket-only mode');
        this.useKafka = false;
        console.log('✅ Realtime Chat Service initialized with WebSocket fallback');
      }
    } catch (error) {
      console.error('❌ Realtime Chat Service initialization failed:', error);
    }
  }

  // Handle incoming Kafka messages
  async handleKafkaMessage(topic, messageData) {
    try {
      switch (topic) {
        case 'chat-messages':
          await this.broadcastMessage(messageData);
          break;
        case 'typing-status':
          await this.broadcastTypingStatus(messageData);
          break;
      }
    } catch (error) {
      console.error('❌ Kafka message handling error:', error);
    }
  }

  // Send message via Kafka or WebSocket
  async sendMessage(senderId, receiverId, content, messageType = 'text') {
    try {
      // Save to database first
      const message = await ChatService.sendMessage(senderId, receiverId, content, messageType);
      
      const messageData = {
        _id: message._id,
        senderId,
        receiverId,
        content,
        messageType,
        timestamp: new Date().toISOString(),
        conversationId: message.conversationId,
        senderName: message.sender.fullName
      };

      if (this.useKafka && this.kafkaService) {
        // Send to Kafka for real-time delivery
        await this.kafkaService.sendMessage('chat-messages', messageData);
      } else {
        // Use WebSocket fallback
        await this.broadcastMessage(messageData);
      }
      
      return message;
    } catch (error) {
      console.error('❌ Send message error:', error);
      throw error;
    }
  }

  // Broadcast message to connected users
  async broadcastMessage(messageData) {
    const { senderId, receiverId } = messageData;
    
    // Send to receiver
    const receiverWs = this.connectedUsers.get(receiverId);
    if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
      receiverWs.send(JSON.stringify({
        type: 'new_message',
        data: {
          ...messageData,
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
          ...messageData,
          isFromCurrentUser: true
        }
      }));
    }
  }

  // Handle typing status
  async sendTypingStatus(senderId, receiverId, isTyping) {
    try {
      const typingData = {
        senderId,
        receiverId,
        isTyping,
        timestamp: new Date().toISOString()
      };

      if (this.useKafka && this.kafkaService) {
        await this.kafkaService.sendMessage('typing-status', typingData);
      } else {
        await this.broadcastTypingStatus(typingData);
      }
    } catch (error) {
      console.error('❌ Typing status error:', error);
    }
  }

  async broadcastTypingStatus(typingData) {
    const { senderId, receiverId, isTyping } = typingData;
    
    const receiverWs = this.connectedUsers.get(receiverId);
    if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
      receiverWs.send(JSON.stringify({
        type: 'typing_status',
        data: {
          senderId,
          isTyping
        }
      }));
    }
  }

  // WebSocket connection management
  handleConnection(ws, userId) {
    this.connectedUsers.set(userId, ws);
    console.log(`✅ User ${userId} connected to realtime chat`);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        await this.handleWebSocketMessage(userId, message);
      } catch (error) {
        console.error('❌ WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      this.connectedUsers.delete(userId);
      console.log(`❌ User ${userId} disconnected from realtime chat`);
    });

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      data: { userId, timestamp: new Date().toISOString() }
    }));
  }

  async handleWebSocketMessage(userId, message) {
    switch (message.type) {
      case 'send_message':
        await this.sendMessage(
          userId,
          message.data.receiverId,
          message.data.content,
          message.data.messageType
        );
        break;
      
      case 'typing_start':
        await this.sendTypingStatus(userId, message.data.receiverId, true);
        break;
      
      case 'typing_stop':
        await this.sendTypingStatus(userId, message.data.receiverId, false);
        break;
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
}

module.exports = new RealtimeChatService();