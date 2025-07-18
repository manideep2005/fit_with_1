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

// Debug specific user data
async function debugUserData() {
  try {
    console.log('🔍 Debugging user data...');
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // Find users with workouts
    const usersWithWorkouts = await collection.find({ 
      workouts: { $exists: true, $ne: [] } 
    }).toArray();
    
    console.log(`📊 Found ${usersWithWorkouts.length} users with workouts`);
    
    for (const user of usersWithWorkouts) {
      console.log(`\n👤 User: ${user.email}`);
      console.log(`📝 Workouts type: ${typeof user.workouts}`);
      console.log(`📝 Workouts is array: ${Array.isArray(user.workouts)}`);
      
      if (user.workouts) {
        console.log(`📝 Workouts length: ${user.workouts.length || 'N/A'}`);
        console.log(`📝 First workout:`, JSON.stringify(user.workouts[0], null, 2));
        
        // Check if any workout is a string
        if (Array.isArray(user.workouts)) {
          for (let i = 0; i < user.workouts.length; i++) {
            if (typeof user.workouts[i] === 'string') {
              console.log(`❌ Workout ${i} is a string:`, user.workouts[i]);
            }
          }
        }
      }
    }
    
    // Also check for any users where workouts field itself is a string
    const usersWithStringWorkouts = await collection.find({ 
      workouts: { $type: "string" } 
    }).toArray();
    
    if (usersWithStringWorkouts.length > 0) {
      console.log(`\n❌ Found ${usersWithStringWorkouts.length} users with string workouts:`);
      for (const user of usersWithStringWorkouts) {
        console.log(`- ${user.email}: ${user.workouts.substring(0, 100)}...`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
    throw error;
  }
}

// Test Mongoose User model
async function testMongooseModel() {
  try {
    console.log('\n🧪 Testing Mongoose User model...');
    
    const User = require('./models/User');
    
    // Try to find a user with workouts using Mongoose
    const users = await User.find({ workouts: { $exists: true } }).limit(1);
    
    if (users.length > 0) {
      console.log(`✅ Successfully loaded user with Mongoose: ${users[0].email}`);
      console.log(`📝 Workouts count: ${users[0].workouts?.length || 0}`);
    } else {
      console.log('ℹ️  No users with workouts found via Mongoose');
    }
    
  } catch (error) {
    console.error('❌ Error testing Mongoose model:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      path: error.path,
      value: error.value?.substring?.(0, 200) + '...' || error.value
    });
  }
}

// Main execution
async function main() {
  try {
    await connectToDatabase();
    await debugUserData();
    await testMongooseModel();
    
    console.log('\n🎉 Debug script completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Debug script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();