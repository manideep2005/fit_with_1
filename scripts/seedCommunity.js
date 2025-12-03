const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/fit-with-ai');

const Group = require('../models/Group');
const User = require('../models/User');
const Post = require('../models/Post');

async function seedCommunity() {
  try {
    console.log('🌱 Seeding community data...');
    
    // Find a user to use as creator (or create a test user)
    let testUser = await User.findOne({ email: 'test@example.com' });
    
    if (!testUser) {
      console.log('Creating test user...');
      testUser = new User({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        emailVerified: true,
        onboardingCompleted: true,
        personalInfo: {
          firstName: 'Test',
          lastName: 'User',
          age: 25,
          gender: 'male'
        }
      });
      await testUser.save();
    }
    
    // Clear existing test data
    await Group.deleteMany({ name: { $regex: /^Test|Sample|Demo/ } });
    await Post.deleteMany({ title: { $regex: /^Test|Sample|Demo/ } });
    
    // Create sample groups
    const sampleGroups = [
      {
        name: 'Fitness Beginners',
        description: 'A supportive community for people just starting their fitness journey',
        category: 'fitness',
        privacy: 'public',
        creator: testUser._id,
        admins: [testUser._id],
        members: [{
          user: testUser._id,
          role: 'member',
          joinedAt: new Date()
        }],
        tags: ['beginner', 'support', 'motivation'],
        stats: {
          totalMembers: 1,
          totalPosts: 0
        }
      },
      {
        name: 'Weight Loss Warriors',
        description: 'Join us on the journey to a healthier weight and lifestyle',
        category: 'weight-loss',
        privacy: 'public',
        creator: testUser._id,
        admins: [testUser._id],
        members: [{
          user: testUser._id,
          role: 'member',
          joinedAt: new Date()
        }],
        tags: ['weight-loss', 'diet', 'motivation'],
        stats: {
          totalMembers: 1,
          totalPosts: 0
        }
      },
      {
        name: 'Nutrition Experts',
        description: 'Share nutrition tips, meal plans, and healthy recipes',
        category: 'nutrition',
        privacy: 'public',
        creator: testUser._id,
        admins: [testUser._id],
        members: [{
          user: testUser._id,
          role: 'member',
          joinedAt: new Date()
        }],
        tags: ['nutrition', 'recipes', 'healthy-eating'],
        stats: {
          totalMembers: 1,
          totalPosts: 0
        }
      },
      {
        name: 'Yoga & Mindfulness',
        description: 'Practice yoga and mindfulness together for better mental and physical health',
        category: 'yoga',
        privacy: 'public',
        creator: testUser._id,
        admins: [testUser._id],
        members: [{
          user: testUser._id,
          role: 'member',
          joinedAt: new Date()
        }],
        tags: ['yoga', 'mindfulness', 'flexibility'],
        stats: {
          totalMembers: 1,
          totalPosts: 0
        }
      },
      {
        name: 'Running Club',
        description: 'For runners of all levels - share routes, tips, and motivation',
        category: 'running',
        privacy: 'public',
        creator: testUser._id,
        admins: [testUser._id],
        members: [{
          user: testUser._id,
          role: 'member',
          joinedAt: new Date()
        }],
        tags: ['running', 'cardio', 'endurance'],
        stats: {
          totalMembers: 1,
          totalPosts: 0
        }
      }
    ];
    
    const createdGroups = await Group.insertMany(sampleGroups);
    console.log(`✅ Created ${createdGroups.length} sample groups`);
    
    // Create sample posts
    const samplePosts = [
      {
        title: 'Welcome to Fitness Beginners!',
        content: 'Hi everyone! Welcome to our supportive community. Feel free to ask questions, share your progress, and motivate each other. Remember, every expert was once a beginner!',
        type: 'text',
        author: testUser._id,
        group: createdGroups[0]._id,
        tags: ['welcome', 'motivation'],
        stats: { totalLikes: 0, totalComments: 0 }
      },
      {
        title: 'My Weight Loss Journey - Week 1',
        content: 'Just completed my first week of the weight loss program! Lost 2 pounds and feeling great. The key is consistency and not being too hard on yourself. What tips do you have for staying motivated?',
        type: 'progress',
        author: testUser._id,
        group: createdGroups[1]._id,
        tags: ['progress', 'motivation', 'week1'],
        stats: { totalLikes: 0, totalComments: 0 }
      },
      {
        title: 'Healthy Breakfast Recipe: Overnight Oats',
        content: 'Here\\'s my favorite healthy breakfast recipe:\\n\\nIngredients:\\n- 1/2 cup rolled oats\\n- 1/2 cup milk\\n- 1 tbsp chia seeds\\n- 1 tbsp honey\\n- Fresh berries\\n\\nMix everything, refrigerate overnight, and enjoy in the morning! Perfect for busy schedules.',
        type: 'text',
        author: testUser._id,\n        group: createdGroups[2]._id,\n        tags: ['recipe', 'breakfast', 'healthy'],\n        stats: { totalLikes: 0, totalComments: 0 }\n      },\n      {\n        title: 'Morning Yoga Session - Join Me!',\n        content: 'Starting a 30-day morning yoga challenge! Who wants to join? We\\'ll do 20 minutes of yoga every morning at 7 AM. Great way to start the day with positive energy and flexibility.',\n        type: 'text',\n        author: testUser._id,\n        group: createdGroups[3]._id,\n        tags: ['yoga', 'morning', 'challenge'],\n        stats: { totalLikes: 0, totalComments: 0 }\n      },\n      {\n        title: 'Best Running Routes in the City',\n        content: 'I\\'ve been exploring different running routes and found some amazing ones! Here are my top 3:\\n\\n1. Central Park Loop - 6km, scenic\\n2. Riverside Trail - 8km, flat\\n3. Hill Challenge Route - 5km, great for strength\\n\\nWhat are your favorite running spots?',\n        type: 'text',\n        author: testUser._id,\n        group: createdGroups[4]._id,\n        tags: ['running', 'routes', 'recommendations'],\n        stats: { totalLikes: 0, totalComments: 0 }\n      }\n    ];\n    \n    const createdPosts = await Post.insertMany(samplePosts);\n    console.log(`✅ Created ${createdPosts.length} sample posts`);\n    \n    // Update group post counts\n    for (const group of createdGroups) {\n      const postCount = samplePosts.filter(post => post.group.toString() === group._id.toString()).length;\n      await Group.findByIdAndUpdate(group._id, {\n        'stats.totalPosts': postCount\n      });\n    }\n    \n    console.log('✅ Community data seeded successfully!');\n    console.log('📊 Summary:');\n    console.log(`   - Groups: ${createdGroups.length}`);\n    console.log(`   - Posts: ${createdPosts.length}`);\n    console.log(`   - Test User: ${testUser.email}`);\n    \n  } catch (error) {\n    console.error('❌ Error seeding community data:', error);\n  } finally {\n    mongoose.connection.close();\n  }\n}\n\n// Run the seeding\nseedCommunity();