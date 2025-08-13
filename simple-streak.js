const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function setupSimpleStreak() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    const userEmail = 'manideep.gonugunta1802@gmail.com';
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('Found user:', user.email);

    // Just update the streak data directly
    const today = new Date();
    
    const updateData = {
      'gamification.streaks.workout.current': 20,
      'gamification.streaks.workout.longest': 20,
      'gamification.streaks.workout.lastWorkoutDate': today,
      'gamification.streaks.nutrition.current': 20,
      'gamification.streaks.nutrition.longest': 20,
      'gamification.streaks.nutrition.lastLogDate': today,
      'gamification.streaks.login.current': 20,
      'gamification.streaks.login.longest': 20,
      'gamification.streaks.login.lastLoginDate': today
    };

    await User.updateOne({ email: userEmail }, { $set: updateData });
    
    console.log('✅ Successfully set up 20-day streak!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

setupSimpleStreak();