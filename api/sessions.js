// Session Management API Routes
const express = require('express');
const router = express.Router();
const { sessionManager } = require('../middleware/sessionMiddleware');

// Middleware to ensure user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.session?.user?._id) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  next();
};

// Get user's active sessions
router.get('/', isAuthenticated, async (req, res) => {
  try {
    console.log('📊 Sessions API called by user:', req.session.user?.email);
    console.log('🆔 Session ID:', req.sessionID);
    
    const userId = req.session.user._id;
    if (!userId) {
      console.error('❌ No user ID in session');
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    const sessions = await sessionManager.getUserSessions(userId);
    console.log(`✅ Found ${sessions.length} sessions for user`);
    
    // Format sessions for frontend
    const formattedSessions = sessions.map(session => ({
      sessionId: session.sessionId,
      deviceInfo: {
        type: session.deviceInfo?.deviceType || 'unknown',
        browser: session.deviceInfo?.browser || 'unknown',
        os: session.deviceInfo?.os || 'unknown',
        location: session.deviceInfo?.location || 'unknown'
      },
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
      isCurrent: session.sessionId === req.sessionID
    }));
    
    res.json({
      success: true,
      sessions: formattedSessions,
      currentSessionId: req.sessionID
    });
  } catch (error) {
    console.error('❌ Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sessions: ' + error.message
    });
  }
});

// Revoke specific session
router.post('/revoke', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }
    
    if (sessionId === req.sessionID) {
      return res.status(400).json({
        success: false,
        error: 'Cannot revoke current session'
      });
    }
    
    const revoked = await sessionManager.revokeSession(sessionId, userId);
    
    if (revoked) {
      res.json({
        success: true,
        message: 'Session revoked successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Session not found or already inactive'
      });
    }
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke session'
    });
  }
});

// Revoke all other sessions (keep current)
router.post('/revoke-all', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const currentSessionId = req.sessionID;
    
    const revokedCount = await sessionManager.revokeAllSessions(userId, currentSessionId);
    
    res.json({
      success: true,
      message: `${revokedCount} session(s) revoked successfully`,
      revokedCount
    });
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke sessions'
    });
  }
});

// Force logout from all devices including current
router.post('/logout-all', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    
    const revokedCount = await sessionManager.revokeAllSessions(userId);
    
    // Clear current session
    req.session.user = null;
    res.clearCookie('fit-with-ai-session');
    
    res.json({
      success: true,
      message: `Logged out from all devices. ${revokedCount} session(s) terminated.`,
      revokedCount,
      redirectUrl: '/'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout from all devices'
    });
  }
});

// Check session conflict status
router.get('/conflict-status', isAuthenticated, (req, res) => {
  res.json({
    success: true,
    hasConflict: !!req.sessionConflict,
    conflict: req.sessionConflict || null
  });
});

// Resolve session conflict (force login)
router.post('/resolve-conflict', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const currentSessionId = req.sessionID;
    const { action } = req.body; // 'force_login' or 'cancel'
    
    if (action === 'force_login') {
      // Revoke all other sessions and keep current
      const revokedCount = await sessionManager.revokeAllSessions(userId, currentSessionId);
      
      // Update current session with device info
      await sessionManager.createSession(currentSessionId, req.session.user, req);
      
      res.json({
        success: true,
        message: 'Session conflict resolved. Other sessions terminated.',
        revokedCount
      });
    } else {
      // User chose to cancel, logout current session
      req.session.user = null;
      res.clearCookie('fit-with-ai-session');
      
      res.json({
        success: true,
        message: 'Current session terminated',
        redirectUrl: '/'
      });
    }
  } catch (error) {
    console.error('Resolve conflict error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve session conflict'
    });
  }
});

module.exports = router;