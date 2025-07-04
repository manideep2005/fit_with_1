// Test message sending functionality
require('dotenv').config();

async function testMessageSending() {
    try {
        console.log('🧪 Testing Message Sending Functionality...\n');
        
        // Load modules
        const database = require('./config/database');
        const chatService = require('./services/chatService');
        const User = require('./models/User');
        const Message = require('./models/Message');
        
        // Connect to database
        await database.connect();
        console.log('✅ Database connected\n');
        
        // Get test users
        const users = await User.find().limit(2);
        if (users.length < 2) {
            console.log('❌ Need at least 2 users in database');
            return;
        }
        
        const user1 = users[0]; // Sender
        const user2 = users[1]; // Receiver
        
        console.log(`👤 User 1 (Sender): ${user1.email} (${user1.fullName})`);
        console.log(`👤 User 2 (Receiver): ${user2.email} (${user2.fullName})\n`);
        
        // Test 1: Check friendship status
        console.log('1. Checking friendship status...');
        try {
            const status = await chatService.getFriendshipStatus(user1._id, user2._id);
            console.log(`✅ Friendship status: ${status}\n`);
            
            if (status === 'friends') {
                console.log('✅ Users are already friends - can test messaging\n');
            } else {
                console.log('⚠️ Users are not friends - need to make them friends first\n');
                
                // Make them friends for testing
                console.log('2. Making users friends for testing...');
                try {
                    // Add to friends list directly
                    user1.friends.push(user2._id);
                    user2.friends.push(user1._id);
                    await user1.save();
                    await user2.save();
                    console.log('✅ Users are now friends\n');
                } catch (error) {
                    console.log(`❌ Failed to make users friends: ${error.message}\n`);
                    return;
                }
            }
        } catch (error) {
            console.log(`❌ getFriendshipStatus failed: ${error.message}\n`);
            return;
        }
        
        // Test 3: Try to send a message
        console.log('3. Testing sendMessage...');
        try {
            const message = await chatService.sendMessage(
                user1._id, 
                user2._id, 
                'Hello! This is a test message from the chat service.'
            );
            console.log(`✅ Message sent successfully!`);
            console.log(`   Message ID: ${message._id}`);
            console.log(`   Content: "${message.content}"`);
            console.log(`   From: ${message.sender.fullName}`);
            console.log(`   To: ${message.receiver.fullName}`);
            console.log(`   Status: ${message.status}`);
            console.log(`   Conversation ID: ${message.conversationId}\n`);
        } catch (error) {
            console.log(`❌ sendMessage failed: ${error.message}`);
            console.log(`   Stack: ${error.stack}\n`);
        }
        
        // Test 4: Get conversation messages
        console.log('4. Testing getConversationMessages...');
        try {
            const messages = await chatService.getConversationMessages(user1._id, user2._id);
            console.log(`✅ Found ${messages.length} messages in conversation`);
            messages.forEach((msg, index) => {
                console.log(`   ${index + 1}. "${msg.content}" (${msg.sender.fullName} -> ${msg.receiver.fullName})`);
            });
            console.log('');
        } catch (error) {
            console.log(`❌ getConversationMessages failed: ${error.message}\n`);
        }
        
        // Test 5: Send another message
        console.log('5. Testing second message...');
        try {
            const message2 = await chatService.sendMessage(
                user2._id, 
                user1._id, 
                'Hi! This is a reply message.'
            );
            console.log(`✅ Reply message sent successfully!`);
            console.log(`   Message ID: ${message2._id}`);
            console.log(`   Content: "${message2.content}"\n`);
        } catch (error) {
            console.log(`❌ Second message failed: ${error.message}\n`);
        }
        
        console.log('🎉 Message sending test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit(0);
    }
}

testMessageSending(); 