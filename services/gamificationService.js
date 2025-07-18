const User = require('../models/User');
const healthService = require('./healthService');

class GamificationService {
  constructor() {
   
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

  // Enhanced streak rewards system with multiple reward types
  awardStreakRewards(user, streakType, currentStreak) {
    const rewards = [];
    
    // Define streak milestones and their rewards
    const streakMilestones = {
      1: {
        health: {
          name: 'Day 1 Health Starter',
          description: 'Great start! Get 5% off your first health checkup.',
          subType: 'health-coupon',
          value: '5% OFF',
          icon: '🌟'
        },
        fitness: {
          name: 'Day 1 Fitness Beginner',
          description: 'Welcome to your fitness journey! Unlock basic workout tips.',
          subType: 'workout-tips',
          value: 'Basic Tips',
          icon: '💪'
        }
      },
      3: {
        health: {
          name: '3-Day Streak Health Boost',
          description: 'Excellent consistency! Unlock 15% discount on health checkups and basic consultations.',
          subType: 'health-coupon',
          value: '15% OFF',
          icon: '🏥'
        },
        fitness: {
          name: '3-Day Streak Fitness Bonus',
          description: 'Unlock premium workout plans and exercise tutorials.',
          subType: 'workout-plan',
          value: 'Premium Access',
          icon: '🎯'
        }
      },
      5: {
        health: {
          name: '5-Day Streak Blood Test Voucher',
          description: 'Amazing consistency! Earn a FREE basic blood test voucher at participating labs.',
          subType: 'blood-test',
          value: 'Free Basic Blood Test',
          icon: '🩸'
        },
        fitness: {
          name: '5-Day Streak Nutrition Guide',
          description: 'Unlock personalized meal plans and advanced nutrition tracking features.',
          subType: 'nutrition-plan',
          value: 'Premium Nutrition Guide',
          icon: '🥗'
        }
      },
      7: {
        health: {
          name: '7-Day Streak Health Package',
          description: 'Outstanding! Unlock a FREE comprehensive health screening package worth $200.',
          subType: 'health-package',
          value: 'Free Health Screening ($200 value)',
          icon: '📋'
        },
        fitness: {
          name: '7-Day Streak Elite Status',
          description: 'Achieve elite status with exclusive workout challenges and premium features.',
          subType: 'elite-status',
          value: 'Elite Membership',
          icon: '👑'
        }
      },
      14: {
        health: {
          name: '2-Week Streak Wellness Consultation',
          description: 'Incredible dedication! Get a FREE 30-minute consultation with a certified wellness expert.',
          subType: 'wellness-consultation',
          value: 'Free 30-min Consultation',
          icon: '👩‍⚕️'
        },
        fitness: {
          name: '2-Week Streak Personal Trainer Session',
          description: 'Unlock a FREE virtual personal training session with a certified trainer.',
          subType: 'trainer-session',
          value: 'Free PT Session',
          icon: '🏋️‍♂️'
        }
      },
      21: {
        health: {
          name: '3-Week Streak Premium Health Monitoring',
          description: 'Legendary consistency! Unlock premium health monitoring tools and quarterly health reports.',
          subType: 'health-monitoring',
          value: 'Premium Health Dashboard',
          icon: '📊'
        },
        fitness: {
          name: '3-Week Streak Master Trainer',
          description: 'Become a master trainer with advanced workout analytics and custom program builder.',
          subType: 'master-trainer',
          value: 'Master Trainer Tools',
          icon: '🥇'
        }
      },
      30: {
        health: {
          name: '30-Day Streak Health Champion',
          description: 'ULTIMATE ACHIEVEMENT! Unlock lifetime health benefits, priority support, and annual health package.',
          subType: 'health-champion',
          value: 'Lifetime Health Benefits',
          icon: '🏆'
        },
        fitness: {
          name: '30-Day Streak Fitness Legend',
          description: 'LEGENDARY STATUS! Unlock ALL premium features, exclusive content, and VIP community access.',
          subType: 'fitness-legend',
          value: 'Legend Status + VIP Access',
          icon: '⭐'
        }
      }
    };

    // Check if current streak hits a milestone
    const milestone = streakMilestones[currentStreak];
    if (!milestone) return rewards;

    // Award health reward
    const healthRewardId = `health-${streakType}-streak-${currentStreak}`;
    const healthAlreadyAwarded = user.gamification.rewards.some(r => r.id === healthRewardId);
    
    if (!healthAlreadyAwarded) {
      const healthReward = {
        id: healthRewardId,
        name: milestone.health.name,
        type: 'health',
        subType: milestone.health.subType,
        description: milestone.health.description,
        value: milestone.health.value,
        icon: milestone.health.icon,
        unlockedAt: new Date(),
        used: false,
        streakType,
        streakCount: currentStreak,
        expiresAt: this.getRewardExpiryDate(currentStreak),
        rarity: this.getRewardRarity(currentStreak)
      };
      
      user.gamification.rewards.push(healthReward);
      rewards.push(healthReward);
    }

    // Award fitness reward
    const fitnessRewardId = `fitness-${streakType}-streak-${currentStreak}`;
    const fitnessAlreadyAwarded = user.gamification.rewards.some(r => r.id === fitnessRewardId);
    
    if (!fitnessAlreadyAwarded) {
      const fitnessReward = {
        id: fitnessRewardId,
        name: milestone.fitness.name,
        type: 'fitness',
        subType: milestone.fitness.subType,
        description: milestone.fitness.description,
        value: milestone.fitness.value,
        icon: milestone.fitness.icon,
        unlockedAt: new Date(),
        used: false,
        streakType,
        streakCount: currentStreak,
        expiresAt: this.getRewardExpiryDate(currentStreak),
        rarity: this.getRewardRarity(currentStreak)
      };
      
      user.gamification.rewards.push(fitnessReward);
      rewards.push(fitnessReward);
    }

    return rewards;
  }

  // Get reward expiry date based on streak count
  getRewardExpiryDate(streakCount) {
    let daysToExpiry = 90; // Default 90 days
    
    if (streakCount >= 30) {
      daysToExpiry = 365; // 1 year for legendary rewards
    } else if (streakCount >= 21) {
      daysToExpiry = 180; // 6 months for epic rewards
    } else if (streakCount >= 14) {
      daysToExpiry = 120; // 4 months for rare rewards
    }
    
    return new Date(Date.now() + daysToExpiry * 24 * 60 * 60 * 1000);
  }

  // Determine reward rarity based on streak length
  getRewardRarity(streakCount) {
    if (streakCount >= 30) return 'legendary';
    if (streakCount >= 21) return 'epic';
    if (streakCount >= 14) return 'rare';
    if (streakCount >= 7) return 'rare';
    return 'common';
  }

  // Get streak reward preview for motivation
  getUpcomingStreakRewards(currentStreak, streakType) {
    const allMilestones = [1, 3, 5, 7, 14, 21, 30];
    const nextMilestones = allMilestones.filter(milestone => milestone > currentStreak);
    const upcomingRewards = [];

    // Define milestone rewards for preview
    const milestoneRewards = {
      1: { health: 'Health Starter (5% OFF)', fitness: 'Fitness Beginner Tips' },
      3: { health: 'Health Boost (15% OFF)', fitness: 'Premium Workout Plans' },
      5: { health: 'FREE Blood Test Voucher', fitness: 'Premium Nutrition Guide' },
      7: { health: 'FREE Health Screening ($200)', fitness: 'Elite Membership' },
      14: { health: 'FREE Wellness Consultation', fitness: 'FREE Personal Trainer Session' },
      21: { health: 'Premium Health Dashboard', fitness: 'Master Trainer Tools' },
      30: { health: 'Lifetime Health Benefits', fitness: 'Legend Status + VIP Access' }
    };

    nextMilestones.slice(0, 3).forEach(milestone => { // Show next 3 milestones
      const daysToGo = milestone - currentStreak;
      const rewards = milestoneRewards[milestone];
      
      upcomingRewards.push({
        milestone,
        daysToGo,
        healthReward: rewards.health,
        fitnessReward: rewards.fitness,
        rarity: this.getRewardRarity(milestone),
        isNext: daysToGo === Math.min(...nextMilestones.map(m => m - currentStreak))
      });
    });

    return upcomingRewards;
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
      
      // Award streak rewards if milestone reached
      const streakRewards = this.awardStreakRewards(user, 'workout', user.gamification.streaks.workout.current);
      
      // Check if user qualifies for health rewards and notify hospitals
      const previousStreak = user.gamification.streaks.workout.current - (streakUpdated ? 1 : 0);
      const currentStreak = user.gamification.streaks.workout.current;
      if (healthService.shouldAwardStreakReward('workout', currentStreak, previousStreak)) {
        try {
          const userInfo = {
            email: user.email,
            fullName: user.fullName,
            firstName: user.personalInfo?.firstName || user.fullName?.split(' ')[0] || 'User'
          };
          
          const healthReward = await healthService.processStreakReward(userId, 'workout', currentStreak, userInfo);
          if (healthReward) {
            // Add health reward to user's gamification rewards
            user.gamification.rewards.push(healthReward);
            console.log(`Health reward awarded for ${currentStreak}-day workout streak:`, healthReward.name);
          }
        } catch (healthError) {
          console.error('Error processing health reward:', healthError);
          // Don't fail the streak update if health reward fails
        }
      }
      await user.save();

      return {
        streakUpdated,
        currentStreak: user.gamification.streaks.workout.current,
        longestStreak: user.gamification.streaks.workout.longest,
        xpAwarded,
        streakRewards,
        upcomingRewards: this.getUpcomingStreakRewards(user.gamification.streaks.workout.current, 'workout')
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
      
      // Award streak rewards if milestone reached
      const streakRewards = this.awardStreakRewards(user, 'nutrition', user.gamification.streaks.nutrition.current);
      
      // Check if user qualifies for health rewards and notify hospitals
      const previousStreak = user.gamification.streaks.nutrition.current - (streakUpdated ? 1 : 0);
      const currentStreak = user.gamification.streaks.nutrition.current;
      if (healthService.shouldAwardStreakReward('nutrition', currentStreak, previousStreak)) {
        try {
          const userInfo = {
            email: user.email,
            fullName: user.fullName,
            firstName: user.personalInfo?.firstName || user.fullName?.split(' ')[0] || 'User'
          };
          
          const healthReward = await healthService.processStreakReward(userId, 'nutrition', currentStreak, userInfo);
          if (healthReward) {
            // Add health reward to user's gamification rewards
            user.gamification.rewards.push(healthReward);
            console.log(`Health reward awarded for ${currentStreak}-day nutrition streak:`, healthReward.name);
          }
        } catch (healthError) {
          console.error('Error processing health reward:', healthError);
          // Don't fail the streak update if health reward fails
        }
      }
      await user.save();

      return {
        streakUpdated,
        currentStreak: user.gamification.streaks.nutrition.current,
        longestStreak: user.gamification.streaks.nutrition.longest,
        xpAwarded,
        streakRewards,
        upcomingRewards: this.getUpcomingStreakRewards(user.gamification.streaks.nutrition.current, 'nutrition')
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
        levelUp: false,
        streakRewards: [],
        upcomingRewards: []
      };

      // Award base XP for workout
      const xpResult = await this.awardXP(userId, this.XP_VALUES.WORKOUT_COMPLETE, 'Workout completed');
      results.xp += xpResult.xpAwarded;
      results.levelUp = xpResult.leveledUp;

      // Update workout streak
      const streakResult = await this.updateWorkoutStreak(userId);
      results.streaks.workout = streakResult;
      results.xp += streakResult.xpAwarded;
      
      // Include streak rewards if earned
      if (streakResult.streakRewards && streakResult.streakRewards.length > 0) {
        results.streakRewards = streakResult.streakRewards;
      }
      
      // Include upcoming rewards for motivation
      if (streakResult.upcomingRewards) {
        results.upcomingRewards = streakResult.upcomingRewards;
      }

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
        levelUp: false,
        streakRewards: [],
        upcomingRewards: []
      };

      // Award base XP for nutrition log
      const xpResult = await this.awardXP(userId, this.XP_VALUES.NUTRITION_LOG, 'Nutrition logged');
      results.xp += xpResult.xpAwarded;
      results.levelUp = xpResult.leveledUp;

      // Update nutrition streak
      const streakResult = await this.updateNutritionStreak(userId);
      results.streaks.nutrition = streakResult;
      results.xp += streakResult.xpAwarded;
      
      // Include streak rewards if earned
      if (streakResult.streakRewards && streakResult.streakRewards.length > 0) {
        results.streakRewards = streakResult.streakRewards;
      }
      
      // Include upcoming rewards for motivation
      if (streakResult.upcomingRewards) {
        results.upcomingRewards = streakResult.upcomingRewards;
      }

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