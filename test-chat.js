// Test script for chat functionality
const mongoose = require('mongoose');
require('dotenv').config();

const database = require('./config/database');
const ChatService = require('./services/chatService');
const UserService = require('./services/userService');

async function testChatService() {
    try {
        console.log('🔄 Connecting to database...');
        await database.connect();
        console.log('✅ Database connected successfully');

        // Test 1: Create test users if they don't exist
        console.log('\n📝 Testing user creation...');
        
        let user1, user2;
        try {
            user1 = await UserService.getUserByEmail('test1@example.com');
            if (!user1) {
                user1 = await UserService.createUser({
                    email: 'test1@example.com',
                    fullName: 'Test User One',
                    password: 'password123'
                });
                console.log('✅ Created test user 1:', user1.email);
            } else {
                console.log('✅ Test user 1 exists:', user1.email);
            }

            user2 = await UserService.getUserByEmail('test2@example.com');
            if (!user2) {
                user2 = await UserService.createUser({
                    email: 'test2@example.com',
                    fullName: 'Test User Two',
                    password: 'password123'
                });
                console.log('✅ Created test user 2:', user2.email);
            } else {
                console.log('✅ Test user 2 exists:', user2.email);
            }
        } catch (userError) {
            console.log('ℹ️ Test users might already exist, continuing...');
            user1 = await UserService.getUserByEmail('test1@example.com');
            user2 = await UserService.getUserByEmail('test2@example.com');
        }

        if (!user1 || !user2) {
            throw new Error('Could not create or find test users');
        }

        // Test 2: Add friends
        console.log('\n👥 Testing friend functionality...');
        try {
            await ChatService.addFriend(user1._id, user2.email);
            console.log('✅ Added user2 as friend of user1');
        } catch (friendError) {
            if (friendError.message.includes('Already friends')) {
                console.log('ℹ️ Users are already friends');
            } else {
                console.log('❌ Friend error:', friendError.message);
            }
        }

        // Test 3: Get friends list
        console.log('\n📋 Testing get friends...');
        const user1Friends = await ChatService.getUserFriends(user1._id);
        console.log('✅ User1 friends count:', user1Friends.length);
        console.log('Friends:', user1Friends.map(f => f.fullName));

        // Test 4: Send a message
        console.log('\n💬 Testing message sending...');
        const message = await ChatService.sendMessage(
            user1._id,
            user2._id,
            'Hello! This is a test message from the chat service.'
        );
        console.log('✅ Message sent successfully:', message._id);
        console.log('Message content:', message.content);

        // Test 5: Get conversations
        console.log('\n📨 Testing get conversations...');
        const conversations = await ChatService.getUserConversations(user1._id);
        console.log('✅ User1 conversations count:', conversations.length);
        if (conversations.length > 0) {
            console.log('Latest conversation with:', conversations[0].friend.fullName);
            console.log('Last message:', conversations[0].lastMessage.content);
        }

        // Test 6: Get conversation messages
        console.log('\n📜 Testing get conversation messages...');
        const messages = await ChatService.getConversationMessages(user1._id, user2._id, 10, 0);
        console.log('✅ Messages count:', messages.length);
        if (messages.length > 0) {
            console.log('Latest message:', messages[messages.length - 1].content);
        }

        // Test 7: Search users
        console.log('\n🔍 Testing user search...');
        const searchResults = await ChatService.searchUsers(user1._id, 'Test', 5);
        console.log('✅ Search results count:', searchResults.length);
        searchResults.forEach(user => {
            console.log(`- ${user.fullName} (${user.email}) - Friend: ${user.isFriend}`);
        });

        console.log('\n🎉 All chat service tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
}

// Run the test
testChatService();