const express = require('express');
const WebSocket = require('ws');
const realtimeChatService = require('../services/realtimeChatService');
const router = express.Router();

// WebSocket server for real-time chat
function setupWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws/chat'
  });

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection for chat');
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        
        if (message.type === 'register' && message.data.userId) {
          realtimeChatService.handleConnection(ws, message.data.userId);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
  });

  console.log('✅ WebSocket server setup for real-time chat');
  return wss;
}

// REST API endpoints
router.post('/send', async (req, res) => {
  try {
    const { receiverId, content, messageType } = req.body;
    const senderId = req.session.user.id;

    if (!receiverId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID and content are required'
      });
    }

    const message = await realtimeChatService.sendMessage(
      senderId,
      receiverId,
      content,
      messageType
    );

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get online users count
router.get('/online-count', (req, res) => {
  try {
    const count = realtimeChatService.getOnlineUsersCount();
    res.json({
      success: true,
      onlineCount: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Check if user is online
router.get('/user-status/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const isOnline = realtimeChatService.isUserOnline(userId);
    
    res.json({
      success: true,
      isOnline
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = { router, setupWebSocketServer };