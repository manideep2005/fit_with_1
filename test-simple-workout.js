const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Test simple workout addition
async function testSimpleWorkout() {
  try {
    console.log('🧪 Testing simple workout addition...\n');
    
    // Use direct MongoDB operations first
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // Find a user
    const user = await collection.findOne({ 
      email: { $exists: true }
    });
    
    if (!user) {
      console.log('❌ No user found');
      return;
    }
    
    console.log(`🎯 Testing with user: ${user.email}`);
    console.log(`   Current workouts: ${Array.isArray(user.workouts) ? user.workouts.length + ' items' : typeof user.workouts}`);
    
    // Create a simple workout object
    const simpleWorkout = {
      date: new Date(),
      type: 'Simple Test',
      duration: 15,
      calories: 100,
      exercises: [],
      notes: 'Simple test workout'
    };
    
    console.log('\n📝 Workout object to add:');
    console.log('   Type:', typeof simpleWorkout);
    console.log('   Content:', JSON.stringify(simpleWorkout, null, 2));
    
    // Test 1: Direct MongoDB $push
    console.log('\n🔧 Test 1: Direct MongoDB $push...');
    
    try {
      const pushResult = await collection.updateOne(
        { _id: user._id },
        { $push: { workouts: simpleWorkout } }
      );
      
      console.log('✅ Direct $push successful:', pushResult.modifiedCount > 0);
      
      // Verify the result
      const updatedUser = await collection.findOne({ _id: user._id });
      const lastWorkout = updatedUser.workouts[updatedUser.workouts.length - 1];
      console.log('   Last workout type:', typeof lastWorkout);
      console.log('   Last workout is object:', typeof lastWorkout === 'object' && !Array.isArray(lastWorkout));
      
    } catch (directError) {
      console.error('❌ Direct $push failed:', directError.message);
    }
    
    // Test 2: Mongoose with fresh user instance
    console.log('\n🔧 Test 2: Mongoose with fresh user...');
    
    try {
      const User = require('./models/User');
      
      // Create a completely new user for testing
      const testUser = new User({
        email: 'mongoose-test-' + Date.now() + '@example.com',
        fullName: 'Mongoose Test User',
        password: 'testpassword123',
        onboardingCompleted: true
      });
      
      console.log('   New user created');
      console.log('   Workouts field type:', typeof testUser.workouts);
      console.log('   Workouts is array:', Array.isArray(testUser.workouts));
      
      // Initialize workouts if needed
      if (!testUser.workouts) {
        testUser.workouts = [];
        console.log('   Initialized workouts array');
      }
      
      // Add workout
      testUser.workouts.push(simpleWorkout);
      console.log('   Workout added to array');
      console.log('   Array length:', testUser.workouts.length);
      console.log('   First workout type:', typeof testUser.workouts[0]);
      
      // Save
      await testUser.save();
      console.log('✅ Mongoose save successful');
      
      // Clean up
      await User.deleteOne({ _id: testUser._id });
      console.log('🧹 Test user cleaned up');
      
    } catch (mongooseError) {
      console.error('❌ Mongoose test failed:', mongooseError.message);
      
      if (mongooseError.name === 'ValidationError') {
        console.error('🔍 Validation errors:');
        for (const field in mongooseError.errors) {
          const error = mongooseError.errors[field];
          console.error(`   - ${field}: ${error.message}`);
          if (error.name === 'CastError') {
            console.error(`     Cast error - Expected: ${error.kind}, Got: ${typeof error.value}`);
            console.error(`     Value: ${error.value}`);
          }
        }
      }
    }
    
    // Test 3: Check existing user with Mongoose
    console.log('\n🔧 Test 3: Load existing user with Mongoose...');
    
    try {
      const User = require('./models/User');
      const existingUser = await User.findById(user._id);
      
      if (existingUser) {
        console.log('   Existing user loaded');
        console.log('   Workouts field type:', typeof existingUser.workouts);
        console.log('   Workouts is array:', Array.isArray(existingUser.workouts));
        console.log('   Workouts length:', existingUser.workouts ? existingUser.workouts.length : 'N/A');
        
        if (existingUser.workouts && existingUser.workouts.length > 0) {
          const firstWorkout = existingUser.workouts[0];
          console.log('   First workout type:', typeof firstWorkout);
          console.log('   First workout is object:', typeof firstWorkout === 'object' && !Array.isArray(firstWorkout));
        }
      } else {
        console.log('❌ Could not load existing user with Mongoose');
      }
      
    } catch (loadError) {
      console.error('❌ Load existing user failed:', loadError.message);
    }
    
  } catch (error) {
    console.error('❌ Error during simple workout test:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting simple workout test...\n');
  
  await connectDB();
  await testSimpleWorkout();
  
  console.log('\n✅ Simple workout test completed!');
  
  await mongoose.disconnect();
  console.log('📤 Disconnected from MongoDB');
}

// Run the test
main().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});