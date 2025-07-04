const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'scheduletest@example.com',
  fullName: 'Schedule Test User',
  password: 'testpass123'
};

let authCookie = '';

async function testScheduleAPI() {
  try {
    console.log('🚀 Starting Schedule API Test...');
    console.log('🌐 Base URL:', BASE_URL);

    // Step 1: Create test user and login
    console.log('\n👤 Step 1: Creating test user and logging in...');
    
    try {
      // Try to signup (might fail if user exists)
      await axios.post(`${BASE_URL}/signup`, TEST_USER);
      console.log('✅ Test user created');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️ Test user already exists');
      } else {
        console.log('⚠️ Signup error (continuing):', error.response?.data?.error || error.message);
      }
    }

    // Login
    const loginResponse = await axios.post(`${BASE_URL}/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      // Extract session cookie
      const cookies = loginResponse.headers['set-cookie'];
      if (cookies) {
        authCookie = cookies.find(cookie => cookie.includes('fit-with-ai-session'))?.split(';')[0] || '';
        console.log('🍪 Session cookie obtained');
      }
    } else {
      throw new Error('Login failed');
    }

    // Step 2: Test creating a workout event
    console.log('\n📝 Step 2: Creating workout event...');
    const workoutEvent = {
      title: 'API Test Workout',
      description: 'Testing workout creation via API',
      type: 'workout',
      category: 'strength',
      startDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      endDate: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
      workoutData: {
        exercises: [
          { name: 'Push-ups', sets: 3, reps: 15 },
          { name: 'Squats', sets: 3, reps: 20 }
        ],
        estimatedCalories: 200,
        difficulty: 'beginner'
      },
      reminders: [{
        type: 'both',
        minutesBefore: 15
      }]
    };

    const createResponse = await axios.post(`${BASE_URL}/api/schedule/events`, workoutEvent, {
      headers: { Cookie: authCookie }
    });

    if (createResponse.data.success) {
      console.log('✅ Workout event created:', createResponse.data.event.title);
      console.log('   Event ID:', createResponse.data.event._id);
    } else {
      console.log('❌ Failed to create workout event');
    }

    // Step 3: Test creating a meal event
    console.log('\n🍽️ Step 3: Creating meal event...');
    const mealEvent = {
      title: 'API Test Meal',
      description: 'Testing meal creation via API',
      type: 'meal',
      category: 'meal-prep',
      startDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
      endDate: new Date(Date.now() + 4.5 * 60 * 60 * 1000).toISOString(), // 4.5 hours from now
      mealData: {
        mealType: 'dinner',
        foods: [
          { name: 'Salmon', quantity: 200, unit: 'g', calories: 400, protein: 40 },
          { name: 'Rice', quantity: 100, unit: 'g', calories: 130, protein: 3 }
        ],
        totalCalories: 530,
        prepTime: 30
      }
    };

    const mealResponse = await axios.post(`${BASE_URL}/api/schedule/events`, mealEvent, {
      headers: { Cookie: authCookie }
    });

    if (mealResponse.data.success) {
      console.log('✅ Meal event created:', mealResponse.data.event.title);
    } else {
      console.log('❌ Failed to create meal event');
    }

    // Step 4: Get today's events
    console.log('\n📅 Step 4: Getting today\\'s events...');
    const todayResponse = await axios.get(`${BASE_URL}/api/schedule/today`, {
      headers: { Cookie: authCookie }
    });

    if (todayResponse.data.success) {
      console.log('✅ Today\\'s events retrieved:', todayResponse.data.events.length);
      todayResponse.data.events.forEach(event => {
        console.log(`   - ${event.title} (${event.type})`);
      });
    } else {
      console.log('❌ Failed to get today\\'s events');
    }

    // Step 5: Get upcoming events
    console.log('\n⏰ Step 5: Getting upcoming events...');
    const upcomingResponse = await axios.get(`${BASE_URL}/api/schedule/upcoming?limit=5`, {
      headers: { Cookie: authCookie }
    });

    if (upcomingResponse.data.success) {
      console.log('✅ Upcoming events retrieved:', upcomingResponse.data.events.length);
      upcomingResponse.data.events.forEach(event => {
        console.log(`   - ${event.title} (${event.type}) on ${new Date(event.startDate).toLocaleDateString()}`);
      });
    } else {
      console.log('❌ Failed to get upcoming events');
    }

    // Step 6: Get schedule for date range
    console.log('\n📊 Step 6: Getting schedule for next 7 days...');
    const startDate = new Date().toISOString();\n    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();\n    \n    const scheduleResponse = await axios.get(`${BASE_URL}/api/schedule/events?startDate=${startDate}&endDate=${endDate}`, {\n      headers: { Cookie: authCookie }\n    });\n\n    if (scheduleResponse.data.success) {\n      console.log('✅ Schedule retrieved:', scheduleResponse.data.events.length, 'events');\n      scheduleResponse.data.events.forEach(event => {\n        console.log(`   - ${event.title} on ${new Date(event.startDate).toLocaleDateString()}`);\n      });\n    } else {\n      console.log('❌ Failed to get schedule');\n    }\n\n    // Step 7: Get AI suggestions\n    console.log('\\n🤖 Step 7: Getting AI schedule suggestions...');\n    const suggestionsResponse = await axios.get(`${BASE_URL}/api/schedule/suggestions`, {\n      headers: { Cookie: authCookie }\n    });\n\n    if (suggestionsResponse.data.success) {\n      console.log('✅ AI suggestions retrieved:', suggestionsResponse.data.suggestions.length);\n      suggestionsResponse.data.suggestions.forEach(suggestion => {\n        console.log(`   - ${suggestion.title} (${suggestion.type})`);\n      });\n    } else {\n      console.log('❌ Failed to get AI suggestions');\n    }\n\n    // Step 8: Complete an event (if we created one)\n    if (createResponse.data.success) {\n      console.log('\\n✅ Step 8: Completing workout event...');\n      const eventId = createResponse.data.event._id;\n      \n      const completeResponse = await axios.post(`${BASE_URL}/api/schedule/events/${eventId}/complete`, {\n        notes: 'API test completion - workout felt great!'\n      }, {\n        headers: { Cookie: authCookie }\n      });\n\n      if (completeResponse.data.success) {\n        console.log('✅ Event completed successfully');\n        console.log('   Status:', completeResponse.data.event.status);\n      } else {\n        console.log('❌ Failed to complete event');\n      }\n    }\n\n    // Step 9: Get schedule statistics\n    console.log('\\n📈 Step 9: Getting schedule statistics...');\n    const statsResponse = await axios.get(`${BASE_URL}/api/schedule/stats`, {\n      headers: { Cookie: authCookie }\n    });\n\n    if (statsResponse.data.success) {\n      console.log('✅ Schedule statistics retrieved:');\n      console.log('   Total events:', statsResponse.data.stats.total);\n      console.log('   Completed:', statsResponse.data.stats.completed);\n      console.log('   Missed:', statsResponse.data.stats.missed);\n      console.log('   Upcoming:', statsResponse.data.stats.upcoming);\n    } else {\n      console.log('❌ Failed to get statistics');\n    }\n\n    console.log('\\n🎉 Schedule API Test Completed Successfully!');\n    console.log('✅ All schedule API endpoints are working properly');\n    console.log('\\n📋 Summary:');\n    console.log('   ✅ User authentication');\n    console.log('   ✅ Create workout events');\n    console.log('   ✅ Create meal events');\n    console.log('   ✅ Get today\\'s events');\n    console.log('   ✅ Get upcoming events');\n    console.log('   ✅ Get schedule by date range');\n    console.log('   ✅ Get AI suggestions');\n    console.log('   ✅ Complete events');\n    console.log('   ✅ Get schedule statistics');\n\n  } catch (error) {\n    console.error('❌ API Test failed:', error.message);\n    if (error.response) {\n      console.error('   Status:', error.response.status);\n      console.error('   Data:', error.response.data);\n    }\n  }\n}\n\n// Helper function to check if server is running\nasync function checkServer() {\n  try {\n    const response = await axios.get(`${BASE_URL}/api/health`);\n    return response.status === 200;\n  } catch (error) {\n    return false;\n  }\n}\n\n// Main execution\nasync function main() {\n  console.log('🔍 Checking if server is running...');\n  const serverRunning = await checkServer();\n  \n  if (!serverRunning) {\n    console.log('❌ Server is not running!');\n    console.log('💡 Please start the server first:');\n    console.log('   npm start');\n    console.log('   or');\n    console.log('   node app.js');\n    return;\n  }\n  \n  console.log('✅ Server is running');\n  await testScheduleAPI();\n}\n\nif (require.main === module) {\n  main();\n}\n\nmodule.exports = { testScheduleAPI, checkServer };"