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

// Test Mongoose save operation
async function testMongooseSave() {
  try {
    console.log('🧪 Testing Mongoose save operation...\n');
    
    // Load the User model
    const User = require('./models/User');
    
    // Find a user with existing workouts
    const user = await User.findOne({ 
      $and: [
        { workouts: { $exists: true } },
        { workouts: { $ne: [] } }
      ]
    });
    
    if (!user) {
      console.log('❌ No user found with existing workouts');
      return;
    }
    
    console.log(`🎯 Testing with user: ${user.email}`);
    console.log(`   User ID: ${user._id}`);
    console.log(`   Workouts field exists: ${user.workouts !== undefined}`);
    console.log(`   Workouts type: ${typeof user.workouts}`);
    console.log(`   Workouts is array: ${Array.isArray(user.workouts)}`);
    
    if (user.workouts) {
      console.log(`   Workouts length: ${user.workouts.length}`);
      if (user.workouts.length > 0) {
        console.log(`   First workout:`, user.workouts[0]);
      }
    }
    
    // Try to add a new workout
    const testWorkout = {
      date: new Date(),
      type: 'Mongoose Save Test',
      duration: 20,
      calories: 100,
      exercises: [],
      notes: 'Testing Mongoose save operation'
    };
    
    console.log('\n🔧 Adding test workout...');
    
    // Initialize workouts array if undefined
    if (!user.workouts) {
      console.log('⚠️  Workouts field is undefined, initializing as empty array');
      user.workouts = [];
    }
    
    // Add the workout
    user.workouts.push(testWorkout);
    console.log(`✅ Workout added to array (new length: ${user.workouts.length})`);
    
    // Try to save
    console.log('\n💾 Attempting to save user...');
    
    try {
      await user.save();
      console.log('✅ User saved successfully!');
      
      // Verify the save
      const savedUser = await User.findById(user._id);
      console.log(`   Verified workouts length: ${savedUser.workouts ? savedUser.workouts.length : 'undefined'}`);
      
    } catch (saveError) {
      console.error('❌ Save error occurred:');
      console.error('   Error name:', saveError.name);
      console.error('   Error message:', saveError.message);
      
      if (saveError.name === 'ValidationError') {
        console.error('🔍 Validation errors:');
        for (const field in saveError.errors) {
          console.error(`   - ${field}: ${saveError.errors[field].message}`);
        }
      }
      
      if (saveError.name === 'CastError') {
        console.error('🎯 Cast error details:');
        console.error('   Path:', saveError.path);
        console.error('   Value:', saveError.value);
        console.error('   Kind:', saveError.kind);
        console.error('   Reason:', saveError.reason);
      }
      
      // Check if it's the specific workouts error
      if (saveError.message && saveError.message.includes('workouts')) {
        console.error('🚨 This is the workouts error we\'re looking for!');
        
        // Let's examine the actual workouts data
        console.error('🔍 Examining workouts data:');
        console.error('   Type:', typeof user.workouts);
        console.error('   Is Array:', Array.isArray(user.workouts));
        console.error('   Value:', user.workouts);
        
        if (Array.isArray(user.workouts)) {
          console.error('   Array length:', user.workouts.length);
          user.workouts.forEach((workout, index) => {
            console.error(`   Workout ${index}:`, typeof workout, workout);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Test direct database operations vs Mongoose
async function testDirectVsMongoose() {
  try {
    console.log('\n🔄 Comparing direct DB operations vs Mongoose...\n');
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    const User = require('./models/User');
    
    // Find a user
    const directUser = await collection.findOne({ 
      workouts: { $exists: true, $ne: [] }
    });
    
    if (!directUser) {
      console.log('❌ No user found for comparison');
      return;
    }
    
    console.log(`🎯 Comparing user: ${directUser.email}`);
    
    // Direct database query
    console.log('\n📊 Direct database query:');
    console.log(`   Workouts type: ${typeof directUser.workouts}`);
    console.log(`   Workouts is array: ${Array.isArray(directUser.workouts)}`);
    console.log(`   Workouts length: ${directUser.workouts ? directUser.workouts.length : 'N/A'}`);
    
    // Mongoose query
    console.log('\n📊 Mongoose query:');
    const mongooseUser = await User.findById(directUser._id);
    console.log(`   Workouts type: ${typeof mongooseUser.workouts}`);
    console.log(`   Workouts is array: ${Array.isArray(mongooseUser.workouts)}`);
    console.log(`   Workouts length: ${mongooseUser.workouts ? mongooseUser.workouts.length : 'N/A'}`);
    
    // Check if there's a difference
    if (typeof directUser.workouts !== typeof mongooseUser.workouts) {
      console.log('🚨 TYPE MISMATCH DETECTED!');
      console.log(`   Direct: ${typeof directUser.workouts}`);
      console.log(`   Mongoose: ${typeof mongooseUser.workouts}`);
    }
    
  } catch (error) {
    console.error('❌ Error during comparison:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Mongoose save test...\n');
  
  await connectDB();
  await testMongooseSave();
  await testDirectVsMongoose();
  
  console.log('\n✅ Test completed!');
  
  await mongoose.disconnect();
  console.log('📤 Disconnected from MongoDB');
}

// Run the test
main().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});