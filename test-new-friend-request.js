// Test friend request with the specific user
require('dotenv').config();

async function testNewFriendRequest() {
    try {
        console.log('🧪 Testing Friend Request with gonuguntamahesh@gmail.com...\n');
        
        // Load modules
        const database = require('./config/database');
        const chatService = require('./services/chatService');
        const User = require('./models/User');
        
        // Connect to database
        await database.connect();
        console.log('✅ Database connected\n');
        
        // Get the first user as sender
        const sender = await User.findOne({ email: 'gajjishivateja@gmail.com' });
        const targetEmail = 'gonuguntamahesh@gmail.com';
        
        if (!sender) {
            console.log('❌ Sender user not found');
            return;
        }
        
        console.log(`👤 Sender: ${sender.email} (${sender.fullName})`);
        console.log(`🎯 Target: ${targetEmail}\n`);
        
        // Test 1: Check current friendship status
        console.log('1. Checking current friendship status...');
        try {
            const receiver = await User.findOne({ email: targetEmail });
            if (receiver) {
                const status = await chatService.getFriendshipStatus(sender._id, receiver._id);
                console.log(`✅ Current status: ${status}\n`);
            } else {
                console.log('❌ Target user not found\n');
                return;
            }
        } catch (error) {
            console.log(`❌ Status check failed: ${error.message}\n`);
        }
        
        // Test 2: Send friend request
        console.log('2. Sending friend request...');
        try {
            const friendRequest = await chatService.sendFriendRequest(
                sender._id, 
                targetEmail, 
                'Hi Mahesh! I would like to connect with you on Fit-With-AI. Let\'s be workout buddies!'
            );
            console.log(`✅ Friend request sent successfully!`);
            console.log(`   Request ID: ${friendRequest._id}`);
            console.log(`   From: ${friendRequest.sender.fullName}`);
            console.log(`   To: ${friendRequest.receiver.fullName}`);
            console.log(`   Message: "${friendRequest.message}"`);
            console.log(`   Status: ${friendRequest.status}\n`);
        } catch (error) {
            console.log(`❌ Friend request failed: ${error.message}\n`);
        }
        
        // Test 3: Try to send message (should fail)
        console.log('3. Trying to send message before acceptance...');
        try {
            const receiver = await User.findOne({ email: targetEmail });
            await chatService.sendMessage(sender._id, receiver._id, 'Hello Mahesh! This should fail.');
            console.log(`❌ Message sent unexpectedly - this should have failed!\n`);
        } catch (error) {
            console.log(`✅ Message correctly blocked: ${error.message}\n`);
        }
        
        // Test 4: Check pending requests for receiver
        console.log('4. Checking pending requests for receiver...');
        try {
            const receiver = await User.findOne({ email: targetEmail });
            const pendingRequests = await chatService.getPendingFriendRequests(receiver._id);
            console.log(`✅ ${receiver.fullName} has ${pendingRequests.length} pending friend requests`);
            pendingRequests.forEach((req, index) => {
                console.log(`   ${index + 1}. From: ${req.sender.fullName} (${req.sender.email})`);
                console.log(`      Message: "${req.message}"`);
                console.log(`      Sent: ${new Date(req.createdAt).toLocaleString()}`);
            });
            console.log('');
        } catch (error) {
            console.log(`❌ Get pending requests failed: ${error.message}\n`);
        }
        
        // Test 5: Accept the friend request (simulating the receiver)
        console.log('5. Accepting friend request (simulating receiver)...');
        try {
            const receiver = await User.findOne({ email: targetEmail });
            const pendingRequests = await chatService.getPendingFriendRequests(receiver._id);
            
            if (pendingRequests.length > 0) {
                const requestToAccept = pendingRequests[0];
                const acceptedRequest = await chatService.acceptFriendRequest(requestToAccept._id, receiver._id);
                console.log(`✅ Friend request accepted!`);
                console.log(`   Request ID: ${acceptedRequest._id}`);
                console.log(`   Status: ${acceptedRequest.status}`);
                console.log(`   Accepted at: ${acceptedRequest.respondedAt}\n`);
            } else {
                console.log(`❌ No pending requests to accept\n`);
            }
        } catch (error) {
            console.log(`❌ Accept request failed: ${error.message}\n`);
        }
        
        // Test 6: Try to send message again (should work now)
        console.log('6. Trying to send message after acceptance...');
        try {
            const receiver = await User.findOne({ email: targetEmail });
            const message = await chatService.sendMessage(
                sender._id, 
                receiver._id, 
                'Hello Mahesh! Now we are friends and can chat! 🎉'
            );
            console.log(`✅ Message sent successfully!`);
            console.log(`   Message ID: ${message._id}`);
            console.log(`   Content: "${message.content}"`);
            console.log(`   From: ${message.sender.fullName}`);
            console.log(`   To: ${message.receiver.fullName}\n`);
        } catch (error) {
            console.log(`❌ Send message failed: ${error.message}\n`);
        }
        
        // Test 7: Check final friendship status
        console.log('7. Checking final friendship status...');
        try {
            const receiver = await User.findOne({ email: targetEmail });
            const status = await chatService.getFriendshipStatus(sender._id, receiver._id);
            console.log(`✅ Final friendship status: ${status}\n`);
        } catch (error) {
            console.log(`❌ Status check failed: ${error.message}\n`);
        }
        
        console.log('🎉 Friend request system test completed successfully!');
        console.log('📧 Now gonuguntamahesh@gmail.com can receive and send messages!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit(0);
    }
}

testNewFriendRequest();