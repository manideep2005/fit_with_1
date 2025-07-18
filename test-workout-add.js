const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectToDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Test adding a workout
async function testAddWorkout() {
  try {
    console.log('🧪 Testing workout addition...');
    
    const UserService = require('./services/userService');
    
    // Test with a known user
    const testEmail = 'manideep.gonugunta1802@gmail.com';
    
    const workoutData = {
      type: 'Test Workout',
      duration: 30,
      calories: 200,
      exercises: [
        {
          name: 'Push-ups',
          sets: 3,
          reps: 15
        }
      ],
      notes: 'Test workout from fixed service'
    };
    
    console.log('📝 Adding workout:', workoutData);
    
    const result = await UserService.addWorkout(testEmail, workoutData);
    
    if (result) {
      console.log('✅ Workout added successfully!');
      console.log('📊 User now has', result.workouts?.length || 0, 'workouts');
    } else {
      console.log('❌ Failed to add workout');
    }
    
  } catch (error) {
    console.error('❌ Error testing workout addition:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      path: error.path
    });
  }
}

// Test getting user data
async function testGetUser() {
  try {
    console.log('\n🧪 Testing user retrieval...');
    
    const UserService = require('./services/userService');
    
    const testEmail = 'manideep.gonugunta1802@gmail.com';
    
    const user = await UserService.getUserByEmail(testEmail);
    
    if (user) {
      console.log('✅ User retrieved successfully!');
      console.log('📊 User has', user.workouts?.length || 0, 'workouts');
      console.log('📊 User has', user.nutritionLogs?.length || 0, 'nutrition logs');
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Error testing user retrieval:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      path: error.path
    });
  }
}

// Main execution
async function main() {
  try {
    await connectToDatabase();
    await testGetUser();
    await testAddWorkout();
    
    console.log('\n🎉 Test completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the script
main();