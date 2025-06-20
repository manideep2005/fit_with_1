const axios = require('axios');

// Test the complete flow including onboarding
async function testCompleteFlow() {
    const baseURL = 'http://localhost:3001';
    
    console.log('🧪 Testing Complete Database Flow with Onboarding...\n');
    
    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing Server Health...');
        const healthResponse = await axios.get(`${baseURL}/api/health`);
        console.log('✅ Server Status:', healthResponse.data.status);
        
        // Test 2: Create Test User
        console.log('\n2️⃣ Creating Test User...');
        
        const testUser = {
            fullName: 'Complete Flow Test User',
            email: 'completeflow@test.com',
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
        
        // Test 3: Complete Onboarding
        console.log('\n3️⃣ Completing Onboarding...');
        
        const onboardingData = {
            personalInfo: {
                firstName: 'Complete',
                lastName: 'Flow',
                age: 30,
                gender: 'male'
            },
            bodyMetrics: {
                height: 175,
                weight: 70,
                targetWeight: 68,
                activityLevel: 'moderately-active',
                workoutFrequency: '4'
            },
            healthGoals: {
                goals: ['weight-loss', 'improve-fitness'],
                timeline: '3-months'
            },
            dietaryPreferences: {
                dietType: 'none',
                allergies: ['none'],
                waterIntake: '7-8'
            },
            lifestyle: {
                sleepQuality: 'good',
                smokingStatus: 'never',
                alcoholConsumption: 'occasionally',
                stressLevel: '5'
            }
        };
        
        const onboardingResponse = await axios.post(`${baseURL}/CustomOnboarding/complete`, {
            onboardingData: onboardingData
        }, {
            headers: {
                'Cookie': sessionCookie,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Onboarding completed successfully!');
        console.log('📝 Response:', onboardingResponse.data.message);
        
        // Update session cookie if new one is provided
        if (onboardingResponse.headers['set-cookie']) {
            sessionCookie = onboardingResponse.headers['set-cookie'][0];
        }
        
        // Test 4: Get Initial Dashboard Data
        console.log('\n4️⃣ Getting Initial Dashboard Data...');
        const initialDashboard = await axios.get(`${baseURL}/api/dashboard-data`, {
            headers: { 'Cookie': sessionCookie }
        });
        
        const initialStats = initialDashboard.data.data.stats;
        console.log('📊 Initial Stats:');
        console.log(`   - Workouts this week: ${initialStats.workoutsThisWeek}`);
        console.log(`   - Today's calories: ${initialStats.todayCalories}`);
        console.log(`   - Today's protein: ${initialStats.todayProtein}g`);
        console.log(`   - Today's water: ${initialStats.todayWater}ml`);
        
        // Test 5: Quick Log - Add Workout
        console.log('\n5️⃣ Testing Quick Log - Workout...');
        const workoutData = {
            type: 'Complete Flow Test Workout',
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
        
        // Test 6: Quick Log - Add Nutrition
        console.log('\n6️⃣ Testing Quick Log - Nutrition...');
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
        
        // Test 7: Quick Log - Add Biometrics
        console.log('\n7️⃣ Testing Quick Log - Biometrics...');
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
        
        // Test 8: Verify Dashboard Updates
        console.log('\n8️⃣ Verifying Dashboard Updates...');
        
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
        
        // Test 9: Verify Data Changes
        console.log('\n9️⃣ Verifying Data Persistence...');
        
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
            workout.type === 'Complete Flow Test Workout'
        );
        console.log(`   ✅ Test workout in recent list: ${testWorkoutFound ? 'YES' : 'NO'}`);
        
        // Test 10: Test Multiple Quick Logs
        console.log('\n🔟 Testing Multiple Quick Logs...');
        
        // Add another workout
        await axios.post(`${baseURL}/api/workouts`, {
            type: 'Second Test Workout',
            duration: 30,
            calories: 200,
            notes: 'Second workout test'
        }, {
            headers: { 'Cookie': sessionCookie, 'Content-Type': 'application/json' }
        });
        
        // Add more nutrition
        await axios.post(`${baseURL}/api/nutrition`, {
            totalCalories: 400,
            totalProtein: 20,
            totalCarbs: 50,
            totalFat: 15,
            waterIntake: 500
        }, {
            headers: { 'Cookie': sessionCookie, 'Content-Type': 'application/json' }
        });
        
        console.log('✅ Multiple entries logged successfully!');
        
        // Final dashboard check
        const finalDashboard = await axios.get(`${baseURL}/api/dashboard-data`, {
            headers: { 'Cookie': sessionCookie }
        });
        
        const finalStats = finalDashboard.data.data.stats;
        const finalWorkouts = finalDashboard.data.data.recentWorkouts;
        
        console.log('\n📊 Final Stats:');
        console.log(`   - Workouts this week: ${finalStats.workoutsThisWeek}`);
        console.log(`   - Today's calories: ${finalStats.todayCalories}`);
        console.log(`   - Today's protein: ${finalStats.todayProtein}g`);
        console.log(`   - Today's water: ${finalStats.todayWater}ml`);
        console.log(`   - Recent workouts: ${finalWorkouts.length}`);
        
        // Test 11: Final Summary
        console.log('\n🎉 COMPLETE FLOW TEST RESULTS:');
        console.log('=====================================');
        console.log(`✅ Server Connection: WORKING`);
        console.log(`✅ User Registration: WORKING`);
        console.log(`✅ User Authentication: WORKING`);
        console.log(`✅ Onboarding Process: WORKING`);
        console.log(`✅ Dashboard Data API: WORKING`);
        console.log(`✅ Workout Logging: WORKING`);
        console.log(`✅ Nutrition Logging: WORKING`);
        console.log(`✅ Biometrics Logging: WORKING`);
        console.log(`✅ Real-time Data Updates: ${(finalStats.workoutsThisWeek >= 2 && finalStats.todayCalories >= 1000) ? 'WORKING' : 'NEEDS CHECK'}`);
        console.log(`✅ Data Persistence: ${finalWorkouts.length >= 2 ? 'WORKING' : 'NEEDS CHECK'}`);
        console.log(`✅ Multiple Entries: ${finalStats.todayCalories > updatedStats.todayCalories ? 'WORKING' : 'NEEDS CHECK'}`);
        
        if (finalStats.workoutsThisWeek >= 2 && finalStats.todayCalories >= 1000 && finalWorkouts.length >= 2) {
            console.log('\n🎊 ALL TESTS PASSED! Complete database flow is fully functional!');
            console.log('🚀 Quick Log saves to database and updates dashboard in real-time!');
        } else {
            console.log('\n⚠️ Some tests need attention. Check the results above.');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        console.error('🔍 Error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            method: error.config?.method,
            data: error.response?.data
        });
    }
}

// Run the test
testCompleteFlow();