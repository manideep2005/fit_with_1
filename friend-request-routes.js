// Friend Request API Routes - Add these to your app.js

// Send friend request
app.post('/api/friend-requests/send', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    console.log('POST /api/friend-requests/send called');
    console.log('Request body:', req.body);
    
    const senderId = req.session.user._id;
    const { friendEmail, message = '' } = req.body;
    
    if (!friendEmail || friendEmail.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Friend email is required'
      });
    }
    
    console.log('Sending friend request...');
    const friendRequest = await chatService.sendFriendRequest(senderId, friendEmail, message);
    
    console.log('Friend request sent successfully');
    res.json({
      success: true,
      message: 'Friend request sent successfully',
      friendRequest: friendRequest
    });
    
  } catch (error) {
    console.error('Send friend request API error:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
      user: req.session.user?.email
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send friend request'
    });
  }
});

// Get pending friend requests (received)
app.get('/api/friend-requests/pending', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    console.log('GET /api/friend-requests/pending called');
    
    const userId = req.session.user._id;
    const pendingRequests = await chatService.getPendingFriendRequests(userId);
    
    res.json({
      success: true,
      requests: pendingRequests,
      count: pendingRequests.length
    });
    
  } catch (error) {
    console.error('Get pending friend requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending friend requests'
    });
  }
});

// Get sent friend requests
app.get('/api/friend-requests/sent', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    console.log('GET /api/friend-requests/sent called');
    
    const userId = req.session.user._id;
    const sentRequests = await chatService.getSentFriendRequests(userId);
    
    res.json({
      success: true,
      requests: sentRequests,
      count: sentRequests.length
    });
    
  } catch (error) {
    console.error('Get sent friend requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sent friend requests'
    });
  }
});

// Accept friend request
app.post('/api/friend-requests/:requestId/accept', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    console.log('POST /api/friend-requests/:requestId/accept called');
    
    const userId = req.session.user._id;
    const { requestId } = req.params;
    
    const acceptedRequest = await chatService.acceptFriendRequest(requestId, userId);
    
    res.json({
      success: true,
      message: 'Friend request accepted successfully',
      friendRequest: acceptedRequest
    });
    
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to accept friend request'
    });
  }
});

// Reject friend request
app.post('/api/friend-requests/:requestId/reject', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    console.log('POST /api/friend-requests/:requestId/reject called');
    
    const userId = req.session.user._id;
    const { requestId } = req.params;
    
    const rejectedRequest = await chatService.rejectFriendRequest(requestId, userId);
    
    res.json({
      success: true,
      message: 'Friend request rejected successfully',
      friendRequest: rejectedRequest
    });
    
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject friend request'
    });
  }
});

// Get friendship status between users
app.get('/api/friendship-status/:userId', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    console.log('GET /api/friendship-status/:userId called');
    
    const currentUserId = req.session.user._id;
    const { userId } = req.params;
    
    const status = await chatService.getFriendshipStatus(currentUserId, userId);
    
    res.json({
      success: true,
      status: status
    });
    
  } catch (error) {
    console.error('Get friendship status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get friendship status'
    });
  }
});