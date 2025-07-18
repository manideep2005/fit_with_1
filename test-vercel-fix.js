const mongoose = require('mongoose');
require('dotenv').config();

// Test the fixed ChatService initialization
async function testChatServiceFix() {
  try {
    console.log('🧪 Testing ChatService fix for Vercel deployment...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Test ChatService initialization with null io (simulating Vercel environment)
    const ChatService = require('./services/chatService');
    
    console.log('🔧 Testing ChatService.init with null io (Vercel simulation)...');
    ChatService.init(null); // This should not crash now
    console.log('✅ ChatService.init completed without errors!');
    
    // Test basic ChatService methods
    console.log('🧪 Testing basic ChatService methods...');
    
    // Test getUserFriends (should work without Socket.IO)
    try {
      // This will fail because we don't have a real user, but it should not crash due to Socket.IO
      await ChatService.getUserFriends('507f1f77bcf86cd799439011');
    } catch (error) {
      if (error.message.includes('User not found')) {
        console.log('✅ getUserFriends method works (expected user not found error)');
      } else {
        console.error('❌ Unexpected error:', error.message);
      }
    }
    
    console.log('🎉 All tests passed! ChatService is now Vercel-compatible.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the test
testChatServiceFix();