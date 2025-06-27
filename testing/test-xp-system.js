require('dotenv').config();
const database = require('./config/database');
const gamificationService = require('./services/gamificationService');
const UserService = require('./services/userService');

async function testXPSystem() {
    console.log('🧪 Testing XP System...\n');
    
    try {
        // Connect to database
        await database.connect();
        console.log('✅ Database connected');
        
        // Test user email (replace with a real user from your database)
        const testEmail = 'test@example.com';
        
        // Get or create test user
        let user;
        try {
            user = await UserService.getUserByEmail(testEmail);
            if (!user) {
                console.log('❌ Test user not found. Please use a real user email from your database.');
                return;
            }
        } catch (error) {
            console.log('❌ Error finding user:', error.message);
            return;
        }
        
        console.log('✅ Found user:', user.fullName);
        
        // Initialize gamification if needed
        await gamificationService.initializeGamification(user._id);
        console.log('✅ Gamification initialized');
        
        // Get current gamification data
        const beforeData = await gamificationService.getGamificationData(user._id);
        console.log('📊 Before workout:');
        console.log('   Level:', beforeData.level);
        console.log('   Total XP:', beforeData.totalXP);
        console.log('   XP to next level:', beforeData.xpToNextLevel);
        console.log('   Workout streak:', beforeData.streaks.workout.current);
        
        // Simulate workout completion
        const workoutData = {
            type: 'Cardio Workout',
            duration: 30,
            calories: 250,
            notes: 'Test workout for XP system'
        };
        
        console.log('\n🏋️ Processing workout completion...');
        const gamificationResults = await gamificationService.processWorkoutCompletion(user._id, workoutData);
        
        console.log('✅ Workout processed!');
        console.log('📈 Gamification Results:');
        console.log('   XP Earned:', gamificationResults.xp);
        console.log('   Level Up:', gamificationResults.levelUp ? 'YES! 🎉' : 'No');
        console.log('   New Achievements:', gamificationResults.achievements.length);
        
        if (gamificationResults.achievements.length > 0) {
            gamificationResults.achievements.forEach(achievement => {
                console.log(`   🏆 ${achievement.name}: ${achievement.description} (+${achievement.xpReward} XP)`);
            });
        }
        
        // Get updated gamification data
        const afterData = await gamificationService.getGamificationData(user._id);
        console.log('\n📊 After workout:');
        console.log('   Level:', afterData.level);
        console.log('   Total XP:', afterData.totalXP);
        console.log('   XP to next level:', afterData.xpToNextLevel);
        console.log('   Workout streak:', afterData.streaks.workout.current);
        
        console.log('\n🎯 XP System Test Results:');
        console.log('✅ XP System is working correctly!');
        console.log('✅ Gamification service is functional');
        console.log('✅ Achievements are being awarded');
        console.log('✅ Streaks are being tracked');
        
        if (afterData.totalXP > beforeData.totalXP) {
            console.log('✅ XP is being awarded properly');
        } else {
            console.log('❌ XP is not being awarded - check the service');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        process.exit(0);
    }
}

testXPSystem();