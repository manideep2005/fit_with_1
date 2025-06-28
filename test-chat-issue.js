#!/usr/bin/env node

/**
 * Chat Issue Diagnostic Test
 * Tests what's not working with the chat functionality
 */

require('dotenv').config();

async function testChatIssue() {
  console.log('💬 CHAT ISSUE DIAGNOSTIC TEST\n');
  
  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    const database = require('./config/database');
    await database.connect();
    console.log('✅ Database connected successfully\n');
    
    // Test 1: Load ChatService
    console.log('🧪 Test 1: Loading ChatService');
    try {
      const chatService = require('./services/chatService');
      console.log('✅ ChatService loaded successfully');
    } catch (error) {
      console.log('❌ ChatService loading failed:', error.message);
      return;
    }
    
    // Test 2: Check User model
    console.log('\n🧪 Test 2: Checking User model');
    try {
      const User = require('./models/User');
      const userCount = await User.countDocuments();
      console.log(`✅ User model works - ${userCount} users in database`);
    } catch (error) {
      console.log('❌ User model issue:', error.message);
    }
    
    // Test 3: Check Message model
    console.log('\n🧪 Test 3: Checking Message model');
    try {
      const Message = require('./models/Message');
      const messageCount = await Message.countDocuments();
      console.log(`✅ Message model works - ${messageCount} messages in database`);
    } catch (error) {
      console.log('❌ Message model issue:', error.message);
    }
    
    // Test 4: Check if users have friends
    console.log('\n🧪 Test 4: Checking user friendships');
    try {
      const User = require('./models/User');
      const usersWithFriends = await User.find({ friends: { $exists: true, $not: { $size: 0 } } });
      console.log(`✅ Found ${usersWithFriends.length} users with friends`);
      
      if (usersWithFriends.length > 0) {
        const user = usersWithFriends[0];
        console.log(`   📧 User: ${user.email}`);
        console.log(`   👥 Friends: ${user.friends.length}`);
      }
    } catch (error) {
      console.log('❌ Friendship check failed:', error.message);
    }
    
    // Test 5: Test chat route syntax
    console.log('\n🧪 Test 5: Testing chat route syntax');
    try {
      const app = require('./app.js');
      console.log('✅ App loaded successfully (chat routes should be working)');
    } catch (error) {
      console.log('❌ App loading failed:', error.message);
      console.log('   This indicates syntax errors in chat routes');
    }
    
    // Test 6: Check chat view file
    console.log('\n🧪 Test 6: Checking chat view file');
    const fs = require('fs');
    const path = require('path');
    
    const chatViewPath = path.join(__dirname, 'views', 'chat-simple.ejs');
    if (fs.existsSync(chatViewPath)) {
      console.log('✅ Chat view file exists: chat-simple.ejs');
    } else {
      console.log('❌ Chat view file missing: chat-simple.ejs');
      
      // Check for other chat view files
      const viewsDir = path.join(__dirname, 'views');
      const viewFiles = fs.readdirSync(viewsDir).filter(f => f.includes('chat'));
      console.log('   Available chat views:', viewFiles);
    }
    
    // Summary
    console.log('\n📋 CHAT DIAGNOSTIC SUMMARY:');
    console.log('1. Check if users can access /chat page');
    console.log('2. Check if users have friends to chat with');
    console.log('3. Check if message sending API works');
    console.log('4. Check browser console for JavaScript errors');
    console.log('5. Check if WebSocket/real-time features are working');
    
    console.log('\n🔧 COMMON CHAT ISSUES:');
    console.log('- Users not friends with each other');
    console.log('- JavaScript errors in frontend');
    console.log('- API routes not working due to syntax errors');
    console.log('- Authentication issues');
    console.log('- Database connection problems');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Test login and access /chat page');
    console.log('2. Check browser console for errors');
    console.log('3. Try sending a message and check server logs');
    console.log('4. Verify users are friends before messaging');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testChatIssue();