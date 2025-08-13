const Challenge = require('../models/Challenge');
const { Achievement, UserAchievement } = require('../models/Achievement');
const User = require('../models/User');
const moment = require('moment');
const streakService = require('./streakService');

class ChallengeService {
  // Get user's challenge stats
  async getUserStats(userId) {
    try {
      const user = await User.findById(userId);
      const challenges = await Challenge.find({ 'participants.user': userId });
      
      const completed = challenges.filter(c => 
        c.participants.find(p => p.user.toString() === userId.toString())?.status === 'completed'
      ).length;
      
      const active = challenges.filter(c => 
        c.participants.find(p => p.user.toString() === userId.toString())?.status === 'active'
      ).length;
      
      const achievements = await UserAchievement.countDocuments({ user: userId });
      const totalPoints = user.gamification?.totalPoints || 0;
      const currentStreak = await this.calculateCurrentStreak(userId);
      
      return {
        challengesCompleted: completed,
        activeChallenges: active,
        achievementsUnlocked: achievements,
        totalPoints,
        currentStreak
      };
    } catch (error) {
      throw new Error('Failed to get user stats: ' + error.message);
    }
  }

  // Calculate current streak using streak service
  async calculateCurrentStreak(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.gamification?.streaks) return 0;
      
      const streaks = user.gamification.streaks;
      return Math.max(
        streaks.workout?.current || 0,
        streaks.nutrition?.current || 0,
        streaks.login?.current || 0
      );
    } catch (error) {
      return 0;
    }
  }

  // Get active challenges for user
  async getActiveChallenges(userId) {
    try {
      const challenges = await Challenge.find({
        'participants.user': userId,
        'participants.status': 'active',
        isActive: true
      }).populate('creator', 'fullName');
      
      return challenges.map(challenge => {
        const userParticipation = challenge.participants.find(p => 
          p.user.toString() === userId.toString()
        );
        
        return {
          ...challenge.toObject(),
          userProgress: userParticipation?.progress || { current: 0, percentage: 0 },
          daysLeft: challenge.endDate ? moment(challenge.endDate).diff(moment(), 'days') : null,
          participantCount: challenge.participants.length
        };
      });
    } catch (error) {
      throw new Error('Failed to get active challenges: ' + error.message);
    }
  }

  // Join a challenge
  async joinChallenge(userId, challengeId) {
    try {
      const challenge = await Challenge.findById(challengeId);
      if (!challenge) throw new Error('Challenge not found');
      
      const alreadyJoined = challenge.participants.some(p => 
        p.user.toString() === userId.toString()
      );
      
      if (alreadyJoined) throw new Error('Already joined this challenge');
      
      challenge.participants.push({
        user: userId,
        joinedAt: new Date(),
        progress: { current: 0, percentage: 0 },
        status: 'active'
      });
      
      await challenge.save();
      return challenge;
    } catch (error) {
      throw new Error('Failed to join challenge: ' + error.message);
    }
  }

  // Update challenge progress
  async updateProgress(userId, challengeId, progressValue) {
    try {
      const challenge = await Challenge.findById(challengeId);
      if (!challenge) throw new Error('Challenge not found');
      
      const participantIndex = challenge.participants.findIndex(p => 
        p.user.toString() === userId.toString()
      );
      
      if (participantIndex === -1) throw new Error('Not participating in this challenge');
      
      const participant = challenge.participants[participantIndex];
      participant.progress.current = progressValue;
      participant.progress.percentage = Math.min(100, (progressValue / challenge.target.value) * 100);
      participant.progress.lastUpdate = new Date();
      
      // Check if challenge is completed
      if (participant.progress.percentage >= 100) {
        participant.status = 'completed';
        participant.completedAt = new Date();
        
        // Award points and achievements
        await this.awardChallengeCompletion(userId, challenge);
      }
      
      await challenge.save();
      return challenge;
    } catch (error) {
      throw new Error('Failed to update progress: ' + error.message);
    }
  }

  // Award challenge completion
  async awardChallengeCompletion(userId, challenge) {
    try {
      const user = await User.findById(userId);
      
      // Award points
      if (!user.gamification) user.gamification = { totalPoints: 0, level: 1 };
      user.gamification.totalPoints += challenge.rewards.points;
      
      // Check for level up
      const newLevel = Math.floor(user.gamification.totalPoints / 1000) + 1;
      if (newLevel > user.gamification.level) {
        user.gamification.level = newLevel;
      }
      
      await user.save();
      
      // Check for achievements
      await this.checkAchievements(userId);
      
    } catch (error) {
      console.error('Failed to award completion:', error);
    }
  }

  // Check and unlock achievements
  async checkAchievements(userId) {
    try {
      const user = await User.findById(userId);
      const allAchievements = await Achievement.find();
      const userAchievements = await UserAchievement.find({ user: userId });
      const unlockedIds = userAchievements.map(ua => ua.achievement.toString());
      
      for (const achievement of allAchievements) {
        if (unlockedIds.includes(achievement._id.toString())) continue;
        
        const meetsRequirement = await this.checkAchievementRequirement(userId, achievement);
        
        if (meetsRequirement) {
          await UserAchievement.create({
            user: userId,
            achievement: achievement._id,
            progress: {
              current: achievement.requirements.target,
              target: achievement.requirements.target,
              percentage: 100
            }
          });
          
          // Award achievement points
          user.gamification.totalPoints += achievement.points;
          await user.save();
        }
      }
    } catch (error) {
      console.error('Failed to check achievements:', error);
    }
  }

  // Check if user meets achievement requirement
  async checkAchievementRequirement(userId, achievement) {
    try {
      const user = await User.findById(userId);
      const { type, target, metric } = achievement.requirements;
      
      switch (type) {
        case 'count':
          if (metric === 'workouts') {
            return (user.workouts?.length || 0) >= target;
          } else if (metric === 'challenges') {
            const completed = await Challenge.countDocuments({
              'participants.user': userId,
              'participants.status': 'completed'
            });
            return completed >= target;
          }
          break;
          
        case 'streak':
          const streak = await this.calculateCurrentStreak(userId);
          return streak >= target;
          
        case 'total':
          if (metric === 'points') {
            return (user.gamification?.totalPoints || 0) >= target;
          }
          break;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  // Get suggested challenges for user
  async getSuggestedChallenges(userId) {
    try {
      const user = await User.findById(userId);
      const userChallenges = await Challenge.find({ 'participants.user': userId });
      const joinedIds = userChallenges.map(c => c._id.toString());
      
      // Get challenges user hasn't joined
      const availableChallenges = await Challenge.find({
        _id: { $nin: joinedIds },
        isActive: true,
        isPublic: true
      }).limit(10);
      
      // Score challenges based on user's fitness goals and activity
      const scoredChallenges = availableChallenges.map(challenge => {
        let score = 0;
        
        // Match with user's fitness goals
        if (user.fitnessGoals?.primaryGoal === 'weight-loss' && challenge.category === 'cardio') score += 3;
        if (user.fitnessGoals?.primaryGoal === 'muscle-gain' && challenge.category === 'strength') score += 3;
        
        // Match difficulty with user level
        const userLevel = user.gamification?.level || 1;
        if (userLevel <= 3 && challenge.difficulty === 'beginner') score += 2;
        if (userLevel > 3 && userLevel <= 7 && challenge.difficulty === 'intermediate') score += 2;
        if (userLevel > 7 && challenge.difficulty === 'advanced') score += 2;
        
        // Popular challenges get bonus
        if (challenge.participants.length > 100) score += 1;
        
        return { ...challenge.toObject(), score };
      });
      
      return scoredChallenges.sort((a, b) => b.score - a.score).slice(0, 6);
    } catch (error) {
      throw new Error('Failed to get suggested challenges: ' + error.message);
    }
  }

  // Get leaderboard
  async getLeaderboard(limit = 10) {
    try {
      const users = await User.find({
        'gamification.totalPoints': { $gt: 0 }
      })
      .sort({ 'gamification.totalPoints': -1 })
      .limit(limit)
      .select('fullName gamification.totalPoints gamification.level');
      
      return users.map((user, index) => ({
        rank: index + 1,
        name: user.fullName,
        points: user.gamification?.totalPoints || 0,
        level: user.gamification?.level || 1
      }));
    } catch (error) {
      throw new Error('Failed to get leaderboard: ' + error.message);
    }
  }

  // Create challenge for friend
  async createChallengeForFriend(creatorId, challengeData, friendIdentifier) {
    try {
      const creator = await User.findById(creatorId);
      if (!creator) throw new Error('Creator not found');
      
      // Find friend by fitness ID or email
      let friend;
      if (friendIdentifier.includes('@')) {
        friend = await User.findOne({ email: friendIdentifier.toLowerCase() });
      } else {
        friend = await User.findOne({ fitnessId: friendIdentifier });
      }
      
      if (!friend) {
        throw new Error('Friend not found. Please check the Fitness ID or email.');
      }
      
      if (friend._id.toString() === creatorId.toString()) {
        throw new Error('You cannot challenge yourself!');
      }
      
      // Map challenge type to category
      const categoryMap = {
        'workout': challengeData.category || 'strength',
        'nutrition': 'nutrition',
        'habit': challengeData.category || 'hydration'
      };
      
      // Create challenge
      const challenge = new Challenge({
        ...challengeData,
        category: categoryMap[challengeData.type] || 'strength',
        creator: creatorId,
        isPublic: false,
        participants: [
          { user: creatorId, status: 'active' },
          { user: friend._id, status: 'active' }
        ],
        startDate: new Date(),
        endDate: new Date(Date.now() + (challengeData.duration.value * (challengeData.duration.unit === 'weeks' ? 7 : 1) * 24 * 60 * 60 * 1000)),
        rewards: {
          points: challengeData.points || 100,
          badges: []
        }
      });
      
      await challenge.save();
      
      // Send email notification
      try {
        const { sendChallengeInvitation } = require('./emailService');
        await sendChallengeInvitation(
          friend.email,
          friend.fullName,
          creator.fullName,
          challengeData.title,
          challengeData.description,
          challengeData.target,
          challengeData.duration
        );
      } catch (emailError) {
        console.error('Failed to send challenge email:', emailError);
        // Don't fail challenge creation if email fails
      }
      
      return { challenge, friend };
    } catch (error) {
      throw new Error('Failed to create challenge: ' + error.message);
    }
  }

  // Create default challenges
  async createDefaultChallenges() {
    try {
      const defaultChallenges = [
        {
          title: '30-Day Push-Up Challenge',
          description: 'Build upper body strength with progressive push-up training',
          type: 'workout',
          category: 'strength',
          difficulty: 'beginner',
          duration: { value: 30, unit: 'days' },
          target: { value: 30, unit: 'days', description: 'Complete 30 days of push-ups' },
          rewards: { points: 300, badges: ['Push-Up Master'] },
          isPublic: true,
          tags: ['strength', 'bodyweight', '30-day']
        },
        {
          title: 'Weekly Cardio Goal',
          description: 'Complete 150 minutes of cardio this week',
          type: 'workout',
          category: 'cardio',
          difficulty: 'intermediate',
          duration: { value: 1, unit: 'weeks' },
          target: { value: 150, unit: 'minutes', description: '150 minutes of cardio' },
          rewards: { points: 150, badges: ['Cardio Champion'] },
          isPublic: true,
          tags: ['cardio', 'weekly', 'endurance']
        },
        {
          title: 'Hydration Hero',
          description: 'Drink 8 glasses of water daily',
          type: 'habit',
          category: 'hydration',
          difficulty: 'beginner',
          duration: { value: 7, unit: 'days' },
          target: { value: 56, unit: 'glasses', description: '8 glasses per day for 7 days' },
          rewards: { points: 70, badges: ['Hydration Hero'] },
          isPublic: true,
          tags: ['hydration', 'daily', 'health']
        }
      ];
      
      for (const challengeData of defaultChallenges) {
        const existing = await Challenge.findOne({ title: challengeData.title });
        if (!existing) {
          await Challenge.create(challengeData);
        }
      }
    } catch (error) {
      console.error('Failed to create default challenges:', error);
    }
  }
}

module.exports = new ChallengeService();