const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceInfo: {
    userAgent: String,
    ip: String,
    deviceType: String, // 'mobile', 'desktop', 'tablet'
    browser: String,
    os: String,
    location: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // 24 hours
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
userSessionSchema.index({ userId: 1, isActive: 1 });
userSessionSchema.index({ sessionId: 1, isActive: 1 });

// Static methods for session management
userSessionSchema.statics.createSession = async function(sessionId, user, deviceInfo = {}) {
  try {
    // First, deactivate all existing sessions for this user
    await this.updateMany(
      { userId: user._id, isActive: true },
      { 
        $set: { 
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: 'new_session_created'
        }
      }
    );

    // Delete any existing session with same sessionId
    await this.deleteOne({ sessionId });

    // Create new session
    const session = new this({
      sessionId,
      userId: user._id,
      deviceInfo,
      isActive: true,
      onboardingCompleted: user.onboardingCompleted || false,
      lastActivity: new Date()
    });

    await session.save();
    
    // Populate user data
    await session.populate('userId');
    
    console.log(`✅ New session created for user ${user.email}, previous sessions deactivated`);
    return session;
  } catch (error) {
    console.error('❌ Error creating session:', error);
    throw error;
  }
};

userSessionSchema.statics.getSession = async function(sessionId) {
  try {
    const session = await this.findOne({ 
      sessionId, 
      isActive: true 
    }).populate('userId');
    
    if (session) {
      // Update last activity
      session.lastActivity = new Date();
      await session.save();
    }
    
    return session;
  } catch (error) {
    console.error('❌ Error getting session:', error);
    return null;
  }
};

userSessionSchema.statics.deleteSession = async function(sessionId) {
  try {
    await this.updateOne(
      { sessionId },
      { 
        $set: { 
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: 'user_logout'
        }
      }
    );
    console.log(`✅ Session ${sessionId} deactivated`);
  } catch (error) {
    console.error('❌ Error deleting session:', error);
  }
};

userSessionSchema.statics.getUserActiveSessions = async function(userId) {
  try {
    return await this.find({ 
      userId, 
      isActive: true 
    }).sort({ lastActivity: -1 });
  } catch (error) {
    console.error('❌ Error getting user sessions:', error);
    return [];
  }
};

userSessionSchema.statics.revokeSession = async function(sessionId, userId) {
  try {
    const result = await this.updateOne(
      { sessionId, userId, isActive: true },
      { 
        $set: { 
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: 'user_revoked'
        }
      }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('❌ Error revoking session:', error);
    return false;
  }
};

userSessionSchema.statics.checkForActiveSession = async function(userId, currentSessionId) {
  try {
    const activeSessions = await this.find({ 
      userId, 
      isActive: true,
      sessionId: { $ne: currentSessionId }
    }).populate('userId');
    
    return activeSessions.length > 0 ? activeSessions[0] : null;
  } catch (error) {
    console.error('❌ Error checking active sessions:', error);
    return null;
  }
};

// Instance methods
userSessionSchema.methods.updateActivity = async function() {
  this.lastActivity = new Date();
  await this.save();
};

userSessionSchema.methods.deactivate = async function(reason = 'manual') {
  this.isActive = false;
  this.deactivatedAt = new Date();
  this.deactivationReason = reason;
  await this.save();
};

module.exports = mongoose.model('UserSession', userSessionSchema);