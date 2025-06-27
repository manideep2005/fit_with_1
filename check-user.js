require('dotenv').config();
const database = require('./config/database');
const User = require('./models/User');

async function checkUser() {
    try {
        await database.connect();
        console.log('✅ Database connected');
        
        // Check if the specific user exists
        const targetEmail = 'gonuguntamahesh@gmail.com';
        const user = await User.findOne({ email: targetEmail });
        
        console.log(`\n🔍 Checking for user: ${targetEmail}`);
        console.log('User found:', !!user);
        
        if (user) {
            console.log('✅ User details:');
            console.log('  ID:', user._id);
            console.log('  Email:', user.email);
            console.log('  Full Name:', user.fullName);
            console.log('  Friends Count:', user.friends ? user.friends.length : 0);
        } else {
            console.log('❌ User not found');
            
            // Show all available users
            const allUsers = await User.find({}, 'email fullName').limit(10);
            console.log('\n📋 Available users in database:');
            allUsers.forEach((u, index) => {
                console.log(`  ${index + 1}. ${u.email} (${u.fullName})`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkUser();