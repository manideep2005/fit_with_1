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

// Diagnose workout data issues
async function diagnoseWorkoutIssues() {
  try {
    console.log('🔍 Diagnosing workout data issues...\n');
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // Get all users and check their workout data types
    const users = await collection.find({}).toArray();
    console.log(`📊 Found ${users.length} total users`);
    
    let usersWithWorkouts = 0;
    let usersWithStringWorkouts = 0;
    let usersWithArrayWorkouts = 0;
    let usersWithNoWorkouts = 0;
    
    for (const user of users) {
      if (user.workouts) {
        usersWithWorkouts++;
        
        if (typeof user.workouts === 'string') {
          usersWithStringWorkouts++;
          console.log(`⚠️  User ${user.email} has STRING workouts:`, user.workouts.substring(0, 100) + '...');
        } else if (Array.isArray(user.workouts)) {
          usersWithArrayWorkouts++;
          console.log(`✅ User ${user.email} has ARRAY workouts (${user.workouts.length} items)`);
        } else {
          console.log(`❓ User ${user.email} has UNKNOWN workouts type:`, typeof user.workouts);
        }
      } else {
        usersWithNoWorkouts++;
      }
    }
    
    console.log('\n📈 Summary:');
    console.log(`   - Users with workouts: ${usersWithWorkouts}`);
    console.log(`   - Users with STRING workouts: ${usersWithStringWorkouts}`);
    console.log(`   - Users with ARRAY workouts: ${usersWithArrayWorkouts}`);
    console.log(`   - Users with NO workouts: ${usersWithNoWorkouts}`);
    
    // Test adding a workout using direct MongoDB operations
    console.log('\n🧪 Testing workout addition...');
    
    // Find a test user (or create one)
    let testUser = await collection.findOne({ email: { $regex: 'test', $options: 'i' } });
    
    if (!testUser) {
      console.log('📝 No test user found, creating one...');
      const testUserData = {
        email: 'workout-test@example.com',
        fullName: 'Workout Test User',
        password: 'hashedpassword',
        onboardingCompleted: true,
        workouts: [],
        biometrics: [],
        nutritionLogs: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const insertResult = await collection.insertOne(testUserData);
      testUser = await collection.findOne({ _id: insertResult.insertedId });
      console.log('✅ Created test user:', testUser.email);
    }
    
    console.log(`🎯 Using test user: ${testUser.email}`);
    console.log(`   Current workouts type: ${typeof testUser.workouts}`);
    console.log(`   Current workouts value:`, testUser.workouts);
    
    // Test adding a workout
    const testWorkout = {
      date: new Date(),
      type: 'Diagnostic Test Workout',
      duration: 30,
      calories: 200,
      exercises: [],
      notes: 'This is a test workout to diagnose the issue'
    };
    
    console.log('\n🔧 Attempting to add workout using $push...');
    
    try {
      const pushResult = await collection.updateOne(
        { _id: testUser._id },
        { $push: { workouts: testWorkout } }
      );
      
      console.log('✅ $push operation result:', pushResult);
      
      // Check the result
      const updatedUser = await collection.findOne({ _id: testUser._id });
      console.log(`   Updated workouts type: ${typeof updatedUser.workouts}`);
      console.log(`   Updated workouts length: ${Array.isArray(updatedUser.workouts) ? updatedUser.workouts.length : 'N/A'}`);
      
      if (typeof updatedUser.workouts === 'string') {
        console.log('❌ PROBLEM DETECTED: Workouts became a string!');
        console.log('   String value:', updatedUser.workouts.substring(0, 200) + '...');
      } else if (Array.isArray(updatedUser.workouts)) {
        console.log('✅ Workouts remained as array');
        console.log('   Last workout:', updatedUser.workouts[updatedUser.workouts.length - 1]);
      }
      
    } catch (error) {
      console.error('❌ Error during $push operation:', error.message);
    }
    
    // Test using Mongoose model
    console.log('\n🧪 Testing with Mongoose model...');
    
    try {
      // Load the User model
      const User = require('./models/User');
      
      const mongooseUser = await User.findById(testUser._id);
      if (mongooseUser) {
        console.log(`📋 Mongoose user found: ${mongooseUser.email}`);
        console.log(`   Workouts type: ${typeof mongooseUser.workouts}`);
        console.log(`   Workouts length: ${Array.isArray(mongooseUser.workouts) ? mongooseUser.workouts.length : 'N/A'}`);
        
        // Try to add a workout using Mongoose
        const mongooseTestWorkout = {
          date: new Date(),
          type: 'Mongoose Test Workout',
          duration: 25,
          calories: 150,
          exercises: [],
          notes: 'This is a Mongoose test workout'
        };
        
        mongooseUser.workouts.push(mongooseTestWorkout);
        
        console.log('🔧 Attempting to save with Mongoose...');
        await mongooseUser.save();
        
        console.log('✅ Mongoose save successful');
        console.log(`   Final workouts length: ${mongooseUser.workouts.length}`);
        
      } else {
        console.log('❌ Could not find user with Mongoose');
      }
      
    } catch (mongooseError) {
      console.error('❌ Mongoose error:', mongooseError.message);
      if (mongooseError.name === 'CastError') {
        console.error('🎯 CAST ERROR DETECTED - This is the issue!');
        console.error('   Error details:', mongooseError);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting workout issue diagnosis...\n');
  
  await connectDB();
  await diagnoseWorkoutIssues();
  
  console.log('\n✅ Diagnosis completed!');
  
  await mongoose.disconnect();
  console.log('📤 Disconnected from MongoDB');
}

// Run the diagnosis
main().catch(error => {
  console.error('❌ Diagnosis failed:', error);
  process.exit(1);
});