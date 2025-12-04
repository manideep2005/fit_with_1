const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');

// Update profile information
router.post('/profile', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const { fullName, email } = req.body;

    console.log('Profile update request:', { userEmail, fullName, email });

    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        error: 'Full name and email are required'
      });
    }

    const updatedUser = await UserService.updateProfile(userEmail, {
      fullName: fullName.trim(),
      email: email.trim()
    });

    console.log('Profile updated successfully:', updatedUser);

    // Update session with new data
    req.session.user.fullName = updatedUser.fullName;
    req.session.user.email = updatedUser.email;
    
    // Save session
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to save session'
        });
      }
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          fullName: updatedUser.fullName,
          email: updatedUser.email
        }
      });
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update profile'
    });
  }
});



// Reset all user data
router.post('/reset-data', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    await UserService.resetUserData(userEmail);

    res.json({
      success: true,
      message: 'All data has been reset successfully'
    });

  } catch (error) {
    console.error('Reset data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset data'
    });
  }
});

// Delete account
router.delete('/account', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required to delete account'
      });
    }

    // Verify password before deletion
    const user = await UserService.authenticateUser(userEmail, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    await UserService.deleteAccount(userEmail);

    // Clear session
    req.session.user = null;

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete account'
    });
  }
});

// Get active sessions
router.get('/sessions', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const currentSessionId = req.sessionID;
    
    // Mock session data - in production, you'd get this from your session store
    const sessions = [
      {
        sessionId: currentSessionId,
        isCurrent: true,
        deviceInfo: {
          type: 'desktop',
          browser: 'Chrome',
          os: 'macOS',
          location: 'San Francisco, CA'
        },
        lastActivity: new Date(),
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        sessionId: 'session_mobile_123',
        isCurrent: false,
        deviceInfo: {
          type: 'mobile',
          browser: 'Safari',
          os: 'iOS',
          location: 'San Francisco, CA'
        },
        lastActivity: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        sessionId: 'session_tablet_456',
        isCurrent: false,
        deviceInfo: {
          type: 'tablet',
          browser: 'Chrome',
          os: 'Android',
          location: 'New York, NY'
        },
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      }
    ];
    
    res.json({
      success: true,
      sessions: sessions
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sessions'
    });
  }
});

// Revoke a specific session
router.post('/sessions/revoke', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }
    
    // In production, you'd revoke the session from your session store
    console.log('Revoking session:', sessionId);
    
    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke session'
    });
  }
});

// Revoke all other sessions
router.post('/sessions/revoke-all', async (req, res) => {
  try {
    // In production, you'd revoke all sessions except current from your session store
    const revokedCount = 2; // Mock count
    
    res.json({
      success: true,
      message: 'All other sessions revoked successfully',
      revokedCount: revokedCount
    });
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke sessions'
    });
  }
});

// Logout from all devices
router.post('/sessions/logout-all', async (req, res) => {
  try {
    // In production, you'd revoke all sessions including current
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to logout'
        });
      }
      
      res.json({
        success: true,
        message: 'Logged out from all devices',
        redirectUrl: '/'
      });
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout from all devices'
    });
  }
});

// Get security alerts
router.get('/security/alerts', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    
    // Mock security alerts - in production, you'd get these from your security monitoring system
    const alerts = [
      {
        id: 'alert_1',
        title: 'Password Age Warning',
        description: 'Your password is 3 months old. Consider updating it for better security.',
        severity: 'medium',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        actionUrl: null
      },
      {
        id: 'alert_2',
        title: 'New Login Location',
        description: 'Login detected from New York, NY. If this wasn\'t you, please secure your account.',
        severity: 'low',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        actionUrl: null
      }
    ];
    
    res.json({
      success: true,
      alerts: alerts
    });
  } catch (error) {
    console.error('Get security alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security alerts'
    });
  }
});

module.exports = router;