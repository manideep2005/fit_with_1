#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

async function fixSessions() {
  try {
    console.log('🔧 Starting session fix...');
    
    // Connect to database
    const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
    if (!uri) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    
    await mongoose.connect(uri);
    console.log('✅ Connected to database');
    
    // Check UserSession model
    const UserSession = require('./models/UserSession');
    
    // Clean up expired sessions
    const expiredSessions = await UserSession.deleteMany({
      $or: [
        { createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Older than 24 hours
        { isActive: false }
      ]
    });
    
    console.log(`🧹 Cleaned up ${expiredSessions.deletedCount} expired sessions`);
    
    // Check for active sessions
    const activeSessions = await UserSession.find({ isActive: true });
    console.log(`📊 Found ${activeSessions.length} active sessions`);
    
    // List sessions by user
    const sessionsByUser = {};
    activeSessions.forEach(session => {
      const userId = session.userId.toString();
      if (!sessionsByUser[userId]) {
        sessionsByUser[userId] = [];
      }
      sessionsByUser[userId].push(session);
    });
    
    console.log('👥 Sessions by user:');
    for (const [userId, sessions] of Object.entries(sessionsByUser)) {
      console.log(`  User ${userId}: ${sessions.length} sessions`);
    }
    
    console.log('✅ Session fix completed');
    
  } catch (error) {
    console.error('❌ Session fix failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the fix
fixSessions();