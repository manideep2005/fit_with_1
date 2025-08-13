const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function setupStreak() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Find your user (replace with your email)
    const userEmail = 'manideep.gonugunta1802@gmail.com'; // Your actual email
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      console.log('User not found. Please check the email address.');
      return;
    }

    console.log('Found user:', user.email);

    // Initialize gamification if not exists
    if (!user.gamification) {
      user.gamification = {};
    }

    // Set up 20-day streaks
    const today = new Date();
    user.gamification.streaks = {
      workout: {
        current: 20,
        longest: 20,
        lastWorkoutDate: today
      },
      nutrition: {
        current: 20,
        longest: 20,
        lastLogDate: today
      },
      login: {
        current: 20,
        longest: 20,
        lastLoginDate: today
      }
    };

    // Add some workout history for the past 20 days
    user.workouts = user.workouts || [];
    for (let i = 19; i >= 0; i--) {
      const workoutDate = new Date();
      workoutDate.setDate(workoutDate.getDate() - i);
      
      user.workouts.push({
        date: workoutDate,
        type: 'Strength Training',
        duration: 45,
        calories: 300,
        exercises: [{ name: 'Push-ups', sets: 3, reps: 15 }],
        notes: `Day ${20-i} of streak`
      });
    }

    // Add some nutrition history for the past 20 days
    user.nutritionLogs = user.nutritionLogs || [];
    for (let i = 19; i >= 0; i--) {
      const logDate = new Date();
      logDate.setDate(logDate.getDate() - i);
      
      user.nutritionLogs.push({
        date: logDate,
        meals: [{
          type: 'breakfast',
          foods: [{ name: 'Oatmeal', calories: 150, protein: 5 }]
        }],
        totalCalories: 1800,
        totalProtein: 120,
        waterIntake: 2000
      });
    }

    await user.save({ validateBeforeSave: false });
    console.log('✅ Successfully set up 20-day streak for', user.email);
    console.log('Streaks:', user.gamification.streaks);

  } catch (error) {
    console.error('❌ Error setting up streak:', error);
  } finally {
    await mongoose.disconnect();
  }
}

setupStreak();