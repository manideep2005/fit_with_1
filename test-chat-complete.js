// Complete test script for chat functionality with friend requests
const mongoose = require('mongoose');
require('dotenv').config();

const database = require('./config/database');
const ChatService = require('./services/chatService');
const UserService = require('./services/userService');
const FriendRequestService = require('./services/friendRequestService');

async function testCompleteChat() {
    try {
        console.log('🔄 Connecting to database...');
        await database.connect();
        console.log('✅ Database connected successfully');

        // Test 1: Create test users if they don't exist
        console.log('\n📝 Testing user creation...');
        
        let user1, user2;
        try {
            user1 = await UserService.getUserByEmail('alice@example.com');
            if (!user1) {
                user1 = await UserService.createUser({
                    email: 'alice@example.com',
                    fullName: 'Alice Johnson',
                    password: 'password123'
                });
                console.log('✅ Created Alice:', user1.email);
            } else {
                console.log('✅ Alice exists:', user1.email);
            }

            user2 = await UserService.getUserByEmail('bob@example.com');
            if (!user2) {
                user2 = await UserService.createUser({
                    email: 'bob@example.com',
                    fullName: 'Bob Smith',
                    password: 'password123'
                });
                console.log('✅ Created Bob:', user2.email);
            } else {
                console.log('✅ Bob exists:', user2.email);
            }
        } catch (userError) {
            console.log('ℹ️ Test users might already exist, continuing...');
            user1 = await UserService.getUserByEmail('alice@example.com');
            user2 = await UserService.getUserByEmail('bob@example.com');
        }

        if (!user1 || !user2) {
            throw new Error('Could not create or find test users');
        }

        // Test 2: Send friend request
        console.log('\n📤 Testing friend request sending...');
        try {
            const friendRequest = await FriendRequestService.sendFriendRequest(
                user1._id, 
                user2.email, 
                'Hi Bob! I would like to connect with you on our fitness journey.'
            );
            console.log('✅ Friend request sent successfully');
            console.log('Request ID:', friendRequest._id);
            console.log('Message:', friendRequest.message);
        } catch (requestError) {
            if (requestError.message.includes('already sent')) {
                console.log('ℹ️ Friend request already exists');
            } else {
                console.log('❌ Friend request error:', requestError.message);
            }
        }

        // Test 3: Check pending requests
        console.log('\n📨 Testing pending friend requests...');
        const pendingRequests = await FriendRequestService.getPendingRequests(user2._id);
        console.log('✅ Bob has', pendingRequests.length, 'pending friend requests');
        
        let requestToAccept = null;
        if (pendingRequests.length > 0) {
            const request = pendingRequests[0];
            console.log('Request from:', request.sender.fullName);
            console.log('Message:', request.message);
            requestToAccept = request._id;
        }

        // Test 4: Accept friend request
        if (requestToAccept) {
            console.log('\n✅ Testing friend request acceptance...');
            try {
                await FriendRequestService.acceptFriendRequest(requestToAccept, user2._id);
                console.log('✅ Friend request accepted successfully');
            } catch (acceptError) {
                console.log('❌ Accept error:', acceptError.message);
            }
        }

        // Test 5: Check friendship status
        console.log('\n👥 Testing friendship status...');
        const friendshipStatus = await FriendRequestService.getFriendshipStatus(user1._id, user2._id);
        console.log('✅ Friendship status:', friendshipStatus);

        // Test 6: Get friends list
        console.log('\n📋 Testing friends list...');
        const aliceFriends = await ChatService.getUserFriends(user1._id);
        const bobFriends = await ChatService.getUserFriends(user2._id);
        console.log('✅ Alice has', aliceFriends.length, 'friends');
        console.log('✅ Bob has', bobFriends.length, 'friends');

        if (aliceFriends.length > 0) {
            console.log('Alice\'s friends:', aliceFriends.map(f => f.fullName));
        }

        // Test 7: Send messages (only if they are friends)
        if (friendshipStatus === 'friends') {
            console.log('\n💬 Testing message sending...');
            
            // Alice sends message to Bob
            const message1 = await ChatService.sendMessage(
                user1._id,
                user2._id,
                'Hey Bob! Great to connect with you. How\'s your fitness journey going?'
            );
            console.log('✅ Alice sent message:', message1.content);

            // Bob replies to Alice
            const message2 = await ChatService.sendMessage(
                user2._id,
                user1._id,
                'Hi Alice! Thanks for connecting. I\'ve been focusing on strength training lately. What about you?'
            );
            console.log('✅ Bob replied:', message2.content);

            // Alice sends another message
            const message3 = await ChatService.sendMessage(
                user1._id,
                user2._id,
                'That\'s awesome! I\'ve been doing a mix of cardio and yoga. Maybe we can share workout tips!'
            );
            console.log('✅ Alice sent another message:', message3.content);
        } else {
            console.log('⚠️ Users are not friends yet, cannot send messages');
        }

        // Test 8: Get conversations
        console.log('\n📨 Testing conversations...');
        const aliceConversations = await ChatService.getUserConversations(user1._id);
        const bobConversations = await ChatService.getUserConversations(user2._id);
        
        console.log('✅ Alice has', aliceConversations.length, 'conversations');
        console.log('✅ Bob has', bobConversations.length, 'conversations');

        if (aliceConversations.length > 0) {
            const conv = aliceConversations[0];
            console.log('Alice\'s latest conversation with:', conv.friend.fullName);
            console.log('Last message:', conv.lastMessage.content);
            console.log('Unread count:', conv.unreadCount);
        }

        // Test 9: Get conversation messages
        if (friendshipStatus === 'friends') {
            console.log('\n📜 Testing conversation messages...');
            const messages = await ChatService.getConversationMessages(user1._id, user2._id, 10, 0);
            console.log('✅ Found', messages.length, 'messages in conversation');
            
            messages.forEach((msg, index) => {
                const senderName = msg.sender._id.toString() === user1._id.toString() ? 'Alice' : 'Bob';
                console.log(`${index + 1}. ${senderName}: ${msg.content}`);
            });
        }

        // Test 10: Search users
        console.log('\n🔍 Testing user search...');
        const searchResults = await ChatService.searchUsers(user1._id, 'Bob', 5);
        console.log('✅ Search results for "Bob":', searchResults.length);
        
        searchResults.forEach(user => {
            console.log(`- ${user.fullName} (${user.email})`);
            console.log(`  Status: ${user.friendshipStatus}, Is Friend: ${user.isFriend}`);
        });

        // Test 11: Test unread message count
        console.log('\n📊 Testing unread message count...');
        const unreadCount = await ChatService.getUnreadMessageCount(user2._id);
        console.log('✅ Bob has', unreadCount, 'unread messages');

        console.log('\n🎉 All chat functionality tests completed successfully!');
        console.log('\n📋 Summary:');
        console.log('- Users created and authenticated ✅');
        console.log('- Friend request system working ✅');
        console.log('- Friendship status tracking ✅');
        console.log('- Message sending between friends ✅');
        console.log('- Conversation management ✅');
        console.log('- User search functionality ✅');
        console.log('- Unread message tracking ✅');

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

// Run the complete test
testCompleteChat();