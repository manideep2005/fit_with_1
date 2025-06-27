const axios = require('axios');

// Test Quick Log functionality end-to-end
async function testQuickLogFlow() {
    const baseURL = 'http://localhost:3001';
    
    console.log('🧪 Testing Quick Log Database Flow...\n');
    
    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing Server Health...');
        const healthResponse = await axios.get(`${baseURL}/api/health`);
        console.log('✅ Server Status:', healthResponse.data.status);
        
        // Test 2: Create/Login Test User
        console.log('\n2️⃣ Setting up Test User...');
        
        const testUser = {
            fullName: 'Quick Log Test User',
            email: 'quicklog@test.com',
            password: 'password123'
        };
        
        let sessionCookie = '';
        
        try {
            // Try signup first
            const signupResponse = await axios.post(`${baseURL}/signup`, testUser);
            console.log('✅ New user created successfully');
            sessionCookie = signupResponse.headers['set-cookie']?.[0] || '';
        } catch (error) {
            if (error.response?.data?.error?.includes('already exists')) {
                console.log('ℹ️ User exists, logging in...');
                
                // Login existing user
                const loginResponse = await axios.post(`${baseURL}/login`, {
                    email: testUser.email,
                    password: testUser.password
                });
                console.log('✅ User logged in successfully');
                sessionCookie = loginResponse.headers['set-cookie']?.[0] || '';
            } else {
                throw error;
            }
        }
        
        if (!sessionCookie) {
            throw new Error('No session cookie received');
        }
        
        // Test 3: Get Initial Dashboard Data
        console.log('\n3️⃣ Getting Initial Dashboard Data...');
        const initialDashboard = await axios.get(`${baseURL}/api/dashboard-data`, {
            headers: { 'Cookie': sessionCookie }
        });
        
        const initialStats = initialDashboard.data.data.stats;
        console.log('📊 Initial Stats:');
        console.log(`   - Workouts this week: ${initialStats.workoutsThisWeek}`);
        console.log(`   - Today's calories: ${initialStats.todayCalories}`);
        console.log(`   - Today's protein: ${initialStats.todayProtein}g`);
        console.log(`   - Today's water: ${initialStats.todayWater}ml`);
        
        // Test 4: Quick Log - Add Workout
        console.log('\n4️⃣ Testing Quick Log - Workout...');
        const workoutData = {
            type: 'Quick Log Test Workout',
            duration: 45,
            calories: 300,
            notes: 'Automated test workout via Quick Log'
        };
        
        const workoutResponse = await axios.post(`${baseURL}/api/workouts`, workoutData, {
            headers: {
                'Cookie': sessionCookie,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Workout logged successfully!');
        console.log('📝 Response:', workoutResponse.data.message);
        
        // Test 5: Quick Log - Add Nutrition
        console.log('\n5️⃣ Testing Quick Log - Nutrition...');
        const nutritionData = {
            totalCalories: 650,
            totalProtein: 35,
            totalCarbs: 80,
            totalFat: 20,
            waterIntake: 750
        };
        
        const nutritionResponse = await axios.post(`${baseURL}/api/nutrition`, nutritionData, {
            headers: {
                'Cookie': sessionCookie,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Nutrition logged successfully!');
        console.log('📝 Response:', nutritionResponse.data.message);
        
        // Test 6: Quick Log - Add Biometrics
        console.log('\n6️⃣ Testing Quick Log - Biometrics...');
        const biometricsData = {
            weight: 72.3,
            bodyFat: 16.5,
            muscleMass: 38.2
        };
        
        const biometricsResponse = await axios.post(`${baseURL}/api/biometrics`, biometricsData, {
            headers: {
                'Cookie': sessionCookie,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Biometrics logged successfully!');
        console.log('📝 Response:', biometricsResponse.data.message);
        
        // Test 7: Verify Dashboard Updates
        console.log('\n7️⃣ Verifying Dashboard Updates...');
        
        // Wait a moment for data to be processed
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const updatedDashboard = await axios.get(`${baseURL}/api/dashboard-data`, {
            headers: { 'Cookie': sessionCookie }
        });
        
        const updatedStats = updatedDashboard.data.data.stats;
        const recentWorkouts = updatedDashboard.data.data.recentWorkouts;
        
        console.log('📊 Updated Stats:');
        console.log(`   - Workouts this week: ${updatedStats.workoutsThisWeek} (was ${initialStats.workoutsThisWeek})`);
        console.log(`   - Today's calories: ${updatedStats.todayCalories} (was ${initialStats.todayCalories})`);
        console.log(`   - Today's protein: ${updatedStats.todayProtein}g (was ${initialStats.todayProtein}g)`);
        console.log(`   - Today's water: ${updatedStats.todayWater}ml (was ${initialStats.todayWater}ml)`);
        console.log(`   - Recent workouts: ${recentWorkouts.length}`);
        
        // Test 8: Verify Data Changes
        console.log('\n8️⃣ Verifying Data Persistence...');
        
        const workoutIncreased = updatedStats.workoutsThisWeek > initialStats.workoutsThisWeek;
        const caloriesIncreased = updatedStats.todayCalories > initialStats.todayCalories;
        const proteinIncreased = updatedStats.todayProtein > initialStats.todayProtein;
        const waterIncreased = updatedStats.todayWater > initialStats.todayWater;
        
        console.log('🔍 Data Change Verification:');
        console.log(`   ✅ Workout count increased: ${workoutIncreased ? 'YES' : 'NO'}`);
        console.log(`   ✅ Calories increased: ${caloriesIncreased ? 'YES' : 'NO'}`);
        console.log(`   ✅ Protein increased: ${proteinIncreased ? 'YES' : 'NO'}`);
        console.log(`   ✅ Water increased: ${waterIncreased ? 'YES' : 'NO'}`);
        
        // Check if our test workout appears in recent workouts
        const testWorkoutFound = recentWorkouts.some(workout => 
            workout.type === 'Quick Log Test Workout'
        );
        console.log(`   ✅ Test workout in recent list: ${testWorkoutFound ? 'YES' : 'NO'}`);
        
        // Test 9: Final Summary
        console.log('\n🎉 QUICK LOG TEST RESULTS:');
        console.log('================================');
        console.log(`✅ Server Connection: WORKING`);
        console.log(`✅ User Authentication: WORKING`);
        console.log(`✅ Workout Logging: WORKING`);
        console.log(`✅ Nutrition Logging: WORKING`);
        console.log(`✅ Biometrics Logging: WORKING`);
        console.log(`✅ Dashboard Data Retrieval: WORKING`);
        console.log(`✅ Real-time Data Updates: ${(workoutIncreased && caloriesIncreased) ? 'WORKING' : 'NEEDS CHECK'}`);
        console.log(`✅ Data Persistence: ${testWorkoutFound ? 'WORKING' : 'NEEDS CHECK'}`);
        
        if (workoutIncreased && caloriesIncreased && proteinIncreased && waterIncreased && testWorkoutFound) {
            console.log('\n🎊 ALL TESTS PASSED! Quick Log is fully functional!');
        } else {
            console.log('\n⚠️ Some tests need attention. Check the results above.');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        console.error('🔍 Error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            method: error.config?.method
        });
    }
}

// Run the test
testQuickLogFlow();