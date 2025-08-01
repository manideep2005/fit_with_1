// Clear require cache to ensure fresh schema loading
delete require.cache[require.resolve('./models/User')];

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    // Disconnect if already connected
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Test schema definition
async function testSchemaDefinition() {
  try {
    console.log('🔍 Testing fresh schema definition...\n');
    
    // Load the User model fresh
    const User = require('./models/User');
    
    // Check the schema definition
    const schema = User.schema;
    const workoutsPath = schema.paths.workouts;
    
    console.log('📋 Schema Analysis:');
    console.log(`   Workouts path exists: ${!!workoutsPath}`);
    
    if (workoutsPath) {
      console.log(`   Workouts path type: ${workoutsPath.constructor.name}`);
      console.log(`   Workouts instance: ${workoutsPath.instance}`);
      console.log(`   Workouts schema type: ${workoutsPath.schema ? 'Has schema' : 'No schema'}`);
      
      // Check if it's an array
      if (workoutsPath.schema) {
        console.log(`   Is array schema: true`);
        console.log(`   Array item schema:`, workoutsPath.schema.paths);
      } else {
        console.log(`   Is array schema: false`);
        console.log(`   Path options:`, workoutsPath.options);
      }
    }
    
    // Try to create a new user with workouts
    console.log('\n🧪 Testing user creation with workouts...');
    
    const testUserData = {
      email: 'schema-test@example.com',
      fullName: 'Schema Test User',
      password: 'testpassword123',
      onboardingCompleted: true,
      workouts: [{
        date: new Date(),
        type: 'Schema Test Workout',
        duration: 30,
        calories: 200,
        exercises: [],
        notes: 'Testing schema definition'
      }]
    };
    
    // Create user instance
    const user = new User(testUserData);
    
    console.log(`   User created successfully: ${!!user}`);
    console.log(`   User workouts type: ${typeof user.workouts}`);
    console.log(`   User workouts is array: ${Array.isArray(user.workouts)}`);
    console.log(`   User workouts length: ${user.workouts ? user.workouts.length : 'N/A'}`);
    
    // Try to save
    console.log('\n💾 Attempting to save user...');
    
    try {
      await user.save();
      console.log('✅ User saved successfully!');
      
      // Verify by finding the user
      const savedUser = await User.findOne({ email: 'schema-test@example.com' });
      console.log(`   Saved user workouts length: ${savedUser.workouts ? savedUser.workouts.length : 'N/A'}`);
      
      // Clean up
      await User.deleteOne({ email: 'schema-test@example.com' });
      console.log('🧹 Test user cleaned up');
      
    } catch (saveError) {
      console.error('❌ Save error:', saveError.message);
      
      if (saveError.name === 'CastError') {
        console.error('🎯 Cast error details:');
        console.error('   Path:', saveError.path);
        console.error('   Value type:', typeof saveError.value);
        console.error('   Expected type:', saveError.kind);
        console.error('   Reason:', saveError.reason);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during schema test:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting fresh schema test...\n');
  
  await connectDB();
  await testSchemaDefinition();
  
  console.log('\n✅ Schema test completed!');
  
  await mongoose.disconnect();
  console.log('📤 Disconnected from MongoDB');
}

// Run the test
main().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});