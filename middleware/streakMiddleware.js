const streakService = require('../services/streakService');

// Middleware to update streaks after workout logging
const updateWorkoutStreak = async (req, res, next) => {
  try {
    if (req.user && req.user._id) {
      // Update streaks in background
      streakService.updateUserStreaks(req.user._id).catch(err => {
        console.error('Failed to update workout streak:', err);
      });
      
      // Check for streak rewards
      const streakStatus = await streakService.getStreakStatus(req.user._id);
      if (streakStatus.workout.current > 0) {
        streakService.awardStreakRewards(req.user._id, 'workout', streakStatus.workout.current).catch(err => {
          console.error('Failed to award workout streak rewards:', err);
        });
      }
    }
    next();
  } catch (error) {
    console.error('Workout streak middleware error:', error);
    next(); // Don't block the request
  }
};

// Middleware to update streaks after nutrition logging
const updateNutritionStreak = async (req, res, next) => {
  try {
    if (req.user && req.user._id) {
      // Update streaks in background
      streakService.updateUserStreaks(req.user._id).catch(err => {
        console.error('Failed to update nutrition streak:', err);
      });
      
      // Check for streak rewards
      const streakStatus = await streakService.getStreakStatus(req.user._id);
      if (streakStatus.nutrition.current > 0) {
        streakService.awardStreakRewards(req.user._id, 'nutrition', streakStatus.nutrition.current).catch(err => {
          console.error('Failed to award nutrition streak rewards:', err);
        });
      }
    }
    next();
  } catch (error) {
    console.error('Nutrition streak middleware error:', error);
    next(); // Don't block the request
  }
};

// Middleware to update login streak
const updateLoginStreak = async (req, res, next) => {
  try {
    if (req.user && req.user._id) {
      // Update login streak in background
      streakService.updateUserStreaks(req.user._id).catch(err => {
        console.error('Failed to update login streak:', err);
      });
    }
    next();
  } catch (error) {
    console.error('Login streak middleware error:', error);
    next(); // Don't block the request
  }
};

module.exports = {
  updateWorkoutStreak,
  updateNutritionStreak,
  updateLoginStreak
};