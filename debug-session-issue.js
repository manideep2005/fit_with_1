#!/usr/bin/env node

/**
 * Debug Session Issue
 * Helps identify why sessions are not persisting
 */

require('dotenv').config();

async function debugSessionIssue() {
  console.log('🔍 DEBUGGING SESSION ISSUE\n');
  
  try {
    // Check environment
    console.log('🌍 Environment Check:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   VERCEL: ${process.env.VERCEL ? 'Yes' : 'No'}`);
    console.log(`   SESSION_SECRET: ${process.env.SESSION_SECRET ? 'Set' : 'Not set'}`);
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? 'Set' : 'Not set'}`);
    
    // Check session configuration
    console.log('\n⚙️ Session Configuration Analysis:');
    const fs = require('fs');
    const appContent = fs.readFileSync('./app.js', 'utf8');
    
    // Check session config
    if (appContent.includes('saveUninitialized: false')) {
      console.log('   ✅ saveUninitialized: false (good for serverless)');
    } else {
      console.log('   ❌ saveUninitialized not optimized');
    }
    
    if (appContent.includes('secure: process.env.NODE_ENV')) {
      console.log('   ✅ Conditional secure cookies');
    } else {
      console.log('   ❌ Secure cookies not conditional');
    }
    
    if (appContent.includes('sameSite:')) {
      console.log('   ✅ SameSite policy configured');
    } else {
      console.log('   ❌ SameSite policy missing');
    }
    
    // Check for common issues
    console.log('\n🚨 Common Session Issues Check:');
    
    if (appContent.includes('MemoryStore')) {
      console.log('   ⚠️ Using MemoryStore (not persistent in serverless)');
    }
    
    if (appContent.includes('connect-redis')) {
      console.log('   ✅ Redis store configured');
    }
    
    // Check authentication middleware
    console.log('\n🔐 Authentication Middleware Check:');
    
    if (appContent.includes('req.session.user && req.session.user.onboardingCompleted')) {
      console.log('   ✅ Checking session user and onboarding status');
    }
    
    if (appContent.includes('UserSession.getSession')) {
      console.log('   ✅ Database session fallback implemented');
    }
    
    // Test database connection
    console.log('\n🗄️ Database Connection Test:');
    try {
      const database = require('./config/database');
      await database.connect();
      console.log('   ✅ Database connection successful');
      
      // Test UserSession model
      const UserSession = require('./models/UserSession');
      console.log('   ✅ UserSession model loaded');
      
      // Test creating a session
      const testSession = await UserSession.create({
        sessionId: 'test-debug-session',
        userId: '507f1f77bcf86cd799439011', // dummy ObjectId
        email: 'debug@test.com',
        fullName: 'Debug User',
        onboardingCompleted: true,
        personalInfo: {}
      });
      
      console.log('   ✅ Database session creation works');
      
      // Clean up
      await UserSession.deleteOne({ sessionId: 'test-debug-session' });
      console.log('   ✅ Database session cleanup works');
      
    } catch (dbError) {
      console.log('   ❌ Database issue:', dbError.message);
    }
    
    // Recommendations
    console.log('\n💡 DEBUGGING RECOMMENDATIONS:');
    console.log('1. Check browser developer tools for:');
    console.log('   - Session cookies being set');
    console.log('   - 302 redirects in Network tab');
    console.log('   - Console errors');
    
    console.log('\n2. Check server logs for:');
    console.log('   - "AUTH CHECK STARTED" messages');
    console.log('   - Session creation success/failure');
    console.log('   - Database session creation');
    
    console.log('\n3. Test login flow:');
    console.log('   - Login → Check logs for session creation');
    console.log('   - Navigate to /dashboard → Check auth middleware logs');
    console.log('   - Look for "NO VALID AUTHENTICATION FOUND" message');
    
    console.log('\n4. Possible causes:');
    console.log('   - Session cookies not being sent by browser');
    console.log('   - Session store not persisting data');
    console.log('   - Authentication middleware not finding session');
    console.log('   - Database session not being created/retrieved');
    
    console.log('\n🔧 QUICK FIXES TO TRY:');
    console.log('1. Clear browser cookies and try again');
    console.log('2. Check if login is actually creating sessions');
    console.log('3. Verify session middleware is working');
    console.log('4. Test with a fresh browser/incognito mode');
    
  } catch (error) {
    console.error('\n❌ Debug failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the debug
debugSessionIssue();