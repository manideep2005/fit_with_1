const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB and check user data
async function debugUser() {
    try {
        console.log('🔍 Debugging User Data...\n');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
        console.log('✅ Connected to MongoDB');
        
        // Import User model
        const User = require('./models/User');
        
        // Find the test user
        const user = await User.findOne({ email: 'completeflow@test.com' });
        
        if (!user) {
            console.log('❌ User not found');
            return;
        }
        
        console.log('👤 User found:', user.email);
        console.log('📊 User data structure:');
        console.log('   - onboardingCompleted:', user.onboardingCompleted);
        console.log('   - workouts array exists:', Array.isArray(user.workouts));
        console.log('   - workouts length:', user.workouts ? user.workouts.length : 'undefined');
        console.log('   - nutritionLogs array exists:', Array.isArray(user.nutritionLogs));
        console.log('   - nutritionLogs length:', user.nutritionLogs ? user.nutritionLogs.length : 'undefined');
        console.log('   - biometrics array exists:', Array.isArray(user.biometrics));
        console.log('   - biometrics length:', user.biometrics ? user.biometrics.length : 'undefined');
        
        // Try to add a workout directly
        console.log('\n🧪 Testing direct workout addition...');
        
        const testWorkout = {
            date: new Date(),
            type: 'Debug Test Workout',
            duration: 30,
            calories: 200,
            exercises: [],
            notes: 'Direct test'
        };
        
        user.workouts.push(testWorkout);
        await user.save();
        
        console.log('✅ Workout added successfully!');
        console.log('📊 Updated workouts length:', user.workouts.length);
        
        // Test UserService
        console.log('\n🧪 Testing UserService...');
        const UserService = require('./services/userService');
        
        const serviceResult = await UserService.addWorkout('completeflow@test.com', {
            date: new Date(),
            type: 'Service Test Workout',
            duration: 25,
            calories: 150,
            exercises: [],
            notes: 'Service test'
        });
        
        console.log('✅ UserService workout added:', serviceResult);
        
        // Check final state
        const finalUser = await User.findOne({ email: 'completeflow@test.com' });
        console.log('📊 Final workouts count:', finalUser.workouts.length);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

debugUser();