const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const streakService = require('./services/streakService');

async function testStreakSystem() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Find a test user (you can replace with your email)
    const testEmail = 'test@example.com'; // Replace with your email
    let user = await User.findOne({ email: testEmail });

    if (!user) {
      console.log('Creating test user...');
      user = new User({
        email: testEmail,
        fullName: 'Test User',
        password: 'password123',
        onboardingCompleted: true
      });
      await user.save();
    }

    console.log('Test user found:', user.email);

    // Add some test workout data
    console.log('Adding test workout...');
    user.workouts.push({
      date: new Date(),
      type: 'Strength Training',
      duration: 45,
      calories: 300,
      exercises: [{ name: 'Push-ups', sets: 3, reps: 15 }]
    });

    // Add some test nutrition data
    console.log('Adding test nutrition...');
    user.nutritionLogs.push({
      date: new Date(),
      meals: [{
        type: 'breakfast',
        foods: [{ name: 'Oatmeal', calories: 150, protein: 5 }]
      }],
      totalCalories: 150,
      totalProtein: 5,
      waterIntake: 500
    });

    await user.save();

    // Test streak calculation
    console.log('Testing streak calculation...');
    const streaks = await streakService.updateUserStreaks(user._id);
    console.log('Updated streaks:', streaks);

    // Get streak status
    const streakStatus = await streakService.getStreakStatus(user._id);
    console.log('Streak status:', JSON.stringify(streakStatus, null, 2));

    // Test streak leaderboard
    const leaderboard = await streakService.getStreakLeaderboard('workout', 5);
    console.log('Workout streak leaderboard:', leaderboard);

    console.log('✅ Streak system test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testStreakSystem();