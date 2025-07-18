// Chat API Routes - Enhanced with Audio/Video Call Support

// Get user's conversations
app.get('/api/chat/conversations', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    console.log(`💬 Getting conversations for user:`, userId);
    
    const conversations = await chatService.getUserConversations(userId);
    console.log('✅ Conversations retrieved:', conversations.length);
    
    res.json({
      success: true,
      conversations: conversations
    });
    
  } catch (error) {
    console.error('❌ Get conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversations'
    });
  }
});

// Get messages for a specific friend
app.get('/api/chat/messages/:friendId', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { friendId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    console.log(`💬 Getting messages between ${userId} and ${friendId}`);
    
    const messages = await chatService.getMessages(userId, friendId, parseInt(page), parseInt(limit));
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
app.post('/api/chat/send', isAuthenticated, ensureDbConnection, async (req, res) => {
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
    console.log('✅ Message sent successfully');
    
    // Emit to receiver via Socket.IO if available
    if (io) {
      io.to(receiverId).emit('new_message', message);
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
app.post('/api/chat/mark-read', isAuthenticated, ensureDbConnection, async (req, res) => {
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
    
    await chatService.markMessagesAsRead(userId, friendId);
    
    // Emit read receipt via Socket.IO if available
    if (io) {
      io.to(friendId).emit('messages_read', {
        conversationId: userId,
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

// Initiate video call
app.post('/api/chat/video-call', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const callerId = req.session.user._id;
    const callerName = req.session.user.fullName;
    const { receiverId } = req.body;
    
    if (!receiverId) {
      return res.status(400).json({
        success: false,
        error: 'Receiver ID is required'
      });
    }
    
    console.log(`📹 Initiating video call from ${callerId} to ${receiverId}`);
    
    // Check if users are friends
    const areFriends = await chatService.checkFriendship(callerId, receiverId);
    if (!areFriends) {
      return res.status(403).json({
        success: false,
        error: 'You can only call friends'
      });
    }
    
    // Generate call ID
    const callId = require('crypto').randomBytes(16).toString('hex');
    
    // Emit call invitation via Socket.IO if available
    if (io) {
      io.to(receiverId).emit('incoming_video_call', {
        callId: callId,
        callerId: callerId,
        callerName: callerName,
        type: 'video'
      });
    }
    
    res.json({
      success: true,
      callId: callId,
      message: 'Video call initiated'
    });
    
  } catch (error) {
    console.error('❌ Video call initiation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate video call'
    });
  }
});

// Initiate audio call
app.post('/api/chat/audio-call', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const callerId = req.session.user._id;
    const callerName = req.session.user.fullName;
    const { receiverId } = req.body;
    
    if (!receiverId) {
      return res.status(400).json({
        success: false,
        error: 'Receiver ID is required'
      });
    }
    
    console.log(`📞 Initiating audio call from ${callerId} to ${receiverId}`);
    
    // Check if users are friends
    const areFriends = await chatService.checkFriendship(callerId, receiverId);
    if (!areFriends) {
      return res.status(403).json({
        success: false,
        error: 'You can only call friends'
      });
    }
    
    // Generate call ID
    const callId = require('crypto').randomBytes(16).toString('hex');
    
    // Emit call invitation via Socket.IO if available
    if (io) {
      io.to(receiverId).emit('incoming_audio_call', {
        callId: callId,
        callerId: callerId,
        callerName: callerName,
        type: 'audio'
      });
    }
    
    res.json({
      success: true,
      callId: callId,
      message: 'Audio call initiated'
    });
    
  } catch (error) {
    console.error('❌ Audio call initiation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate audio call'
    });
  }
});

// Get online friends
app.get('/api/chat/online-friends', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    console.log(`🟢 Getting online friends for user:`, userId);
    
    const onlineFriends = await chatService.getOnlineFriends(userId);
    console.log('✅ Online friends retrieved:', onlineFriends.length);
    
    res.json({
      success: true,
      onlineFriends: onlineFriends
    });
    
  } catch (error) {
    console.error('❌ Get online friends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get online friends'
    });
  }
});

// Update user online status
app.post('/api/chat/update-status', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { status } = req.body; // 'online' or 'offline'
    
    console.log(`📊 Updating status for user ${userId} to ${status}`);
    
    await chatService.updateUserStatus(userId, status);
    
    // Emit status update via Socket.IO if available
    if (io) {
      const friends = await chatService.getUserFriends(userId);
      friends.forEach(friend => {
        if (status === 'online') {
          io.to(friend._id.toString()).emit('friend_online', { userId: userId });
        } else {
          io.to(friend._id.toString()).emit('friend_offline', { 
            userId: userId, 
            lastSeen: new Date() 
          });
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Status updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Update status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status'
    });
  }
});

// Get user's friends
app.get('/api/chat/friends', isAuthenticated, ensureDbConnection, async (req, res) => {
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
app.post('/api/chat/send-friend-request', isAuthenticated, ensureDbConnection, async (req, res) => {
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
app.get('/api/chat/friend-requests', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    console.log('📥 Getting friend requests for user:', userId);
    
    const requests = await chatService.getFriendRequests(userId);
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
app.post('/api/chat/friend-requests/:requestId/accept', isAuthenticated, ensureDbConnection, async (req, res) => {
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
app.post('/api/chat/friend-requests/:requestId/reject', isAuthenticated, ensureDbConnection, async (req, res) => {
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
app.get('/api/chat/search-users', isAuthenticated, ensureDbConnection, async (req, res) => {
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
    
    const users = await chatService.searchUsers(query.trim(), currentUserId);
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

// Remove friend
app.post('/api/chat/remove-friend', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { friendId } = req.body;
    
    if (!friendId) {
      return res.status(400).json({
        success: false,
        error: 'Friend ID is required'
      });
    }
    
    console.log(`🗑️ Removing friend ${friendId} for user ${userId}`);
    
    await chatService.removeFriend(userId, friendId);
    
    res.json({
      success: true,
      message: 'Friend removed successfully'
    });
    
  } catch (error) {
    console.error('❌ Remove friend error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove friend'
    });
  }
});

// Block friend
app.post('/api/chat/block-friend', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { friendId } = req.body;
    
    if (!friendId) {
      return res.status(400).json({
        success: false,
        error: 'Friend ID is required'
      });
    }
    
    console.log(`🚫 Blocking friend ${friendId} for user ${userId}`);
    
    await chatService.blockFriend(userId, friendId);
    
    res.json({
      success: true,
      message: 'Friend blocked successfully'
    });
    
  } catch (error) {
    console.error('❌ Block friend error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to block friend'
    });
  }
});

// Clear chat history
app.post('/api/chat/clear-chat', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { friendId } = req.body;
    
    if (!friendId) {
      return res.status(400).json({
        success: false,
        error: 'Friend ID is required'
      });
    }
    
    console.log(`🧹 Clearing chat between ${userId} and ${friendId}`);
    
    await chatService.clearChatHistory(userId, friendId);
    
    res.json({
      success: true,
      message: 'Chat history cleared successfully'
    });
    
  } catch (error) {
    console.error('❌ Clear chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear chat history'
    });
  }
});

// Export chat history
app.get('/api/chat/export/:friendId', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { friendId } = req.params;
    
    console.log(`📤 Exporting chat between ${userId} and ${friendId}`);
    
    const chatData = await chatService.exportChatHistory(userId, friendId);
    
    res.json({
      success: true,
      chatData: chatData.content,
      friendName: chatData.friendName
    });
    
  } catch (error) {
    console.error('❌ Export chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export chat history'
    });
  }
});