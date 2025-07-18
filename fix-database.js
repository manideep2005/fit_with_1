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

// Fix corrupted workout data
async function fixCorruptedData() {
  try {
    console.log('🔧 Starting database repair...');
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // Find all users
    const users = await collection.find({}).toArray();
    console.log(`📊 Found ${users.length} users to check`);
    
    let fixedCount = 0;
    
    for (const user of users) {
      let needsUpdate = false;
      const updates = {};
      
      // Check and fix workouts
      if (user.workouts) {
        if (typeof user.workouts === 'string') {
          console.log(`🔧 Fixing workouts for user: ${user.email}`);
          try {
            // Try to parse the string back to array
            const parsedWorkouts = JSON.parse(user.workouts);
            updates.workouts = Array.isArray(parsedWorkouts) ? parsedWorkouts : [];
            needsUpdate = true;
          } catch (parseError) {
            console.log(`⚠️  Could not parse workouts for ${user.email}, setting to empty array`);
            updates.workouts = [];
            needsUpdate = true;
          }
        } else if (!Array.isArray(user.workouts)) {
          console.log(`🔧 Converting workouts to array for user: ${user.email}`);
          updates.workouts = [];
          needsUpdate = true;
        }
      }
      
      // Check and fix biometrics
      if (user.biometrics) {
        if (typeof user.biometrics === 'string') {
          console.log(`🔧 Fixing biometrics for user: ${user.email}`);
          try {
            const parsedBiometrics = JSON.parse(user.biometrics);
            updates.biometrics = Array.isArray(parsedBiometrics) ? parsedBiometrics : [];
            needsUpdate = true;
          } catch (parseError) {
            console.log(`⚠️  Could not parse biometrics for ${user.email}, setting to empty array`);
            updates.biometrics = [];
            needsUpdate = true;
          }
        } else if (!Array.isArray(user.biometrics)) {
          console.log(`🔧 Converting biometrics to array for user: ${user.email}`);
          updates.biometrics = [];
          needsUpdate = true;
        }
      }
      
      // Check and fix nutritionLogs
      if (user.nutritionLogs) {
        if (typeof user.nutritionLogs === 'string') {
          console.log(`🔧 Fixing nutritionLogs for user: ${user.email}`);
          try {
            const parsedNutrition = JSON.parse(user.nutritionLogs);
            updates.nutritionLogs = Array.isArray(parsedNutrition) ? parsedNutrition : [];
            needsUpdate = true;
          } catch (parseError) {
            console.log(`⚠️  Could not parse nutritionLogs for ${user.email}, setting to empty array`);
            updates.nutritionLogs = [];
            needsUpdate = true;
          }
        } else if (!Array.isArray(user.nutritionLogs)) {
          console.log(`🔧 Converting nutritionLogs to array for user: ${user.email}`);
          updates.nutritionLogs = [];
          needsUpdate = true;
        }
      }
      
      // Check and fix friends
      if (user.friends && !Array.isArray(user.friends)) {
        console.log(`🔧 Fixing friends array for user: ${user.email}`);
        updates.friends = [];
        needsUpdate = true;
      }
      
      // Check and fix challenges
      if (user.challenges && !Array.isArray(user.challenges)) {
        console.log(`🔧 Fixing challenges array for user: ${user.email}`);
        updates.challenges = [];
        needsUpdate = true;
      }
      
      // Apply updates if needed
      if (needsUpdate) {
        await collection.updateOne(
          { _id: user._id },
          { $set: updates }
        );
        fixedCount++;
        console.log(`✅ Fixed data for user: ${user.email}`);
      }
    }
    
    console.log(`🎉 Database repair completed! Fixed ${fixedCount} users.`);
    
  } catch (error) {
    console.error('❌ Error during database repair:', error);
    throw error;
  }
}

// Verify the fix
async function verifyFix() {
  try {
    console.log('🔍 Verifying database repair...');
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    const users = await collection.find({}).toArray();
    let issuesFound = 0;
    
    for (const user of users) {
      // Check if any arrays are still strings
      if (typeof user.workouts === 'string' || 
          typeof user.biometrics === 'string' || 
          typeof user.nutritionLogs === 'string' ||
          typeof user.friends === 'string' ||
          typeof user.challenges === 'string') {
        console.log(`❌ Still has string arrays: ${user.email}`);
        issuesFound++;
      }
    }
    
    if (issuesFound === 0) {
      console.log('✅ All users have properly formatted array data!');
    } else {
      console.log(`⚠️  Found ${issuesFound} users with remaining issues`);
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Main execution
async function main() {
  try {
    await connectToDatabase();
    await fixCorruptedData();
    await verifyFix();
    
    console.log('🎉 Database repair script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database repair script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();