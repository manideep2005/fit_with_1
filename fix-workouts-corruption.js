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

// Fix corrupted workout data
async function fixWorkoutsCorruption() {
  try {
    console.log('🔍 Checking for corrupted workout data...');
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // Find users with string workouts (corrupted data)
    const corruptedUsers = await collection.find({
      workouts: { $type: "string" }
    }).toArray();
    
    console.log(`📊 Found ${corruptedUsers.length} users with corrupted workout data`);
    
    if (corruptedUsers.length === 0) {
      console.log('✅ No corrupted workout data found!');
      return;
    }
    
    let fixedCount = 0;
    
    for (const user of corruptedUsers) {
      try {
        console.log(`🔧 Fixing workouts for user: ${user.email}`);
        
        let workoutsArray = [];
        
        // Try to parse the stringified workouts
        if (typeof user.workouts === 'string') {
          try {
            // Remove any extra formatting and parse
            const cleanedString = user.workouts
              .replace(/\n/g, '')
              .replace(/\s+/g, ' ')
              .trim();
            
            // Try to parse as JSON
            workoutsArray = JSON.parse(cleanedString);
            
            // Validate that it's an array
            if (!Array.isArray(workoutsArray)) {
              console.log(`⚠️  Parsed workouts is not an array for ${user.email}, setting to empty array`);
              workoutsArray = [];
            }
            
            console.log(`✅ Successfully parsed ${workoutsArray.length} workouts for ${user.email}`);
            
          } catch (parseError) {
            console.log(`❌ Failed to parse workouts for ${user.email}:`, parseError.message);
            console.log('🔄 Setting workouts to empty array');
            workoutsArray = [];
          }
        }
        
        // Update the user with the fixed workouts array
        const result = await collection.updateOne(
          { _id: user._id },
          { 
            $set: { 
              workouts: workoutsArray,
              updatedAt: new Date()
            } 
          }
        );
        
        if (result.modifiedCount > 0) {
          fixedCount++;
          console.log(`✅ Fixed workouts for ${user.email} (${workoutsArray.length} workouts restored)`);
        } else {
          console.log(`⚠️  No changes made for ${user.email}`);
        }
        
      } catch (userError) {
        console.error(`❌ Error fixing user ${user.email}:`, userError.message);
      }
    }
    
    console.log(`\n🎉 Fixed workout data for ${fixedCount} out of ${corruptedUsers.length} users`);
    
    // Verify the fix
    console.log('\n🔍 Verifying fixes...');
    const stillCorrupted = await collection.find({
      workouts: { $type: "string" }
    }).toArray();
    
    if (stillCorrupted.length === 0) {
      console.log('✅ All workout data corruption has been fixed!');
    } else {
      console.log(`⚠️  ${stillCorrupted.length} users still have corrupted data`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing workout corruption:', error);
  }
}

// Fix other potential array corruptions
async function fixOtherArrayCorruptions() {
  try {
    console.log('\n🔍 Checking for other array field corruptions...');
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // Check for corrupted biometrics
    const corruptedBiometrics = await collection.find({
      biometrics: { $type: "string" }
    }).toArray();
    
    console.log(`📊 Found ${corruptedBiometrics.length} users with corrupted biometrics data`);
    
    // Check for corrupted nutritionLogs
    const corruptedNutrition = await collection.find({
      nutritionLogs: { $type: "string" }
    }).toArray();
    
    console.log(`📊 Found ${corruptedNutrition.length} users with corrupted nutrition data`);
    
    // Fix biometrics
    for (const user of corruptedBiometrics) {
      try {
        let biometricsArray = [];
        if (typeof user.biometrics === 'string') {
          try {
            biometricsArray = JSON.parse(user.biometrics);
            if (!Array.isArray(biometricsArray)) biometricsArray = [];
          } catch {
            biometricsArray = [];
          }
        }
        
        await collection.updateOne(
          { _id: user._id },
          { $set: { biometrics: biometricsArray } }
        );
        
        console.log(`✅ Fixed biometrics for ${user.email}`);
      } catch (error) {
        console.error(`❌ Error fixing biometrics for ${user.email}:`, error.message);
      }
    }
    
    // Fix nutritionLogs
    for (const user of corruptedNutrition) {
      try {
        let nutritionArray = [];
        if (typeof user.nutritionLogs === 'string') {
          try {
            nutritionArray = JSON.parse(user.nutritionLogs);
            if (!Array.isArray(nutritionArray)) nutritionArray = [];
          } catch {
            nutritionArray = [];
          }
        }
        
        await collection.updateOne(
          { _id: user._id },
          { $set: { nutritionLogs: nutritionArray } }
        );
        
        console.log(`✅ Fixed nutrition logs for ${user.email}`);
      } catch (error) {
        console.error(`❌ Error fixing nutrition logs for ${user.email}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error fixing other array corruptions:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting workout data corruption fix...\n');
  
  await connectDB();
  await fixWorkoutsCorruption();
  await fixOtherArrayCorruptions();
  
  console.log('\n✅ Workout corruption fix completed!');
  console.log('🔄 You can now try adding workouts again.');
  
  await mongoose.disconnect();
  console.log('📤 Disconnected from MongoDB');
}

// Run the fix
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});