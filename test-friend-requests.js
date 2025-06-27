// Test friend request system
require('dotenv').config();

async function testFriendRequests() {
    try {
        console.log('🧪 Testing Friend Request System...\n');
        
        // Load modules
        const database = require('./config/database');
        const chatService = require('./services/chatService');
        const User = require('./models/User');
        
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
        
        console.log(`👤 User 1 (Sender): ${user1.email} (${user1.fullName})`);
        console.log(`👤 User 2 (Receiver): ${user2.email} (${user2.fullName})\n`);
        
        // Test 1: Send friend request
        console.log('1. Testing sendFriendRequest...');
        try {
            const friendRequest = await chatService.sendFriendRequest(
                user1._id, 
                user2.email, 
                'Hi! I would like to connect with you on Fit-With-AI!'
            );
            console.log(`✅ Friend request sent successfully`);
            console.log(`   Request ID: ${friendRequest._id}`);
            console.log(`   From: ${friendRequest.sender.fullName}`);
            console.log(`   To: ${friendRequest.receiver.fullName}`);
            console.log(`   Message: "${friendRequest.message}"`);
            console.log(`   Status: ${friendRequest.status}\n`);
        } catch (error) {
            console.log(`❌ sendFriendRequest failed: ${error.message}\n`);
        }
        
        // Test 2: Get pending requests for receiver
        console.log('2. Testing getPendingFriendRequests...');
        try {
            const pendingRequests = await chatService.getPendingFriendRequests(user2._id);
            console.log(`✅ Found ${pendingRequests.length} pending requests for ${user2.fullName}`);
            pendingRequests.forEach((req, index) => {
                console.log(`   ${index + 1}. From: ${req.sender.fullName} (${req.sender.email})`);
                console.log(`      Message: "${req.message}"`);
                console.log(`      Sent: ${new Date(req.createdAt).toLocaleString()}`);
            });
            console.log('');
        } catch (error) {
            console.log(`❌ getPendingFriendRequests failed: ${error.message}\n`);
        }
        
        // Test 3: Get sent requests for sender
        console.log('3. Testing getSentFriendRequests...');
        try {
            const sentRequests = await chatService.getSentFriendRequests(user1._id);
            console.log(`✅ Found ${sentRequests.length} sent requests from ${user1.fullName}`);
            sentRequests.forEach((req, index) => {
                console.log(`   ${index + 1}. To: ${req.receiver.fullName} (${req.receiver.email})`);
                console.log(`      Message: "${req.message}"`);
                console.log(`      Status: ${req.status}`);
                console.log(`      Sent: ${new Date(req.createdAt).toLocaleString()}`);
            });
            console.log('');
        } catch (error) {
            console.log(`❌ getSentFriendRequests failed: ${error.message}\n`);
        }
        
        // Test 4: Check friendship status
        console.log('4. Testing getFriendshipStatus...');
        try {
            const status = await chatService.getFriendshipStatus(user1._id, user2._id);
            console.log(`✅ Friendship status between ${user1.fullName} and ${user2.fullName}: ${status}\n`);
        } catch (error) {
            console.log(`❌ getFriendshipStatus failed: ${error.message}\n`);
        }
        
        // Test 5: Try to send message (should fail since not friends yet)
        console.log('5. Testing sendMessage before accepting friend request...');
        try {
            await chatService.sendMessage(user1._id, user2._id, 'Hello! This should fail.');
            console.log(`❌ Message sent unexpectedly - this should have failed!\n`);
        } catch (error) {
            console.log(`✅ Message correctly blocked: ${error.message}\n`);
        }
        
        // Test 6: Accept friend request
        console.log('6. Testing acceptFriendRequest...');
        try {
            const pendingRequests = await chatService.getPendingFriendRequests(user2._id);
            if (pendingRequests.length > 0) {
                const requestToAccept = pendingRequests[0];
                const acceptedRequest = await chatService.acceptFriendRequest(requestToAccept._id, user2._id);
                console.log(`✅ Friend request accepted successfully`);
                console.log(`   Request ID: ${acceptedRequest._id}`);
                console.log(`   Status: ${acceptedRequest.status}`);
                console.log(`   Accepted at: ${acceptedRequest.respondedAt}\n`);
            } else {
                console.log(`❌ No pending requests to accept\n`);
            }
        } catch (error) {
            console.log(`❌ acceptFriendRequest failed: ${error.message}\n`);
        }
        
        // Test 7: Check friendship status after acceptance
        console.log('7. Testing getFriendshipStatus after acceptance...');
        try {
            const status = await chatService.getFriendshipStatus(user1._id, user2._id);
            console.log(`✅ Friendship status after acceptance: ${status}\n`);
        } catch (error) {
            console.log(`❌ getFriendshipStatus failed: ${error.message}\n`);
        }
        
        // Test 8: Try to send message again (should work now)
        console.log('8. Testing sendMessage after accepting friend request...');
        try {
            const message = await chatService.sendMessage(
                user1._id, 
                user2._id, 
                'Hello! Now we are friends and can chat!'
            );
            console.log(`✅ Message sent successfully after becoming friends`);
            console.log(`   Message ID: ${message._id}`);
            console.log(`   Content: "${message.content}"`);
            console.log(`   From: ${message.sender.fullName}`);
            console.log(`   To: ${message.receiver.fullName}\n`);
        } catch (error) {
            console.log(`❌ sendMessage failed: ${error.message}\n`);
        }
        
        console.log('🎉 Friend request system test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit(0);
    }
}

testFriendRequests();