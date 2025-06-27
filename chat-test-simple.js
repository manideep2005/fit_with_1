// Simple chat service test
require('dotenv').config();

async function testChatService() {
    try {
        console.log('🧪 Testing Chat Service...\n');
        
        // Test 1: Load required modules
        console.log('1. Loading modules...');
        const database = require('./config/database');
        const chatService = require('./services/chatService');
        const User = require('./models/User');
        const Message = require('./models/Message');
        console.log('✅ Modules loaded successfully\n');
        
        // Test 2: Database connection
        console.log('2. Testing database connection...');
        await database.connect();
        console.log('✅ Database connected\n');
        
        // Test 3: Check if User model works
        console.log('3. Testing User model...');
        const userCount = await User.countDocuments();
        console.log(`✅ Found ${userCount} users in database\n`);
        
        // Test 4: Check if Message model works
        console.log('4. Testing Message model...');
        const messageCount = await Message.countDocuments();
        console.log(`✅ Found ${messageCount} messages in database\n`);
        
        // Test 5: Test chat service methods
        console.log('5. Testing ChatService methods...');
        
        // Find a test user
        const testUser = await User.findOne();
        if (!testUser) {
            console.log('❌ No users found in database. Cannot test chat functionality.');
            return;
        }
        
        console.log(`✅ Using test user: ${testUser.email}\n`);
        
        // Test getUserConversations
        console.log('5a. Testing getUserConversations...');
        try {
            const conversations = await chatService.getUserConversations(testUser._id);
            console.log(`✅ getUserConversations returned ${conversations.length} conversations\n`);
        } catch (error) {
            console.log(`❌ getUserConversations failed: ${error.message}\n`);
        }
        
        // Test getUserFriends
        console.log('5b. Testing getUserFriends...');
        try {
            const friends = await chatService.getUserFriends(testUser._id);
            console.log(`✅ getUserFriends returned ${friends.length} friends\n`);
        } catch (error) {
            console.log(`❌ getUserFriends failed: ${error.message}\n`);
        }
        
        // Test searchUsers
        console.log('5c. Testing searchUsers...');
        try {
            const searchResults = await chatService.searchUsers(testUser._id, 'test', 5);
            console.log(`✅ searchUsers returned ${searchResults.length} results\n`);
        } catch (error) {
            console.log(`❌ searchUsers failed: ${error.message}\n`);
        }
        
        console.log('🎉 Chat service test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit(0);
    }
}

testChatService();