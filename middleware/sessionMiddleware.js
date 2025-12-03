const UserSession = require('../models/UserSession');

// Device detection helper
function detectDevice(userAgent) {
  const ua = userAgent.toLowerCase();
  
  let deviceType = 'desktop';
  let browser = 'unknown';
  let os = 'unknown';
  
  // Device type detection
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad/i.test(ua)) {
    deviceType = 'tablet';
  }
  
  // Browser detection
  if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('edge')) browser = 'Edge';
  else if (ua.includes('opera')) browser = 'Opera';
  
  // OS detection
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  
  return { deviceType, browser, os };
}

// Session conflict detection middleware
const checkSessionConflict = async (req, res, next) => {
  try {
    // Skip for non-authenticated routes
    if (!req.session?.user?._id) {
      return next();
    }
    
    const userId = req.session.user._id;
    const currentSessionId = req.sessionID;
    
    // Check for other active sessions
    const existingSession = await UserSession.checkForActiveSession(userId, currentSessionId);
    
    if (existingSession) {
      const deviceInfo = detectDevice(req.headers['user-agent'] || '');
      const existingDeviceInfo = existingSession.deviceInfo || {};
      
      // If there's an active session on a different device, handle conflict
      if (existingDeviceInfo.deviceType !== deviceInfo.deviceType || 
          existingDeviceInfo.browser !== deviceInfo.browser) {
        
        console.log(`⚠️ Session conflict detected for user ${req.session.user.email}`);
        console.log(`Existing: ${existingDeviceInfo.deviceType} ${existingDeviceInfo.browser}`);
        console.log(`Current: ${deviceInfo.deviceType} ${deviceInfo.browser}`);
        
        // Store conflict info in session for frontend handling
        req.sessionConflict = {
          hasConflict: true,
          existingDevice: {
            type: existingDeviceInfo.deviceType || 'unknown',
            browser: existingDeviceInfo.browser || 'unknown',
            lastActivity: existingSession.lastActivity,
            location: existingDeviceInfo.location || 'unknown'
          },
          currentDevice: {
            type: deviceInfo.deviceType,
            browser: deviceInfo.browser,
            ip: req.ip || req.connection.remoteAddress
          }
        };
        
        // For API requests, return conflict immediately
        if (req.path.startsWith('/api/')) {
          return res.status(409).json({
            success: false,
            error: 'session_conflict',
            message: 'Another session is active on a different device',
            conflict: req.sessionConflict
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ Session conflict check error:', error);
    next(); // Continue on error
  }
};

// Session management API middleware
const sessionManager = {
  // Create session with device info
  createSession: async (sessionId, user, req) => {
    try {
      const deviceInfo = {
        userAgent: req.headers['user-agent'] || '',
        ip: req.ip || req.connection.remoteAddress || '',
        ...detectDevice(req.headers['user-agent'] || ''),
        location: req.headers['cf-ipcountry'] || 'unknown' // Cloudflare country header
      };
      
      return await UserSession.createSession(sessionId, user, deviceInfo);
    } catch (error) {
      console.error('❌ Error creating session:', error);
      throw error;
    }
  },
  
  // Update session activity
  updateActivity: async (sessionId) => {
    try {
      const session = await UserSession.findOne({ sessionId, isActive: true });
      if (session) {
        await session.updateActivity();
      }
    } catch (error) {
      console.error('❌ Error updating session activity:', error);
    }
  },
  
  // Get user's active sessions
  getUserSessions: async (userId) => {
    try {
      return await UserSession.getUserActiveSessions(userId);
    } catch (error) {
      console.error('❌ Error getting user sessions:', error);
      return [];
    }
  },
  
  // Revoke specific session
  revokeSession: async (sessionId, userId) => {
    try {
      return await UserSession.revokeSession(sessionId, userId);
    } catch (error) {
      console.error('❌ Error revoking session:', error);
      return false;
    }
  },
  
  // Force logout from all devices
  revokeAllSessions: async (userId, exceptSessionId = null) => {
    try {
      const query = { userId, isActive: true };
      if (exceptSessionId) {
        query.sessionId = { $ne: exceptSessionId };
      }
      
      const result = await UserSession.updateMany(
        query,
        { 
          $set: { 
            isActive: false,
            deactivatedAt: new Date(),
            deactivationReason: 'force_logout'
          }
        }
      );
      
      console.log(`✅ Revoked ${result.modifiedCount} sessions for user`);
      return result.modifiedCount;
    } catch (error) {
      console.error('❌ Error revoking all sessions:', error);
      return 0;
    }
  }
};

module.exports = {
  checkSessionConflict,
  sessionManager,
  detectDevice
};