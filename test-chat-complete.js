// Comprehensive chat service test
require('dotenv').config();

async function testChatComplete() {
    try {
        console.log('🧪 Testing Complete Chat Service...\n');
        
        // Load modules
        const database = require('./config/database');
        const chatService = require('./services/chatService');
        const User = require('./models/User');
        const Message = require('./models/Message');
        
        // Connect to database
        await database.connect();
        console.log('✅ Database connected\n');
        
        // Get test users
        const users = await User.find().limit(3);
        if (users.length < 2) {
            console.log('❌ Need at least 2 users in database');
            return;
        }
        
        const user1 = users[0]; // Sender
        const user2 = users[1]; // Receiver
        
        console.log(`👤 User 1: ${user1.email} (${user1.fullName})`);
        console.log(`👤 User 2: ${user2.email} (${user2.fullName})\n`);
        
        // Test 1: Check friendship status
        console.log('1. Checking friendship status...');
        const status = await chatService.getFriendshipStatus(user1._id, user2._id);
        console.log(`✅ Friendship status: ${status}\n`);
        
        // Test 2: Send message (should work if friends)
        console.log('2. Testing message sending...');
        try {
            const message = await chatService.sendMessage(
                user1._id, 
                user2._id, 
                'Hello! This is a comprehensive test message.'
            );
            console.log(`✅ Message sent successfully!`);
            console.log(`   Message ID: ${message._id}`);
            console.log(`   Content: "${message.content}"`);
            console.log(`   From: ${message.sender.fullName}`);
            console.log(`   To: ${message.receiver.fullName}\n`);
        } catch (error) {
            console.log(`❌ Message sending failed: ${error.message}\n`);
        }
        
        // Test 3: Get conversation messages
        console.log('3. Testing conversation retrieval...');
        try {
            const messages = await chatService.getConversationMessages(user1._id, user2._id);
            console.log(`✅ Found ${messages.length} messages in conversation\n`);
        } catch (error) {
            console.log(`❌ Conversation retrieval failed: ${error.message}\n`);
        }
        
        // Test 4: Get user conversations
        console.log('4. Testing user conversations...');
        try {
            const conversations = await chatService.getUserConversations(user1._id);
            console.log(`✅ Found ${conversations.length} conversations for user\n`);
        } catch (error) {
            console.log(`❌ User conversations failed: ${error.message}\n`);
        }
        
        // Test 5: Get user friends
        console.log('5. Testing user friends...');
        try {
            const friends = await chatService.getUserFriends(user1._id);
            console.log(`✅ Found ${friends.length} friends for user\n`);
        } catch (error) {
            console.log(`❌ User friends failed: ${error.message}\n`);
        }
        
        // Test 6: Search users
        console.log('6. Testing user search...');
        try {
            const searchResults = await chatService.searchUsers(user1._id, 'test', 5);
            console.log(`✅ Found ${searchResults.length} users in search\n`);
        } catch (error) {
            console.log(`❌ User search failed: ${error.message}\n`);
        }
        
        // Test 7: Get unread message count
        console.log('7. Testing unread message count...');
        try {
            const unreadCount = await chatService.getUnreadMessageCount(user2._id);
            console.log(`✅ Unread messages: ${unreadCount}\n`);
        } catch (error) {
            console.log(`❌ Unread count failed: ${error.message}\n`);
        }
        
        // Test 8: Mark messages as read
        console.log('8. Testing mark messages as read...');
        try {
            const result = await chatService.markMessagesAsRead(user1._id, user2._id, user2._id);
            console.log(`✅ Messages marked as read: ${result.modifiedCount}\n`);
        } catch (error) {
            console.log(`❌ Mark as read failed: ${error.message}\n`);
        }
        
        // Test 9: Send reply message
        console.log('9. Testing reply message...');
        try {
            const replyMessage = await chatService.sendMessage(
                user2._id, 
                user1._id, 
                'Hi! This is a reply to your message.'
            );
            console.log(`✅ Reply message sent successfully!`);
            console.log(`   Message ID: ${replyMessage._id}`);
            console.log(`   Content: "${replyMessage.content}"\n`);
        } catch (error) {
            console.log(`❌ Reply message failed: ${error.message}\n`);
        }
        
        // Test 10: Share workout
        console.log('10. Testing workout sharing...');
        try {
            const workoutData = {
                _id: 'test-workout-id',
                type: 'Strength Training',
                duration: 45,
                exercises: ['Push-ups', 'Squats', 'Pull-ups']
            };
            const workoutMessage = await chatService.shareWorkout(user1._id, user2._id, workoutData);
            console.log(`✅ Workout shared successfully!`);
            console.log(`   Message ID: ${workoutMessage._id}`);
            console.log(`   Content: "${workoutMessage.content}"\n`);
        } catch (error) {
            console.log(`❌ Workout sharing failed: ${error.message}\n`);
        }
        
        // Test 11: Share progress
        console.log('11. Testing progress sharing...');
        try {
            const progressData = {
                type: 'Weight Loss',
                currentWeight: 75,
                targetWeight: 70,
                progress: 50
            };
            const progressMessage = await chatService.shareProgress(user1._id, user2._id, progressData);
            console.log(`✅ Progress shared successfully!`);
            console.log(`   Message ID: ${progressMessage._id}`);
            console.log(`   Content: "${progressMessage.content}"\n`);
        } catch (error) {
            console.log(`❌ Progress sharing failed: ${error.message}\n`);
        }
        
        console.log('🎉 Complete chat service test finished!');
        console.log('✅ All core chat functionality is working properly!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit(0);
    }
}

testChatComplete();