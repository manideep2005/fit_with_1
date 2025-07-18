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

// Test specific user operations
async function testUserOperations() {
  try {
    console.log('🧪 Testing user operations...');
    
    const User = require('./models/User');
    
    // Test finding users one by one
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    const allUsers = await collection.find({}).toArray();
    
    console.log(`📊 Testing ${allUsers.length} users individually...`);
    
    for (const userData of allUsers) {
      try {
        console.log(`\n👤 Testing user: ${userData.email}`);
        
        // Try to load this specific user with Mongoose
        const user = await User.findById(userData._id);
        
        if (user) {
          console.log(`✅ Successfully loaded: ${user.email}`);
          console.log(`📝 Workouts: ${user.workouts?.length || 0}`);
          console.log(`📝 Biometrics: ${user.biometrics?.length || 0}`);
          console.log(`📝 Nutrition logs: ${user.nutritionLogs?.length || 0}`);
        } else {
          console.log(`⚠️  User not found: ${userData.email}`);
        }
        
      } catch (error) {
        console.error(`❌ Error loading user ${userData.email}:`, {
          message: error.message,
          name: error.name,
          path: error.path,
          kind: error.kind
        });
        
        // If this is the problematic user, let's examine their data
        if (error.message.includes('Cast to [string] failed')) {
          console.log(`🔍 Examining problematic user data:`, {
            email: userData.email,
            workoutsType: typeof userData.workouts,
            workoutsIsArray: Array.isArray(userData.workouts),
            workoutsValue: userData.workouts,
            biometricsType: typeof userData.biometrics,
            nutritionLogsType: typeof userData.nutritionLogs
          });
          
          // Try to fix this specific user
          console.log(`🔧 Attempting to fix user: ${userData.email}`);
          await collection.updateOne(
            { _id: userData._id },
            { 
              $set: {
                workouts: Array.isArray(userData.workouts) ? userData.workouts : [],
                biometrics: Array.isArray(userData.biometrics) ? userData.biometrics : [],
                nutritionLogs: Array.isArray(userData.nutritionLogs) ? userData.nutritionLogs : [],
                friends: Array.isArray(userData.friends) ? userData.friends : [],
                challenges: Array.isArray(userData.challenges) ? userData.challenges : []
              }
            }
          );
          console.log(`✅ Fixed user: ${userData.email}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error during user operations test:', error);
    throw error;
  }
}

// Test UserService operations
async function testUserService() {
  try {
    console.log('\n🧪 Testing UserService operations...');
    
    const UserService = require('./services/userService');
    
    // Test getting a user by email
    const testEmail = 'manideep.gonugunta1802@gmail.com'; // User we know has workouts
    
    console.log(`📧 Testing getUserByEmail for: ${testEmail}`);
    const user = await UserService.getUserByEmail(testEmail);
    
    if (user) {
      console.log(`✅ Successfully got user via UserService: ${user.email}`);
      console.log(`📝 Workouts: ${user.workouts?.length || 0}`);
    } else {
      console.log(`⚠️  User not found via UserService`);
    }
    
  } catch (error) {
    console.error('❌ Error testing UserService:', error);
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
    await testUserOperations();
    await testUserService();
    
    console.log('\n🎉 Test completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the script
main();