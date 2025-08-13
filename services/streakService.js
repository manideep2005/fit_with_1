const User = require('../models/User');
const moment = require('moment');

class StreakService {
  // Calculate and update all streaks for a user
  async updateUserStreaks(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return { workout: { current: 0, longest: 0 }, nutrition: { current: 0, longest: 0 }, login: { current: 0, longest: 0 } };

      const today = moment().startOf('day');
      const yesterday = moment().subtract(1, 'day').startOf('day');

      // Initialize gamification if not exists
      if (!user.gamification) {
        user.gamification = {
          totalXP: 0,
          currentLevel: 1,
          streaks: {
            workout: { current: 0, longest: 0, lastWorkoutDate: null },
            nutrition: { current: 0, longest: 0, lastLogDate: null },
            login: { current: 0, longest: 0, lastLoginDate: null }
          }
        };
      }

      if (!user.gamification.streaks) {
        user.gamification.streaks = {
          workout: { current: 0, longest: 0, lastWorkoutDate: null },
          nutrition: { current: 0, longest: 0, lastLogDate: null },
          login: { current: 0, longest: 0, lastLoginDate: null }
        };
      }

      // Update workout streak
      this.updateWorkoutStreak(user, today, yesterday);
      
      // Update nutrition streak
      this.updateNutritionStreak(user, today, yesterday);
      
      // Update login streak
      this.updateLoginStreak(user, today);

      await user.save({ validateBeforeSave: false });
      return user.gamification.streaks;
    } catch (error) {
      console.error('Streak update error:', error);
      return { workout: { current: 0, longest: 0 }, nutrition: { current: 0, longest: 0 }, login: { current: 0, longest: 0 } };
    }
  }

  // Update workout streak
  async updateWorkoutStreak(user, today, yesterday) {
    const todayWorkouts = user.workouts?.filter(w => 
      moment(w.date).isSame(today, 'day')
    ) || [];

    const lastWorkoutDate = user.gamification.streaks.workout.lastWorkoutDate 
      ? moment(user.gamification.streaks.workout.lastWorkoutDate).startOf('day')
      : null;

    if (todayWorkouts.length > 0) {
      // User worked out today
      if (!lastWorkoutDate || lastWorkoutDate.isSame(yesterday, 'day')) {
        // Continue or start streak
        user.gamification.streaks.workout.current += 1;
      } else if (lastWorkoutDate.isSame(today, 'day')) {
        // Already counted today, no change
        return;
      } else {
        // Streak broken, restart
        user.gamification.streaks.workout.current = 1;
      }
      
      user.gamification.streaks.workout.lastWorkoutDate = today.toDate();
      
      // Update longest streak
      if (user.gamification.streaks.workout.current > user.gamification.streaks.workout.longest) {
        user.gamification.streaks.workout.longest = user.gamification.streaks.workout.current;
      }
    } else {
      // No workout today
      if (lastWorkoutDate && lastWorkoutDate.isBefore(yesterday, 'day')) {
        // Streak broken (missed yesterday and today)
        user.gamification.streaks.workout.current = 0;
      }
      // If last workout was yesterday, streak is still alive (grace period)
    }
  }

  // Update nutrition streak
  async updateNutritionStreak(user, today, yesterday) {
    const todayNutrition = user.nutritionLogs?.filter(n => 
      moment(n.date).isSame(today, 'day')
    ) || [];

    const lastLogDate = user.gamification.streaks.nutrition.lastLogDate 
      ? moment(user.gamification.streaks.nutrition.lastLogDate).startOf('day')
      : null;

    if (todayNutrition.length > 0) {
      // User logged nutrition today
      if (!lastLogDate || lastLogDate.isSame(yesterday, 'day')) {
        // Continue or start streak
        user.gamification.streaks.nutrition.current += 1;
      } else if (lastLogDate.isSame(today, 'day')) {
        // Already counted today, no change
        return;
      } else {
        // Streak broken, restart
        user.gamification.streaks.nutrition.current = 1;
      }
      
      user.gamification.streaks.nutrition.lastLogDate = today.toDate();
      
      // Update longest streak
      if (user.gamification.streaks.nutrition.current > user.gamification.streaks.nutrition.longest) {
        user.gamification.streaks.nutrition.longest = user.gamification.streaks.nutrition.current;
      }
    } else {
      // No nutrition log today
      if (lastLogDate && lastLogDate.isBefore(yesterday, 'day')) {
        // Streak broken (missed yesterday and today)
        user.gamification.streaks.nutrition.current = 0;
      }
      // If last log was yesterday, streak is still alive (grace period)
    }
  }

  // Update login streak
  async updateLoginStreak(user, today) {
    const lastLoginDate = user.gamification.streaks.login.lastLoginDate 
      ? moment(user.gamification.streaks.login.lastLoginDate).startOf('day')
      : null;

    if (!lastLoginDate || lastLoginDate.isBefore(today, 'day')) {
      // First login today
      const yesterday = moment().subtract(1, 'day').startOf('day');
      
      if (!lastLoginDate || lastLoginDate.isSame(yesterday, 'day')) {
        // Continue or start streak
        user.gamification.streaks.login.current += 1;
      } else {
        // Streak broken, restart
        user.gamification.streaks.login.current = 1;
      }
      
      user.gamification.streaks.login.lastLoginDate = today.toDate();
      
      // Update longest streak
      if (user.gamification.streaks.login.current > user.gamification.streaks.login.longest) {
        user.gamification.streaks.login.longest = user.gamification.streaks.login.current;
      }
    }
  }

  // Get streak status for user
  async getStreakStatus(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Update streaks first
      await this.updateUserStreaks(userId);
      
      const updatedUser = await User.findById(userId);
      const streaks = updatedUser.gamification?.streaks || {};
      
      const today = moment().startOf('day');
      const yesterday = moment().subtract(1, 'day').startOf('day');

      return {
        workout: {
          current: streaks.workout?.current || 0,
          longest: streaks.workout?.longest || 0,
          status: this.getStreakStatus(streaks.workout?.lastWorkoutDate, today, yesterday),
          emoji: this.getStreakEmoji(streaks.workout?.current || 0),
          nextMilestone: this.getNextMilestone(streaks.workout?.current || 0)
        },
        nutrition: {
          current: streaks.nutrition?.current || 0,
          longest: streaks.nutrition?.longest || 0,
          status: this.getStreakStatus(streaks.nutrition?.lastLogDate, today, yesterday),
          emoji: this.getStreakEmoji(streaks.nutrition?.current || 0),
          nextMilestone: this.getNextMilestone(streaks.nutrition?.current || 0)
        },
        login: {
          current: streaks.login?.current || 0,
          longest: streaks.login?.longest || 0,
          status: this.getStreakStatus(streaks.login?.lastLoginDate, today, yesterday),
          emoji: this.getStreakEmoji(streaks.login?.current || 0),
          nextMilestone: this.getNextMilestone(streaks.login?.current || 0)
        }
      };
    } catch (error) {
      throw new Error('Failed to get streak status: ' + error.message);
    }
  }

  // Get streak status (active, at-risk, broken)
  getStreakStatus(lastDate, today, yesterday) {
    if (!lastDate) return 'inactive';
    
    const lastMoment = moment(lastDate).startOf('day');
    
    if (lastMoment.isSame(today, 'day')) {
      return 'active'; // Completed today
    } else if (lastMoment.isSame(yesterday, 'day')) {
      return 'at-risk'; // Completed yesterday, need to do today
    } else {
      return 'broken'; // Streak is broken
    }
  }

  // Get streak emoji based on count
  getStreakEmoji(count) {
    if (count === 0) return '💤';
    if (count < 3) return '🔥';
    if (count < 7) return '🚀';
    if (count < 14) return '⭐';
    if (count < 30) return '💎';
    if (count < 100) return '👑';
    return '🏆';
  }

  // Get next milestone
  getNextMilestone(current) {
    const milestones = [3, 7, 14, 30, 50, 100, 200, 365];
    return milestones.find(m => m > current) || (current + 100);
  }

  // Award streak rewards
  async awardStreakRewards(userId, streakType, streakCount) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const milestones = [3, 7, 14, 30, 50, 100, 200, 365];
      
      if (milestones.includes(streakCount)) {
        const reward = this.getStreakReward(streakType, streakCount);
        
        // Add reward to user
        if (!user.gamification.rewards) user.gamification.rewards = [];
        
        user.gamification.rewards.push({
          id: `${streakType}_streak_${streakCount}`,
          name: reward.name,
          type: 'streak',
          subType: streakType,
          description: reward.description,
          value: reward.value,
          streakType: streakType,
          streakCount: streakCount,
          rarity: reward.rarity
        });

        // Award XP
        user.gamification.totalXP += reward.xp;
        
        await user.save();
        return reward;
      }
    } catch (error) {
      console.error('Failed to award streak rewards:', error);
    }
  }

  // Get streak reward details
  getStreakReward(streakType, count) {
    const rewards = {
      workout: {
        3: { name: '3-Day Warrior', description: '3 days of consistent workouts!', value: 'Unlock new workout routines', xp: 50, rarity: 'common' },
        7: { name: 'Week Champion', description: '7 days strong!', value: 'Premium workout plans access', xp: 100, rarity: 'rare' },
        14: { name: 'Fortnight Fighter', description: '2 weeks of dedication!', value: 'Personal trainer tips', xp: 200, rarity: 'rare' },
        30: { name: 'Monthly Master', description: '30 days of excellence!', value: 'Custom workout generator', xp: 500, rarity: 'epic' },
        50: { name: 'Fitness Legend', description: '50 days of commitment!', value: 'Advanced analytics', xp: 750, rarity: 'epic' },
        100: { name: 'Centurion', description: '100 days of pure dedication!', value: 'Lifetime premium features', xp: 1500, rarity: 'legendary' }
      },
      nutrition: {
        3: { name: 'Nutrition Novice', description: '3 days of tracking!', value: 'Meal planning tips', xp: 50, rarity: 'common' },
        7: { name: 'Macro Master', description: '7 days of nutrition tracking!', value: 'Premium recipes access', xp: 100, rarity: 'rare' },
        14: { name: 'Diet Dynamo', description: '2 weeks of healthy choices!', value: 'Nutritionist consultation', xp: 200, rarity: 'rare' },
        30: { name: 'Nutrition Ninja', description: '30 days of perfect tracking!', value: 'Custom meal plans', xp: 500, rarity: 'epic' },
        50: { name: 'Health Hero', description: '50 days of nutrition excellence!', value: 'Advanced nutrition analytics', xp: 750, rarity: 'epic' },
        100: { name: 'Wellness Warrior', description: '100 days of nutrition mastery!', value: 'Personal nutritionist access', xp: 1500, rarity: 'legendary' }
      }
    };

    return rewards[streakType]?.[count] || { name: 'Streak Master', description: `${count} days of ${streakType}!`, value: 'Keep going!', xp: count * 10, rarity: 'common' };
  }

  // Check and break expired streaks (run daily)
  async checkExpiredStreaks() {
    try {
      const users = await User.find({
        'gamification.streaks': { $exists: true }
      });

      const today = moment().startOf('day');
      const twoDaysAgo = moment().subtract(2, 'days').startOf('day');

      for (const user of users) {
        let updated = false;
        const streaks = user.gamification.streaks;

        // Check workout streak
        if (streaks.workout?.lastWorkoutDate) {
          const lastWorkout = moment(streaks.workout.lastWorkoutDate).startOf('day');
          if (lastWorkout.isBefore(twoDaysAgo) && streaks.workout.current > 0) {
            streaks.workout.current = 0;
            updated = true;
          }
        }

        // Check nutrition streak
        if (streaks.nutrition?.lastLogDate) {
          const lastLog = moment(streaks.nutrition.lastLogDate).startOf('day');
          if (lastLog.isBefore(twoDaysAgo) && streaks.nutrition.current > 0) {
            streaks.nutrition.current = 0;
            updated = true;
          }
        }

        // Check login streak
        if (streaks.login?.lastLoginDate) {
          const lastLogin = moment(streaks.login.lastLoginDate).startOf('day');
          if (lastLogin.isBefore(twoDaysAgo) && streaks.login.current > 0) {
            streaks.login.current = 0;
            updated = true;
          }
        }

        if (updated) {
          await user.save();
        }
      }
    } catch (error) {
      console.error('Failed to check expired streaks:', error);
    }
  }

  // Get leaderboard for streaks
  async getStreakLeaderboard(streakType = 'workout', limit = 10) {
    try {
      const sortField = `gamification.streaks.${streakType}.current`;
      
      const users = await User.find({
        [sortField]: { $gt: 0 }
      })
      .sort({ [sortField]: -1 })
      .limit(limit)
      .select(`fullName ${sortField} gamification.streaks.${streakType}.longest`);

      return users.map((user, index) => ({
        rank: index + 1,
        name: user.fullName,
        currentStreak: user.gamification?.streaks?.[streakType]?.current || 0,
        longestStreak: user.gamification?.streaks?.[streakType]?.longest || 0,
        emoji: this.getStreakEmoji(user.gamification?.streaks?.[streakType]?.current || 0)
      }));
    } catch (error) {
      throw new Error('Failed to get streak leaderboard: ' + error.message);
    }
  }
}

module.exports = new StreakService();