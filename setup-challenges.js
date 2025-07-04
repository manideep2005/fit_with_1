const mongoose = require('mongoose');
require('dotenv').config();

const Challenge = require('./models/Challenge');
const { Achievement } = require('./models/Achievement');
const challengeService = require('./services/challengeService');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

async function createDefaultAchievements() {
  try {
    console.log('🏆 Creating default achievements...');
    
    const defaultAchievements = [
      {
        name: 'First Steps',
        description: 'Complete your first workout',
        icon: 'fas fa-baby',
        category: 'workout',
        tier: 'bronze',
        points: 50,
        requirements: {
          type: 'count',
          target: 1,
          metric: 'workouts'
        }
      },
      {
        name: 'Week Warrior',
        description: 'Maintain a 7-day activity streak',
        icon: 'fas fa-fire',
        category: 'streak',
        tier: 'silver',
        points: 200,
        requirements: {
          type: 'streak',
          target: 7,
          metric: 'activity'
        }
      },
      {
        name: 'Challenge Champion',
        description: 'Complete 5 challenges',
        icon: 'fas fa-trophy',
        category: 'milestone',
        tier: 'gold',
        points: 500,
        requirements: {
          type: 'count',
          target: 5,
          metric: 'challenges'
        }
      },
      {
        name: 'Consistency King',
        description: 'Maintain a 30-day streak',
        icon: 'fas fa-crown',
        category: 'streak',
        tier: 'platinum',
        points: 1000,
        requirements: {
          type: 'streak',
          target: 30,
          metric: 'activity'
        }
      },
      {
        name: 'Point Master',
        description: 'Earn 1000 total points',
        icon: 'fas fa-star',
        category: 'milestone',
        tier: 'gold',
        points: 300,
        requirements: {
          type: 'total',
          target: 1000,
          metric: 'points'
        }
      }
    ];
    
    for (const achievementData of defaultAchievements) {
      const existing = await Achievement.findOne({ name: achievementData.name });
      if (!existing) {
        await Achievement.create(achievementData);
        console.log(`✅ Created achievement: ${achievementData.name}`);
      } else {
        console.log(`ℹ️ Achievement already exists: ${achievementData.name}`);
      }
    }
    
    console.log('✅ Default achievements creation completed!');
  } catch (error) {
    console.error('❌ Error creating achievements:', error);
  }
}

async function main() {
  await connectDB();
  await challengeService.createDefaultChallenges();
  await createDefaultAchievements();
  
  console.log('🎉 Challenge system setup completed successfully!');
  console.log('');
  console.log('📋 Summary:');
  console.log('- Default challenges created');
  console.log('- Achievement system initialized');
  console.log('- Dynamic features ready');
  console.log('');
  console.log('🚀 Features available:');
  console.log('1. Real-time progress tracking');
  console.log('2. Smart challenge suggestions');
  console.log('3. Dynamic leaderboards');
  console.log('4. Achievement system');
  console.log('5. Social features');
  console.log('6. Gamification elements');
  
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});