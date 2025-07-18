const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');
const { sendFriendRequestEmail, sendFriendRequestAcceptedEmail } = require('../services/emailService');

// Middleware to ensure database connection
const ensureDbConnection = async (req, res, next) => {
  try {
    const database = require('../config/database');
    const status = database.getConnectionStatus();
    if (status.status !== 'connected') {
      console.log('Database not connected, attempting to connect...');
      await database.connect();
      console.log('Database connected successfully');
    }
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({
    success: false,
    error: 'Authentication required'
  });
};

// Get user's conversations
router.get('/conversations', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    console.log(`💬 Getting conversations for user:`, userId);
    
    // Ensure userId is a valid ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }
    
    const conversations = await chatService.getUserConversations(userId);
    console.log('✅ Conversations retrieved:', conversations ? conversations.length : 0);
    
    res.json({
      success: true,
      conversations: conversations || []
    });
    
  } catch (error) {
    console.error('❌ Get conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversations: ' + error.message
    });
  }
});

// Get messages for a specific friend
router.get('/messages/:friendId', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { friendId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    
    console.log(`💬 Getting messages between ${userId} and ${friendId}`);
    
    const messages = await chatService.getConversationMessages(userId, friendId, limit, skip);
    console.log('✅ Messages retrieved:', messages.length);
    
    res.json({
      success: true,
      messages: messages
    });
    
  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
});

// Send message
router.post('/send', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const senderId = req.session.user._id;
    const { receiverId, content, messageType = 'text' } = req.body;
    
    if (!receiverId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Receiver ID and content are required'
      });
    }
    
    console.log(`💬 Sending message from ${senderId} to ${receiverId}`);
    
    const message = await chatService.sendMessage(senderId, receiverId, content, messageType);
    console.log('✅ Message sent successfully:', message._id);
    
    // Get the Socket.IO instance from app.js
    const io = req.app.get('io');
    
    // Emit to receiver via Socket.IO if available
    if (io) {
      io.to(receiverId.toString()).emit('new_message', message);
    }
    
    res.json({
      success: true,
      message: message
    });
    
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send message'
    });
  }
});

// Mark messages as read
router.post('/mark-read', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { friendId } = req.body;
    
    if (!friendId) {
      return res.status(400).json({
        success: false,
        error: 'Friend ID is required'
      });
    }
    
    console.log(`📖 Marking messages as read between ${userId} and ${friendId}`);
    
    await chatService.markMessagesAsRead(userId, friendId, userId);
    
    // Get the Socket.IO instance from app.js
    const io = req.app.get('io');
    
    // Emit read receipt via Socket.IO if available
    if (io) {
      io.to(friendId.toString()).emit('messages_read', {
        conversationId: chatService.createConversationId(userId, friendId),
        readBy: userId,
        readAt: new Date()
      });
    }
    
    res.json({
      success: true,
      message: 'Messages marked as read'
    });
    
  } catch (error) {
    console.error('❌ Mark messages as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read'
    });
  }
});

// Get user's friends
router.get('/friends', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    console.log('👥 Getting friends for user:', userId);

    const friends = await chatService.getUserFriends(userId);
    console.log('✅ Friends retrieved:', friends.length);

    res.json({
      success: true,
      friends: friends
    });

  } catch (error) {
    console.error('❌ Get friends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get friends list'
    });
  }
});

// Send friend request
router.post('/send-friend-request', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const senderId = req.session.user._id;
    const senderName = req.session.user.fullName;
    const { friendEmail, message } = req.body;
    
    if (!friendEmail) {
      return res.status(400).json({
        success: false,
        error: 'Friend email is required'
      });
    }
    
    console.log(`👋 Sending friend request from ${senderId} to ${friendEmail}`);
    
    const result = await chatService.sendFriendRequest(senderId, friendEmail, message || '');
    
    // Send email notification
    try {
      await sendFriendRequestEmail(friendEmail, senderName, message || '');
    } catch (emailError) {
      console.error('Failed to send friend request email:', emailError);
      // Don't fail the request if email fails
    }
    
    res.json({
      success: true,
      message: 'Friend request sent successfully'
    });
    
  } catch (error) {
    console.error('❌ Send friend request error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send friend request'
    });
  }
});

// Get friend requests
router.get('/friend-requests', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    console.log('📥 Getting friend requests for user:', userId);
    
    const requests = await chatService.getPendingFriendRequests(userId);
    console.log('✅ Friend requests retrieved:', requests.length);
    
    res.json({
      success: true,
      requests: requests
    });
    
  } catch (error) {
    console.error('❌ Get friend requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get friend requests'
    });
  }
});

// Accept friend request
router.post('/friend-requests/:requestId/accept', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { requestId } = req.params;
    
    console.log(`✅ Accepting friend request ${requestId} for user ${userId}`);
    
    const result = await chatService.acceptFriendRequest(requestId, userId);
    
    // Send acceptance email
    try {
      await sendFriendRequestAcceptedEmail(result.requesterEmail, req.session.user.fullName);
    } catch (emailError) {
      console.error('Failed to send friend request accepted email:', emailError);
    }
    
    res.json({
      success: true,
      message: 'Friend request accepted'
    });
    
  } catch (error) {
    console.error('❌ Accept friend request error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to accept friend request'
    });
  }
});

// Reject friend request
router.post('/friend-requests/:requestId/reject', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { requestId } = req.params;
    
    console.log(`❌ Rejecting friend request ${requestId} for user ${userId}`);
    
    await chatService.rejectFriendRequest(requestId, userId);
    
    res.json({
      success: true,
      message: 'Friend request rejected'
    });
    
  } catch (error) {
    console.error('❌ Reject friend request error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject friend request'
    });
  }
});

// Search users
router.get('/search-users', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const currentUserId = req.session.user._id;
    const { q: query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }
    
    console.log(`🔍 Searching users with query: ${query}`);
    
    const users = await chatService.searchUsers(currentUserId, query.trim());
    console.log('✅ Users found:', users.length);
    
    res.json({
      success: true,
      users: users
    });
    
  } catch (error) {
    console.error('❌ Search users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    });
  }
});

module.exports = router;