const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function fixData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Fix users with invalid enum values
    await User.updateMany(
      { 'healthInfo.smokingStatus': { $nin: ['never', 'former', 'current', 'occasional'] } },
      { $set: { 'healthInfo.smokingStatus': 'never' } }
    );

    await User.updateMany(
      { 'healthInfo.alcoholConsumption': { $nin: ['none', 'occasional', 'moderate', 'frequent', 'never', 'moderately'] } },
      { $set: { 'healthInfo.alcoholConsumption': 'none' } }
    );

    // Initialize gamification for users who don't have it
    await User.updateMany(
      { gamification: { $exists: false } },
      { 
        $set: { 
          gamification: {
            totalXP: 0,
            currentLevel: 1,
            streaks: {
              workout: { current: 0, longest: 0, lastWorkoutDate: null },
              nutrition: { current: 0, longest: 0, lastLogDate: null },
              login: { current: 0, longest: 0, lastLoginDate: null }
            }
          }
        }
      }
    );

    console.log('✅ Data cleanup completed');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixData();