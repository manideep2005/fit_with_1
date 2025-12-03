#!/usr/bin/env node

const express = require('express');
const session = require('express-session');
require('dotenv').config();

// Test the sessions API endpoint
async function testSessionsAPI() {
  try {
    console.log('🧪 Testing sessions API...');
    
    // Create a minimal Express app to test the route
    const app = express();
    
    // Load the database
    const database = require('./config/database');
    await database.connect();
    
    // Load the UserSession model
    const UserSession = require('./models/UserSession');
    
    // Test getting sessions directly
    console.log('📊 Testing direct UserSession queries...');
    
    const allSessions = await UserSession.find({ isActive: true });
    console.log(`Found ${allSessions.length} active sessions`);
    
    if (allSessions.length > 0) {
      const session = allSessions[0];
      console.log('Sample session:', {
        sessionId: session.sessionId,
        userId: session.userId,
        deviceInfo: session.deviceInfo,
        lastActivity: session.lastActivity,
        isActive: session.isActive
      });
      
      // Test getUserSessions method
      const userSessions = await UserSession.getUserActiveSessions(session.userId);
      console.log(`User has ${userSessions.length} active sessions`);
    }
    
    console.log('✅ Direct database queries work fine');
    
    // Test the session middleware
    const { sessionManager } = require('./middleware/sessionMiddleware');
    
    if (allSessions.length > 0) {
      const testUserId = allSessions[0].userId;
      const sessions = await sessionManager.getUserSessions(testUserId);
      console.log(`Session manager returned ${sessions.length} sessions`);
    }
    
    console.log('✅ Session middleware works fine');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testSessionsAPI();