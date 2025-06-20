const axios = require('axios');

// Test dashboard functionality
async function testDashboard() {
    const baseURL = 'http://localhost:3001';
    
    console.log('🧪 Testing Dashboard Functionality...\n');
    
    try {
        // Login existing user
        const loginResponse = await axios.post(`${baseURL}/login`, {
            email: 'completeflow@test.com',
            password: 'password123'
        });
        
        console.log('✅ Login successful');
        const sessionCookie = loginResponse.headers['set-cookie']?.[0] || '';
        
        // Test dashboard data
        console.log('\n📊 Testing Dashboard Data...');
        const dashboardResponse = await axios.get(`${baseURL}/api/dashboard-data`, {
            headers: { 'Cookie': sessionCookie }
        });
        
        console.log('✅ Dashboard data retrieved!');
        const data = dashboardResponse.data.data;
        console.log('📈 Stats:', data.stats);
        console.log('👤 User:', data.user.fullName);
        
        // Test Quick Log - Workout
        console.log('\n🏋️ Testing Quick Log - Workout...');
        const workoutResponse = await axios.post(`${baseURL}/api/workouts`, {
            type: 'Dashboard Test Workout',
            duration: 30,
            calories: 200,
            notes: 'Testing from dashboard'
        }, {
            headers: {
                'Cookie': sessionCookie,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Workout logged:', workoutResponse.data.message);
        
        // Test Quick Log - Nutrition
        console.log('\n🍎 Testing Quick Log - Nutrition...');
        const nutritionResponse = await axios.post(`${baseURL}/api/nutrition`, {
            totalCalories: 500,
            totalProtein: 25,
            totalCarbs: 60,
            totalFat: 15,
            waterIntake: 500
        }, {
            headers: {
                'Cookie': sessionCookie,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Nutrition logged:', nutritionResponse.data.message);
        
        // Test Quick Log - Biometrics
        console.log('\n📏 Testing Quick Log - Biometrics...');
        const biometricsResponse = await axios.post(`${baseURL}/api/biometrics`, {
            weight: 70.5,
            bodyFat: 15.2,
            muscleMass: 35.8
        }, {
            headers: {
                'Cookie': sessionCookie,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Biometrics logged:', biometricsResponse.data.message);
        
        // Check updated dashboard
        console.log('\n🔄 Checking Updated Dashboard...');
        const updatedDashboard = await axios.get(`${baseURL}/api/dashboard-data`, {
            headers: { 'Cookie': sessionCookie }
        });
        
        const updatedData = updatedDashboard.data.data;
        console.log('📊 Updated Stats:');
        console.log(`   - Workouts this week: ${updatedData.stats.workoutsThisWeek}`);
        console.log(`   - Today's calories: ${updatedData.stats.todayCalories}`);
        console.log(`   - Today's protein: ${updatedData.stats.todayProtein}g`);
        console.log(`   - Today's water: ${updatedData.stats.todayWater}ml`);
        console.log(`   - Recent workouts: ${updatedData.recentWorkouts.length}`);
        
        // Verify data was saved
        const hasWorkout = updatedData.recentWorkouts.some(w => w.type === 'Dashboard Test Workout');
        const hasCalories = updatedData.stats.todayCalories > 0;
        const hasProtein = updatedData.stats.todayProtein > 0;
        const hasWater = updatedData.stats.todayWater > 0;
        
        console.log('\n✅ VERIFICATION RESULTS:');
        console.log(`   🏋️ Workout saved: ${hasWorkout ? 'YES' : 'NO'}`);
        console.log(`   🔥 Calories saved: ${hasCalories ? 'YES' : 'NO'}`);
        console.log(`   💪 Protein saved: ${hasProtein ? 'YES' : 'NO'}`);
        console.log(`   💧 Water saved: ${hasWater ? 'YES' : 'NO'}`);
        
        if (hasWorkout && hasCalories && hasProtein && hasWater) {
            console.log('\n🎉 SUCCESS! Quick Log saves to database and updates dashboard!');
            console.log('✅ Complete database flow is working perfectly!');
        } else {
            console.log('\n⚠️ Some data may not have been saved properly.');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        console.error('🔍 Details:', {
            status: error.response?.status,
            url: error.config?.url,
            method: error.config?.method
        });
    }
}

testDashboard();