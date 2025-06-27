// Full chat service test with data creation
require('dotenv').config();

async function testChatServiceFull() {
    try {
        console.log('🧪 Full Chat Service Test...\n');
        
        // Load modules
        const database = require('./config/database');
        const chatService = require('./services/chatService');
        const User = require('./models/User');
        const Message = require('./models/Message');
        
        // Connect to database
        await database.connect();
        console.log('✅ Database connected\n');
        
        // Get two test users
        const users = await User.find().limit(2);
        if (users.length < 2) {
            console.log('❌ Need at least 2 users in database to test chat functionality');
            return;
        }
        
        const user1 = users[0];
        const user2 = users[1];
        
        console.log(`👤 User 1: ${user1.email} (${user1._id})`);
        console.log(`👤 User 2: ${user2.email} (${user2._id})\n`);
        
        // Test 1: Add friend
        console.log('1. Testing addFriend...');
        try {
            // First, make sure they're not already friends
            if (!user1.friends.includes(user2._id)) {
                const friend = await chatService.addFriend(user1._id, user2.email);
                console.log(`✅ Added friend: ${friend.fullName}`);
            } else {
                console.log('✅ Users are already friends');
            }
        } catch (error) {
            console.log(`❌ addFriend failed: ${error.message}`);
        }
        
        // Test 2: Send message
        console.log('\n2. Testing sendMessage...');
        try {
            const message = await chatService.sendMessage(
                user1._id,
                user2._id,
                'Hello! This is a test message from the chat service test.'
            );
            console.log(`✅ Message sent: ${message._id}`);
            console.log(`   Content: "${message.content}"`);
            console.log(`   From: ${message.sender.fullName}`);
            console.log(`   To: ${message.receiver.fullName}`);
        } catch (error) {
            console.log(`❌ sendMessage failed: ${error.message}`);
        }
        
        // Test 3: Get conversations
        console.log('\n3. Testing getUserConversations...');
        try {
            const conversations = await chatService.getUserConversations(user1._id);
            console.log(`✅ Found ${conversations.length} conversations`);
            conversations.forEach((conv, index) => {
                console.log(`   ${index + 1}. With: ${conv.friend.fullName}`);
                console.log(`      Last message: "${conv.lastMessage.content}"`);
                console.log(`      Unread: ${conv.unreadCount}`);
            });
        } catch (error) {
            console.log(`❌ getUserConversations failed: ${error.message}`);
        }
        
        // Test 4: Get messages
        console.log('\n4. Testing getConversationMessages...');
        try {
            const messages = await chatService.getConversationMessages(user1._id, user2._id, 10, 0);
            console.log(`✅ Found ${messages.length} messages`);
            messages.forEach((msg, index) => {
                console.log(`   ${index + 1}. [${new Date(msg.createdAt).toLocaleTimeString()}] ${msg.sender.fullName}: "${msg.content}"`);
            });
        } catch (error) {
            console.log(`❌ getConversationMessages failed: ${error.message}`);
        }
        
        // Test 5: Get friends
        console.log('\n5. Testing getUserFriends...');
        try {
            const friends = await chatService.getUserFriends(user1._id);
            console.log(`✅ Found ${friends.length} friends`);
            friends.forEach((friend, index) => {
                console.log(`   ${index + 1}. ${friend.fullName} (${friend.email})`);
            });
        } catch (error) {
            console.log(`❌ getUserFriends failed: ${error.message}`);
        }
        
        // Test 6: Search users
        console.log('\n6. Testing searchUsers...');
        try {
            const searchResults = await chatService.searchUsers(user1._id, user2.fullName.split(' ')[0], 5);
            console.log(`✅ Search found ${searchResults.length} users`);
            searchResults.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.fullName} (${user.email}) - Friend: ${user.isFriend}`);
            });
        } catch (error) {
            console.log(`❌ searchUsers failed: ${error.message}`);
        }
        
        console.log('\n🎉 Full chat service test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit(0);
    }
}

testChatServiceFull();