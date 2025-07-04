const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Group = require('./models/Group');
const User = require('./models/User');
const UserSession = require('./models/UserSession');

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

async function cleanupSessions() {
  try {
    console.log('🧹 Cleaning up duplicate sessions...');
    
    // Remove all expired sessions
    const expiredCount = await UserSession.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    console.log(`Removed ${expiredCount.deletedCount} expired sessions`);
    
    // Find and remove duplicate sessions (keep the latest one for each user)
    const duplicates = await UserSession.aggregate([
      {
        $group: {
          _id: '$userId',
          sessions: { $push: { id: '$_id', sessionId: '$sessionId', createdAt: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);
    
    for (const duplicate of duplicates) {
      // Sort by creation date and keep the latest
      duplicate.sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const sessionsToDelete = duplicate.sessions.slice(1); // Remove all except the first (latest)
      
      for (const session of sessionsToDelete) {
        await UserSession.findByIdAndDelete(session.id);
      }
      
      console.log(`Cleaned up ${sessionsToDelete.length} duplicate sessions for user ${duplicate._id}`);
    }
    
    console.log('✅ Session cleanup completed');
  } catch (error) {
    console.error('❌ Session cleanup failed:', error);
  }
}

async function createDefaultGroups() {
  try {
    console.log('🏗️ Creating default community groups...');
    
    // Find the first user to be the creator (or create a system user)
    let systemUser = await User.findOne({ email: 'system@fit-with-ai.com' });
    
    if (!systemUser) {
      systemUser = new User({
        email: 'system@fit-with-ai.com',
        fullName: 'Fit-With-AI System',
        password: 'system123', // This will be hashed
        onboardingCompleted: true,
        personalInfo: {
          firstName: 'System',
          lastName: 'Admin'
        }
      });
      await systemUser.save();
      console.log('✅ Created system user');
    }

    const defaultGroups = [
      {
        name: 'Fit-With-AI Official',
        description: 'Official community for all Fit-With-AI users. Share your progress, ask questions, and get support from fellow fitness enthusiasts.',
        category: 'general',
        privacy: 'public',
        creator: systemUser._id,
        admins: [systemUser._id],
        members: [{
          user: systemUser._id,
          role: 'member',
          joinedAt: new Date()
        }],
        tags: ['official', 'support', 'community', 'fitness'],
        rules: [
          {
            title: 'Be Respectful',
            description: 'Treat all members with respect and kindness'
          },
          {
            title: 'Stay On Topic',
            description: 'Keep discussions related to fitness and health'
          }
        ]
      },
      {
        name: 'Weight Loss Warriors',
        description: 'Support group for people on weight loss journeys. Share tips, recipes, motivation, and celebrate victories together.',
        category: 'weight-loss',
        privacy: 'public',
        creator: systemUser._id,
        admins: [systemUser._id],
        members: [{
          user: systemUser._id,
          role: 'member',
          joinedAt: new Date()
        }],
        tags: ['weight-loss', 'motivation', 'support', 'healthy-eating']
      },
      {
        name: 'Strength & Muscle Building',
        description: 'For those focused on building strength and muscle mass. Share workout routines, form tips, and progress updates.',
        category: 'bodybuilding',
        privacy: 'public',
        creator: systemUser._id,
        admins: [systemUser._id],
        members: [{
          user: systemUser._id,
          role: 'member',
          joinedAt: new Date()
        }],
        tags: ['strength', 'muscle', 'bodybuilding', 'powerlifting']
      },
      {
        name: 'Nutrition & Meal Prep',
        description: 'Share healthy recipes, meal prep ideas, and nutrition tips. Perfect for those looking to optimize their diet.',
        category: 'nutrition',
        privacy: 'public',
        creator: systemUser._id,
        admins: [systemUser._id],
        members: [{
          user: systemUser._id,
          role: 'member',
          joinedAt: new Date()
        }],
        tags: ['nutrition', 'meal-prep', 'recipes', 'healthy-eating']
      },
      {
        name: 'Beginners Welcome',
        description: 'New to fitness? Start here! A supportive community for fitness beginners with tips, encouragement, and guidance.',
        category: 'fitness',
        privacy: 'public',
        creator: systemUser._id,
        admins: [systemUser._id],
        members: [{
          user: systemUser._id,
          role: 'member',
          joinedAt: new Date()
        }],
        tags: ['beginners', 'support', 'guidance', 'motivation']
      }
    ];

    // Check if groups already exist
    for (const groupData of defaultGroups) {
      const existingGroup = await Group.findOne({ name: groupData.name });
      
      if (!existingGroup) {
        const group = new Group(groupData);
        await group.save();
        console.log(`✅ Created group: ${group.name}`);
      } else {
        console.log(`ℹ️ Group already exists: ${groupData.name}`);
      }
    }

    console.log('✅ Default groups creation completed!');
    
  } catch (error) {
    console.error('❌ Error creating default groups:', error);
  }
}

async function main() {
  await connectDB();
  await cleanupSessions();
  await createDefaultGroups();
  
  console.log('🎉 Community setup completed successfully!');
  console.log('');
  console.log('📋 Summary:');
  console.log('- Session duplicates cleaned up');
  console.log('- Default community groups created');
  console.log('- Community features ready to use');
  console.log('');
  console.log('🚀 You can now:');
  console.log('1. Visit /community to see the groups');
  console.log('2. Create new groups and posts');
  console.log('3. Join existing groups');
  console.log('4. Share your fitness journey with the community');
  
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});