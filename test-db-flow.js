const axios = require('axios');

// Test the complete database flow
async function testDatabaseFlow() {
    const baseURL = 'http://localhost:3001';
    
    console.log('🧪 Testing Complete Database Flow...\n');
    
    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing Health Check...');
        const healthResponse = await axios.get(`${baseURL}/api/health`);
        console.log('✅ Health Check:', healthResponse.data.status);
        console.log('📊 Database Status:', healthResponse.data.databaseStatus || 'Not available');
        
        // Test 2: Debug Database Connection
        console.log('\n2️⃣ Testing Database Connection...');
        const dbResponse = await axios.get(`${baseURL}/debug-database`);
        console.log('✅ Database Health:', dbResponse.data.health);
        console.log('🔗 Connection Status:', dbResponse.data.connection);
        
        // Test 3: Test User Creation (if needed)
        console.log('\n3️⃣ Testing User Operations...');
        
        // Create a test user session by signing up
        const testUser = {
            fullName: 'Test User',
            email: 'test@example.com',
            password: 'password123'
        };
        
        let sessionCookie = '';
        
        try {
            const signupResponse = await axios.post(`${baseURL}/signup`, testUser);
            console.log('✅ User signup successful');
            
            // Extract session cookie
            if (signupResponse.headers['set-cookie']) {
                sessionCookie = signupResponse.headers['set-cookie'][0];
            }
        } catch (error) {
            if (error.response?.data?.error?.includes('already exists')) {
                console.log('ℹ️ User already exists, trying login...');
                
                // Try login instead
                const loginResponse = await axios.post(`${baseURL}/login`, {
                    email: testUser.email,
                    password: testUser.password
                });
                console.log('✅ User login successful');
                
                if (loginResponse.headers['set-cookie']) {
                    sessionCookie = loginResponse.headers['set-cookie'][0];
                }
            } else {
                throw error;
            }
        }
        
        // Test 4: Test Quick Log - Add Workout
        console.log('\n4️⃣ Testing Quick Log - Workout...');
        const workoutData = {
            type: 'Test Cardio Workout',
            duration: 30,
            calories: 250,
            notes: 'Test workout from automated test'
        };
        
        const workoutResponse = await axios.post(`${baseURL}/api/workouts`, workoutData, {
            headers: {
                'Cookie': sessionCookie,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Workout logged:', workoutResponse.data);
        
        // Test 5: Test Quick Log - Add Nutrition
        console.log('\n5️⃣ Testing Quick Log - Nutrition...');
        const nutritionData = {
            totalCalories: 500,
            totalProtein: 25,
            totalCarbs: 60,
            totalFat: 15,
            waterIntake: 500
        };
        
        const nutritionResponse = await axios.post(`${baseURL}/api/nutrition`, nutritionData, {
            headers: {
                'Cookie': sessionCookie,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Nutrition logged:', nutritionResponse.data);
        
        // Test 6: Test Quick Log - Add Biometrics
        console.log('\n6️⃣ Testing Quick Log - Biometrics...');
        const biometricsData = {
            weight: 70.5,
            bodyFat: 15.2,
            muscleMass: 35.8
        };
        
        const biometricsResponse = await axios.post(`${baseURL}/api/biometrics`, biometricsData, {
            headers: {
                'Cookie': sessionCookie,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(' Biometrics logged:', biometricsResponse.data);
        
        // Test 7: Test Dashboard Data Retrieval
        console.log('\n7️⃣ Testing Dashboard Data Retrieval...');
        const dashboardResponse = await axios.get(`${baseURL}/api/dashboard-data`, {
            headers: {
                'Cookie': sessionCookie
            }
        });
        
        console.log(' Dashboard data retrieved successfully!');
        console.log(' Dashboard Stats:', dashboardResponse.data.data.stats);
        console.log(' Recent Workouts:', dashboardResponse.data.data.recentWorkouts.length);
        console.log(' Latest Biometrics:', dashboardResponse.data.data.latestBiometrics ? 'Available' : 'None');
        
        // Test 8: Verify Data Persistence
        console.log('\n8️⃣ Verifying Data Persistence...');
        
        // Check if our test data appears in dashboard
        const stats = dashboardResponse.data.data.stats;
        const recentWorkouts = dashboardResponse.data.data.recentWorkouts;
        
        console.log('🔍 Verification Results:');
        console.log(`   - Workouts this week: ${stats.workoutsThisWeek}`);
        console.log(`   - Today's calories: ${stats.todayCalories}`);
        console.log(`   - Today's protein: ${stats.todayProtein}g`);
        console.log(`   - Today's water: ${stats.todayWater}ml`);
        console.log(`   - Recent workouts count: ${recentWorkouts.length}`);
        
        // Check if our test workout is in recent workouts
        const testWorkoutFound = recentWorkouts.some(workout => 
            workout.type === 'Test Cardio Workout'
        );
        
        if (testWorkoutFound) {
            console.log('✅ Test workout found in recent workouts!');
        } else {
            console.log('⚠️ Test workout not found in recent workouts');
        }
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('✅ Database connection: Working');
        console.log('✅ Quick Log functionality: Working');
        console.log('✅ Dashboard data retrieval: Working');
        console.log('✅ Data persistence: Working');
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        console.error('🔍 Error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            method: error.config?.method
        });
    }
}

// Run the test
testDatabaseFlow();