const mongoose = require('mongoose');

// User Session Schema for serverless-friendly session storage
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
  
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  
  fullName: {
    type: String,
    required: true
  },

  fitnessId: {
    type: String
  },
  
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  
  personalInfo: {
    type: Object,
    default: {}
  },
  
  lastAccess: {
    type: Date,
    default: Date.now
  },
  
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic cleanup
  }
}, {
  timestamps: true
});

// Index for automatic cleanup of expired sessions
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create or update session
userSessionSchema.statics.createSession = async function(sessionId, user) {
  try {
    // Remove any existing session with this sessionId or userId
    await this.deleteMany({ 
      $or: [
        { sessionId: sessionId },
        { userId: user._id }
      ]
    });
    
    // Create new session
    return await this.create({
      sessionId: sessionId,
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
      fitnessId: user.fitnessId, // Add fitnessId
      onboardingCompleted: user.onboardingCompleted,
      personalInfo: user.personalInfo,
      lastAccess: new Date()
    });
  } catch (error) {
    // If still duplicate key error, try to update existing
    if (error.code === 11000) {
      console.log('Duplicate session detected, updating existing session');
      return await this.findOneAndUpdate(
        { sessionId: sessionId },
        {
          userId: user._id,
          email: user.email,
          fullName: user.fullName,
          fitnessId: user.fitnessId,
          onboardingCompleted: user.onboardingCompleted,
          personalInfo: user.personalInfo,
          lastAccess: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        },
        { new: true, upsert: true }
      );
    }
    throw error;
  }
};

// Static method to get session
userSessionSchema.statics.getSession = async function(sessionId) {
  const session = await this.findOne({ 
    sessionId: sessionId,
    expiresAt: { $gt: new Date() }
  }).populate('userId');
  
  if (session) {
    // Update last access
    session.lastAccess = new Date();
    await session.save();
  }
  
  return session;
};

// Static method to refresh session
userSessionSchema.statics.refreshSession = async function(sessionId) {
  return await this.findOneAndUpdate(
    { sessionId: sessionId },
    { 
      lastAccess: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Extend by 24 hours
    },
    { new: true }
  );
};

// Static method to delete session
userSessionSchema.statics.deleteSession = async function(sessionId) {
  return await this.deleteOne({ sessionId: sessionId });
};

const UserSession = mongoose.model('UserSession', userSessionSchema);

module.exports = UserSession;