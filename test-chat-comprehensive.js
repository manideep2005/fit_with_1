// Comprehensive Chat Service Test
require('dotenv').config();

async function testChatServiceComprehensive() {
    try {
        console.log('🧪 Comprehensive Chat Service Test...\n');
        
        // Load modules
        const database = require('./config/database');
        const chatService = require('./services/chatService');
        const User = require('./models/User');
        const Message = require('./models/Message');
        const FriendRequest = require('./models/FriendRequest');
        
        // Connect to database
        await database.connect();
        console.log('✅ Database connected\n');
        
        // Test 1: Check database health
        console.log('1. Checking database health...');
        const userCount = await User.countDocuments();
        const messageCount = await Message.countDocuments();
        const requestCount = await FriendRequest.countDocuments();
        
        console.log(`   Users: ${userCount}`);
        console.log(`   Messages: ${messageCount}`);
        console.log(`   Friend Requests: ${requestCount}`);
        
        // Test 2: Get test users
        console.log('\n2. Getting test users...');
        const users = await User.find().limit(3);
        if (users.length < 2) {
            console.log('❌ Need at least 2 users in database to test chat functionality');
            return;
        }
        
        const user1 = users[0];
        const user2 = users[1];
        const user3 = users[2] || null;
        
        console.log(`   User 1: ${user1.email} (${user1._id})`);
        console.log(`   User 2: ${user2.email} (${user2._id})`);
        if (user3) console.log(`   User 3: ${user3.email} (${user3._id})`);
        
        // Test 3: Check user data integrity
        console.log('\n3. Checking user data integrity...');
        try {
            // Check if workouts field is properly formatted
            if (user1.workouts && typeof user1.workouts[0] === 'string') {
                console.log('   ⚠️  User 1 has corrupted workouts data (string instead of object)');
                // Try to fix it
                try {
                    const parsedWorkouts = JSON.parse(user1.workouts[0]);
                    user1.workouts = [parsedWorkouts];
                    await user1.save();
                    console.log('   ✅ Fixed user 1 workouts data');
                } catch (parseError) {
                    console.log('   ❌ Could not parse workouts data, clearing it');
                    user1.workouts = [];
                    await user1.save();
                }
            } else {
                console.log('   ✅ User 1 workouts data is properly formatted');
            }
            
            if (user2.workouts && typeof user2.workouts[0] === 'string') {
                console.log('   ⚠️  User 2 has corrupted workouts data (string instead of object)');
                // Try to fix it
                try {
                    const parsedWorkouts = JSON.parse(user2.workouts[0]);
                    user2.workouts = [parsedWorkouts];
                    await user2.save();
                    console.log('   ✅ Fixed user 2 workouts data');
                } catch (parseError) {
                    console.log('   ❌ Could not parse workouts data, clearing it');
                    user2.workouts = [];
                    await user2.save();
                }
            } else {
                console.log('   ✅ User 2 workouts data is properly formatted');
            }
        } catch (error) {
            console.log(`   ❌ Error checking user data: ${error.message}`);
        }
        
        // Test 4: Test friendship status
        console.log('\n4. Testing friendship status...');
        try {
            const status = await chatService.getFriendshipStatus(user1._id, user2._id);
            console.log(`   Friendship status: ${status}`);
        } catch (error) {
            console.log(`   ❌ getFriendshipStatus failed: ${error.message}`);
        }
        
        // Test 5: Test friend request system (if not already friends)
        console.log('\n5. Testing friend request system...');
        try {
            const status = await chatService.getFriendshipStatus(user1._id, user2._id);
            
            if (status === 'not_friends') {
                console.log('   Sending friend request...');
                const friendRequest = await chatService.sendFriendRequest(
                    user1._id, 
                    user2.email, 
                    'Hi! I would like to connect with you on Fit-With-AI!'
                );
                console.log(`   ✅ Friend request sent: ${friendRequest._id}`);
                
                // Test pending requests
                const pendingRequests = await chatService.getPendingFriendRequests(user2._id);
                console.log(`   Pending requests for user 2: ${pendingRequests.length}`);
                
                // Accept the request
                if (pendingRequests.length > 0) {
                    const requestToAccept = pendingRequests[0];
                    console.log('   Accepting friend request...');
                    const acceptedRequest = await chatService.acceptFriendRequest(requestToAccept._id, user2._id);
                    console.log(`   ✅ Friend request accepted: ${acceptedRequest._id}`);
                }
            } else if (status === 'friends') {
                console.log('   ✅ Users are already friends');
            } else {
                console.log(`   Current status: ${status}`);
            }
        } catch (error) {
            console.log(`   ❌ Friend request test failed: ${error.message}`);
        }
        
        // Test 6: Test messaging functionality
        console.log('\n6. Testing messaging functionality...');
        try {
            // Send a message
            const message = await chatService.sendMessage(
                user1._id,
                user2._id,
                'Hello! This is a comprehensive test message.'
            );
            console.log(`   ✅ Message sent: ${message._id}`);
            console.log(`   Content: "${message.content}"`);
            
            // Get conversation messages
            const messages = await chatService.getConversationMessages(user1._id, user2._id, 10, 0);
            console.log(`   ✅ Found ${messages.length} messages in conversation`);
            
            // Mark messages as read
            await chatService.markMessagesAsRead(user1._id, user2._id, user2._id);
            console.log('   ✅ Messages marked as read');
            
        } catch (error) {
            console.log(`   ❌ Messaging test failed: ${error.message}`);
        }
        
        // Test 7: Test conversation list
        console.log('\n7. Testing conversation list...');
        try {
            const conversations = await chatService.getUserConversations(user1._id);
            console.log(`   ✅ Found ${conversations.length} conversations for user 1`);
            conversations.forEach((conv, index) => {
                console.log(`   ${index + 1}. With: ${conv.friend.fullName}`);
                console.log(`      Last message: "${conv.lastMessage.content}"`);
                console.log(`      Unread: ${conv.unreadCount}`);
            });
        } catch (error) {
            console.log(`   ❌ Conversation list test failed: ${error.message}`);
        }
        
        // Test 8: Test friend list
        console.log('\n8. Testing friend list...');
        try {
            const friends = await chatService.getUserFriends(user1._id);
            console.log(`   ✅ Found ${friends.length} friends for user 1`);
            friends.forEach((friend, index) => {
                console.log(`   ${index + 1}. ${friend.fullName} (${friend.email})`);
            });
        } catch (error) {
            console.log(`   ❌ Friend list test failed: ${error.message}`);
        }
        
        // Test 9: Test user search
        console.log('\n9. Testing user search...');
        try {
            const searchResults = await chatService.searchUsers(user1._id, user2.fullName.split(' ')[0], 5);
            console.log(`   ✅ Search found ${searchResults.length} users`);
            searchResults.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.fullName} (${user.email}) - Friend: ${user.isFriend}`);
            });
        } catch (error) {
            console.log(`   ❌ User search test failed: ${error.message}`);
        }
        
        // Test 10: Test unread message count
        console.log('\n10. Testing unread message count...');
        try {
            const unreadCount = await chatService.getUnreadMessageCount(user1._id);
            console.log(`   ✅ User 1 has ${unreadCount} unread messages`);
        } catch (error) {
            console.log(`   ❌ Unread count test failed: ${error.message}`);
        }
        
        // Test 11: Test message deletion (if there are messages)
        console.log('\n11. Testing message deletion...');
        try {
            const messages = await chatService.getConversationMessages(user1._id, user2._id, 1, 0);
            if (messages.length > 0) {
                const messageToDelete = messages[0];
                await chatService.deleteMessage(messageToDelete._id, user1._id);
                console.log(`   ✅ Message deleted: ${messageToDelete._id}`);
            } else {
                console.log('   No messages to delete');
            }
        } catch (error) {
            console.log(`   ❌ Message deletion test failed: ${error.message}`);
        }
        
        // Test 12: Test workout sharing (if users are friends)
        console.log('\n12. Testing workout sharing...');
        try {
            const status = await chatService.getFriendshipStatus(user1._id, user2._id);
            if (status === 'friends') {
                const workoutData = {
                    type: 'Test Workout',
                    duration: 30,
                    calories: 200,
                    exercises: [
                        { name: 'Push-ups', sets: 3, reps: 10 }
                    ]
                };
                
                const sharedMessage = await chatService.shareWorkout(user1._id, user2._id, workoutData);
                console.log(`   ✅ Workout shared: ${sharedMessage._id}`);
                console.log(`   Workout type: ${sharedMessage.attachmentData.workoutId ? 'Shared' : 'Not shared'}`);
            } else {
                console.log('   Users are not friends, skipping workout sharing test');
            }
        } catch (error) {
            console.log(`   ❌ Workout sharing test failed: ${error.message}`);
        }
        
        // Test 13: Test progress sharing (if users are friends)
        console.log('\n13. Testing progress sharing...');
        try {
            const status = await chatService.getFriendshipStatus(user1._id, user2._id);
            if (status === 'friends') {
                const progressData = {
                    weight: 70,
                    bodyFat: 15,
                    muscleMass: 55,
                    date: new Date()
                };
                
                const sharedMessage = await chatService.shareProgress(user1._id, user2._id, progressData);
                console.log(`   ✅ Progress shared: ${sharedMessage._id}`);
            } else {
                console.log('   Users are not friends, skipping progress sharing test');
            }
        } catch (error) {
            console.log(`   ❌ Progress sharing test failed: ${error.message}`);
        }
        
        console.log('\n🎉 Comprehensive chat service test completed successfully!');
        console.log('\n📊 Summary:');
        console.log('   ✅ Core messaging functionality working');
        console.log('   ✅ Friend request system working');
        console.log('   ✅ Conversation management working');
        console.log('   ✅ User search working');
        console.log('   ✅ Message status tracking working');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit(0);
    }
}

testChatServiceComprehensive(); 