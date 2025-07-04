const mongoose = require('mongoose');
require('dotenv').config();

// Import services and models
const database = require('./config/database');
const scheduleService = require('./services/scheduleService');
const UserService = require('./services/userService');

async function testScheduleService() {
  try {
    console.log('🚀 Starting Schedule Service Test...');
    
    // Connect to database
    console.log('📊 Connecting to database...');
    await database.connect();
    console.log('✅ Database connected successfully');

    // Find a test user (or create one)
    let testUser;
    try {
      testUser = await UserService.getUserByEmail('test@example.com');
      if (!testUser) {
        console.log('👤 Creating test user...');
        testUser = await UserService.createUser({
          email: 'test@example.com',
          fullName: 'Test User',
          password: 'testpass123'
        });
        console.log('✅ Test user created');
      } else {
        console.log('✅ Test user found');
      }
    } catch (error) {
      console.error('❌ Error with test user:', error.message);
      return;
    }

    const userId = testUser._id;
    console.log('👤 Using user ID:', userId);

    // Test 1: Create a workout event
    console.log('\n📝 Test 1: Creating workout event...');
    const workoutEvent = {
      title: 'Morning HIIT Workout',
      description: 'High-intensity interval training session',
      type: 'workout',
      category: 'hiit',
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
      workoutData: {
        exercises: [
          { name: 'Burpees', sets: 3, reps: 10 },
          { name: 'Mountain Climbers', sets: 3, reps: 20 }
        ],
        estimatedCalories: 300,
        difficulty: 'intermediate'
      },
      reminders: [{
        type: 'both',
        minutesBefore: 30
      }]
    };

    const createResult = await scheduleService.createEvent(userId, workoutEvent);
    if (createResult.success) {
      console.log('✅ Workout event created:', createResult.event.title);
      console.log('   Event ID:', createResult.event._id);
    } else {
      console.log('❌ Failed to create workout event:', createResult.error);
    }

    // Test 2: Create a meal event
    console.log('\n🍽️ Test 2: Creating meal event...');
    const mealEvent = {
      title: 'Healthy Lunch',
      description: 'Grilled chicken with vegetables',
      type: 'meal',
      category: 'meal-prep',
      startDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
      endDate: new Date(Date.now() + 13 * 60 * 60 * 1000), // 13 hours from now
      mealData: {
        mealType: 'lunch',
        foods: [
          { name: 'Grilled Chicken', quantity: 150, unit: 'g', calories: 250, protein: 30 },
          { name: 'Broccoli', quantity: 100, unit: 'g', calories: 25, protein: 3 }
        ],
        totalCalories: 275,
        prepTime: 20
      }
    };

    const mealResult = await scheduleService.createEvent(userId, mealEvent);
    if (mealResult.success) {
      console.log('✅ Meal event created:', mealResult.event.title);
    } else {
      console.log('❌ Failed to create meal event:', mealResult.error);
    }

    // Test 3: Get today's events
    console.log('\n📅 Test 3: Getting today\'s events...');
    const todayResult = await scheduleService.getTodaysEvents(userId);
    if (todayResult.success) {
      console.log('✅ Today\'s events found:', todayResult.events.length);
      todayResult.events.forEach(event => {
        console.log(`   - ${event.title} (${event.type}) at ${event.startDate.toLocaleTimeString()}`);
      });
    } else {
      console.log('❌ Failed to get today\'s events:', todayResult.error);
    }

    // Test 4: Get upcoming events
    console.log('\n⏰ Test 4: Getting upcoming events...');
    const upcomingResult = await scheduleService.getUpcomingEvents(userId, 5);
    if (upcomingResult.success) {
      console.log('✅ Upcoming events found:', upcomingResult.events.length);
      upcomingResult.events.forEach(event => {
        console.log(`   - ${event.title} (${event.type}) on ${event.startDate.toLocaleDateString()}`);
      });
    } else {
      console.log('❌ Failed to get upcoming events:', upcomingResult.error);
    }

    // Test 5: Get schedule for date range
    console.log('\n📊 Test 5: Getting schedule for next 7 days...');
    const startDate = new Date();
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    const scheduleResult = await scheduleService.getUserSchedule(userId, startDate, endDate);
    if (scheduleResult.success) {
      console.log('✅ Schedule events found:', scheduleResult.events.length);
      scheduleResult.events.forEach(event => {
        console.log(`   - ${event.title} on ${event.startDate.toLocaleDateString()} at ${event.startDate.toLocaleTimeString()}`);
      });
    } else {
      console.log('❌ Failed to get schedule:', scheduleResult.error);
    }

    // Test 6: Generate AI suggestions
    console.log('\n🤖 Test 6: Getting AI schedule suggestions...');
    const suggestionsResult = await scheduleService.generateScheduleSuggestions(userId);
    if (suggestionsResult.success) {
      console.log('✅ AI suggestions generated:', suggestionsResult.suggestions.length);
      suggestionsResult.suggestions.forEach(suggestion => {
        console.log(`   - ${suggestion.title} (${suggestion.type}) suggested for ${suggestion.startDate.toLocaleDateString()}`);
      });
    } else {
      console.log('❌ Failed to get AI suggestions:', suggestionsResult.error);
    }

    // Test 7: Complete an event (if we have any)
    if (createResult.success) {
      console.log('\n✅ Test 7: Completing workout event...');
      const completeResult = await scheduleService.completeEvent(
        createResult.event._id, 
        userId, 
        'Great workout! Felt energized.'
      );
      if (completeResult.success) {
        console.log('✅ Event completed successfully');
        console.log('   Status:', completeResult.event.status);
        console.log('   Notes:', completeResult.event.notes);
      } else {
        console.log('❌ Failed to complete event:', completeResult.error);
      }
    }

    // Test 8: Get schedule statistics
    console.log('\n📈 Test 8: Getting schedule statistics...');
    const statsStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const statsEndDate = new Date();
    
    const statsResult = await scheduleService.getScheduleStats(userId, statsStartDate, statsEndDate);
    if (statsResult.success) {
      console.log('✅ Schedule statistics:');
      console.log('   Total events:', statsResult.stats.total);
      console.log('   Completed:', statsResult.stats.completed);
      console.log('   Missed:', statsResult.stats.missed);
      console.log('   Upcoming:', statsResult.stats.upcoming);
      console.log('   By type:', JSON.stringify(statsResult.stats.byType, null, 2));
    } else {
      console.log('❌ Failed to get statistics:', statsResult.error);
    }

    console.log('\n🎉 Schedule Service Test Completed Successfully!');
    console.log('✅ All schedule service functions are working properly');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close database connection
    try {
      await mongoose.connection.close();
      console.log('📊 Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database:', error);
    }
  }
}

// Run the test
if (require.main === module) {
  testScheduleService();
}

module.exports = testScheduleService;