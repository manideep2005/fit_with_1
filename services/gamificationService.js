const User = require('../models/User');

class GamificationService {
  constructor() {
    // XP Values for different actions
    this.XP_VALUES = {
      WORKOUT_COMPLETE: 50,
      NUTRITION_LOG: 25,
      DAILY_LOGIN: 10,
      STREAK_BONUS: 20,
      CHALLENGE_COMPLETE: 100,
      FRIEND_INVITE: 30,
      SHARE_WORKOUT: 15,
      BIOMETRIC_UPDATE: 20,
      GOAL_ACHIEVEMENT: 200
    };

    // Level progression (XP required for each level)
    this.LEVEL_THRESHOLDS = [
      0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250,
      3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450, 11500
    ];

    // Achievement definitions
    this.ACHIEVEMENTS = {
      // Workout Achievements
      'first-workout': {
        id: 'first-workout',
        name: 'First Steps',
        description: 'Complete your first workout',
        category: 'workout',
        icon: '🏃‍♂️',
        rarity: 'common',
        xpReward: 50,
        condition: (user) => user.workouts && user.workouts.length >= 1
      },
      'workout-warrior': {
        id: 'workout-warrior',
        name: 'Workout Warrior',
        description: 'Complete 10 workouts',
        category: 'workout',
        icon: '💪',
        rarity: 'rare',
        xpReward: 100,
        condition: (user) => user.workouts && user.workouts.length >= 10
      },
      'fitness-legend': {
        id: 'fitness-legend',
        name: 'Fitness Legend',
        description: 'Complete 50 workouts',
        category: 'workout',
        icon: '🏆',
        rarity: 'epic',
        xpReward: 250,
        condition: (user) => user.workouts && user.workouts.length >= 50
      },

      // Streak Achievements
      'streak-starter': {
        id: 'streak-starter',
        name: 'Streak Starter',
        description: 'Maintain a 3-day workout streak',
        category: 'streak',
        icon: '🔥',
        rarity: 'common',
        xpReward: 75,
        condition: (user) => user.gamification?.streaks?.workout?.current >= 3
      },
      'consistency-king': {
        id: 'consistency-king',
        name: 'Consistency King',
        description: 'Maintain a 7-day workout streak',
        category: 'streak',
        icon: '👑',
        rarity: 'rare',
        xpReward: 150,
        condition: (user) => user.gamification?.streaks?.workout?.current >= 7
      },
      'unstoppable': {
        id: 'unstoppable',
        name: 'Unstoppable',
        description: 'Maintain a 30-day workout streak',
        category: 'streak',
        icon: '⚡',
        rarity: 'legendary',
        xpReward: 500,
        condition: (user) => user.gamification?.streaks?.workout?.current >= 30
      },

      // Nutrition Achievements
      'nutrition-newbie': {
        id: 'nutrition-newbie',
        name: 'Nutrition Newbie',
        description: 'Log your first meal',
        category: 'nutrition',
        icon: '🥗',
        rarity: 'common',
        xpReward: 25,
        condition: (user) => user.nutritionLogs && user.nutritionLogs.length >= 1
      },
      'meal-master': {
        id: 'meal-master',
        name: 'Meal Master',
        description: 'Log meals for 7 consecutive days',
        category: 'nutrition',
        icon: '🍽️',
        rarity: 'rare',
        xpReward: 100,
        condition: (user) => user.gamification?.streaks?.nutrition?.current >= 7
      },

      // Level Achievements
      'level-up': {
        id: 'level-up',
        name: 'Level Up!',
        description: 'Reach level 5',
        category: 'milestone',
        icon: '⬆️',
        rarity: 'common',
        xpReward: 100,
        condition: (user) => user.gamification?.currentLevel >= 5
      },
      'fitness-expert': {
        id: 'fitness-expert',
        name: 'Fitness Expert',
        description: 'Reach level 10',
        category: 'milestone',
        icon: '🎓',
        rarity: 'epic',
        xpReward: 300,
        condition: (user) => user.gamification?.currentLevel >= 10
      },

      // Social Achievements
      'social-butterfly': {
        id: 'social-butterfly',
        name: 'Social Butterfly',
        description: 'Invite 3 friends to join',
        category: 'social',
        icon: '🦋',
        rarity: 'rare',
        xpReward: 150,
        condition: (user) => user.gamification?.social?.friendsInvited >= 3
      }
    };
  }

  // Initialize gamification data for new users
  async initializeGamification(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      if (!user.gamification) {
        user.gamification = {
          totalXP: 0,
          currentLevel: 1,
          xpToNextLevel: 100,
          streaks: {
            workout: { current: 0, longest: 0 },
            nutrition: { current: 0, longest: 0 },
            login: { current: 0, longest: 0 }
          },
          achievements: [],
          challengeStats: { completed: 0, active: 0, totalParticipated: 0 },
          character: {
            strength: 10,
            endurance: 10,
            flexibility: 10,
            nutrition: 10,
            consistency: 10,
            overall: 50
          },
          weeklyStats: { workoutsCompleted: 0, caloriesBurned: 0, xpEarned: 0 },
          monthlyStats: { workoutsCompleted: 0, caloriesBurned: 0, xpEarned: 0 },
          rewards: [],
          social: { friendsInvited: 0, workoutsShared: 0, challengesWon: 0, helpfulVotes: 0 }
        };

        await user.save();
      }

      return user.gamification;
    } catch (error) {
      console.error('Error initializing gamification:', error);
      throw error;
    }
  }

  // Award XP and handle level progression
  async awardXP(userId, xpAmount, reason = 'General activity') {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Initialize gamification if not exists
      if (!user.gamification) {
        await this.initializeGamification(userId);
      }

      const oldLevel = user.gamification.currentLevel;
      user.gamification.totalXP += xpAmount;

      // Calculate new level
      const newLevel = this.calculateLevel(user.gamification.totalXP);
      const leveledUp = newLevel > oldLevel;

      user.gamification.currentLevel = newLevel;
      user.gamification.xpToNextLevel = this.getXPToNextLevel(user.gamification.totalXP);

      // Update weekly and monthly stats
      user.gamification.weeklyStats.xpEarned += xpAmount;
      user.gamification.monthlyStats.xpEarned += xpAmount;

      await user.save();

      // Check for new achievements after XP award
      const newAchievements = await this.checkAchievements(userId);

      return {
        xpAwarded: xpAmount,
        totalXP: user.gamification.totalXP,
        currentLevel: user.gamification.currentLevel,
        xpToNextLevel: user.gamification.xpToNextLevel,
        leveledUp,
        newAchievements,
        reason
      };
    } catch (error) {
      console.error('Error awarding XP:', error);
      throw error;
    }
  }

  // Calculate level based on total XP
  calculateLevel(totalXP) {
    for (let i = this.LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (totalXP >= this.LEVEL_THRESHOLDS[i]) {
        return i + 1;
      }
    }
    return 1;
  }

  // Get XP needed for next level
  getXPToNextLevel(totalXP) {
    const currentLevel = this.calculateLevel(totalXP);
    if (currentLevel >= this.LEVEL_THRESHOLDS.length) {
      return 0; // Max level reached
    }
    return this.LEVEL_THRESHOLDS[currentLevel] - totalXP;
  }

  // Update workout streak
  async updateWorkoutStreak(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      if (!user.gamification) {
        await this.initializeGamification(userId);
      }

      const today = new Date();
      const lastWorkoutDate = user.gamification.streaks.workout.lastWorkoutDate;
      
      let streakUpdated = false;
      let xpAwarded = 0;

      if (!lastWorkoutDate) {
        // First workout ever
        user.gamification.streaks.workout.current = 1;
        user.gamification.streaks.workout.longest = 1;
        streakUpdated = true;
      } else {
        const daysDiff = Math.floor((today - lastWorkoutDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          // Consecutive day - extend streak
          user.gamification.streaks.workout.current += 1;
          if (user.gamification.streaks.workout.current > user.gamification.streaks.workout.longest) {
            user.gamification.streaks.workout.longest = user.gamification.streaks.workout.current;
          }
          
          // Award streak bonus XP
          xpAwarded = this.XP_VALUES.STREAK_BONUS;
          user.gamification.totalXP += xpAwarded;
          streakUpdated = true;
        } else if (daysDiff === 0) {
          // Same day - no streak change but still valid
          streakUpdated = false;
        } else {
          // Streak broken
          user.gamification.streaks.workout.current = 1;
          streakUpdated = true;
        }
      }

      user.gamification.streaks.workout.lastWorkoutDate = today;
      await user.save();

      return {
        streakUpdated,
        currentStreak: user.gamification.streaks.workout.current,
        longestStreak: user.gamification.streaks.workout.longest,
        xpAwarded
      };
    } catch (error) {
      console.error('Error updating workout streak:', error);
      throw error;
    }
  }

  // Update nutrition streak
  async updateNutritionStreak(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      if (!user.gamification) {
        await this.initializeGamification(userId);
      }

      const today = new Date();
      const lastLogDate = user.gamification.streaks.nutrition.lastLogDate;
      
      let streakUpdated = false;
      let xpAwarded = 0;

      if (!lastLogDate) {
        user.gamification.streaks.nutrition.current = 1;
        user.gamification.streaks.nutrition.longest = 1;
        streakUpdated = true;
      } else {
        const daysDiff = Math.floor((today - lastLogDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          user.gamification.streaks.nutrition.current += 1;
          if (user.gamification.streaks.nutrition.current > user.gamification.streaks.nutrition.longest) {
            user.gamification.streaks.nutrition.longest = user.gamification.streaks.nutrition.current;
          }
          xpAwarded = this.XP_VALUES.STREAK_BONUS / 2; // Half bonus for nutrition
          user.gamification.totalXP += xpAwarded;
          streakUpdated = true;
        } else if (daysDiff === 0) {
          streakUpdated = false;
        } else {
          user.gamification.streaks.nutrition.current = 1;
          streakUpdated = true;
        }
      }

      user.gamification.streaks.nutrition.lastLogDate = today;
      await user.save();

      return {
        streakUpdated,
        currentStreak: user.gamification.streaks.nutrition.current,
        longestStreak: user.gamification.streaks.nutrition.longest,
        xpAwarded
      };
    } catch (error) {
      console.error('Error updating nutrition streak:', error);
      throw error;
    }
  }

  // Check and award achievements
  async checkAchievements(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      if (!user.gamification) {
        await this.initializeGamification(userId);
      }

      const newAchievements = [];
      const currentAchievementIds = user.gamification.achievements.map(a => a.id);

      // Check each achievement
      for (const [achievementId, achievement] of Object.entries(this.ACHIEVEMENTS)) {
        if (!currentAchievementIds.includes(achievementId)) {
          if (achievement.condition(user)) {
            // Award achievement
            const newAchievement = {
              id: achievement.id,
              name: achievement.name,
              description: achievement.description,
              category: achievement.category,
              icon: achievement.icon,
              rarity: achievement.rarity,
              xpReward: achievement.xpReward,
              unlockedAt: new Date(),
              progress: 100
            };

            user.gamification.achievements.push(newAchievement);
            user.gamification.totalXP += achievement.xpReward;
            newAchievements.push(newAchievement);
          }
        }
      }

      if (newAchievements.length > 0) {
        await user.save();
      }

      return newAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      throw error;
    }
  }

  // Update character stats based on activities
  async updateCharacterStats(userId, activityType, intensity = 1) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      if (!user.gamification) {
        await this.initializeGamification(userId);
      }

      const statIncrease = Math.floor(intensity * 0.5); // Small incremental increases

      switch (activityType) {
        case 'strength-workout':
          user.gamification.character.strength += statIncrease;
          break;
        case 'cardio-workout':
          user.gamification.character.endurance += statIncrease;
          break;
        case 'flexibility-workout':
          user.gamification.character.flexibility += statIncrease;
          break;
        case 'nutrition-log':
          user.gamification.character.nutrition += Math.floor(statIncrease / 2);
          break;
        case 'consistent-activity':
          user.gamification.character.consistency += statIncrease;
          break;
      }

      // Calculate overall stat (average of all stats)
      const stats = user.gamification.character;
      stats.overall = Math.floor((stats.strength + stats.endurance + stats.flexibility + stats.nutrition + stats.consistency) / 5);

      await user.save();

      return user.gamification.character;
    } catch (error) {
      console.error('Error updating character stats:', error);
      throw error;
    }
  }

  // Get user's gamification dashboard data
  async getGamificationData(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      if (!user.gamification) {
        await this.initializeGamification(userId);
      }

      // Calculate progress to next level
      const currentLevelXP = this.LEVEL_THRESHOLDS[user.gamification.currentLevel - 1] || 0;
      const nextLevelXP = this.LEVEL_THRESHOLDS[user.gamification.currentLevel] || user.gamification.totalXP;
      const progressToNextLevel = nextLevelXP > currentLevelXP 
        ? ((user.gamification.totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 
        : 100;

      return {
        level: user.gamification.currentLevel,
        totalXP: user.gamification.totalXP,
        xpToNextLevel: user.gamification.xpToNextLevel,
        progressToNextLevel: Math.round(progressToNextLevel),
        streaks: user.gamification.streaks,
        achievements: user.gamification.achievements.sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt)),
        character: user.gamification.character,
        weeklyStats: user.gamification.weeklyStats,
        monthlyStats: user.gamification.monthlyStats,
        recentRewards: user.gamification.rewards.slice(-5),
        socialStats: user.gamification.social
      };
    } catch (error) {
      console.error('Error getting gamification data:', error);
      throw error;
    }
  }

  // Process workout completion with gamification
  async processWorkoutCompletion(userId, workoutData) {
    try {
      const results = {
        xp: 0,
        achievements: [],
        streaks: {},
        levelUp: false
      };

      // Award base XP for workout
      const xpResult = await this.awardXP(userId, this.XP_VALUES.WORKOUT_COMPLETE, 'Workout completed');
      results.xp += xpResult.xpAwarded;
      results.levelUp = xpResult.leveledUp;

      // Update workout streak
      const streakResult = await this.updateWorkoutStreak(userId);
      results.streaks.workout = streakResult;
      results.xp += streakResult.xpAwarded;

      // Update character stats based on workout type
      let activityType = 'strength-workout';
      if (workoutData.type) {
        if (workoutData.type.toLowerCase().includes('cardio')) {
          activityType = 'cardio-workout';
        } else if (workoutData.type.toLowerCase().includes('yoga') || workoutData.type.toLowerCase().includes('stretch')) {
          activityType = 'flexibility-workout';
        }
      }

      await this.updateCharacterStats(userId, activityType, workoutData.duration || 30);

      // Check for new achievements
      const newAchievements = await this.checkAchievements(userId);
      results.achievements = newAchievements;

      return results;
    } catch (error) {
      console.error('Error processing workout completion:', error);
      throw error;
    }
  }

  // Process nutrition log with gamification
  async processNutritionLog(userId, nutritionData) {
    try {
      const results = {
        xp: 0,
        achievements: [],
        streaks: {},
        levelUp: false
      };

      // Award base XP for nutrition log
      const xpResult = await this.awardXP(userId, this.XP_VALUES.NUTRITION_LOG, 'Nutrition logged');
      results.xp += xpResult.xpAwarded;
      results.levelUp = xpResult.leveledUp;

      // Update nutrition streak
      const streakResult = await this.updateNutritionStreak(userId);
      results.streaks.nutrition = streakResult;
      results.xp += streakResult.xpAwarded;

      // Update character stats
      await this.updateCharacterStats(userId, 'nutrition-log', 1);

      // Check for new achievements
      const newAchievements = await this.checkAchievements(userId);
      results.achievements = newAchievements;

      return results;
    } catch (error) {
      console.error('Error processing nutrition log:', error);
      throw error;
    }
  }
}

module.exports = new GamificationService();