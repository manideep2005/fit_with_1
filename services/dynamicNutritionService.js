const User = require('../models/User');
const moment = require('moment');

class DynamicNutritionService {
  // Calculate dynamic calorie goals based on activity
  async calculateDynamicGoals(userId) {
    try {
      const user = await User.findById(userId);
      const today = moment().startOf('day');
      
      // Get today's workouts
      const todayWorkouts = user.workouts?.filter(w => 
        moment(w.date).isSame(today, 'day')
      ) || [];
      
      const totalCaloriesBurned = todayWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
      
      // Base goals from user profile
      const baseCalories = user.fitnessGoals?.dailyCalories || 2000;
      const baseProtein = user.fitnessGoals?.protein || 150;
      
      // Dynamic adjustments
      const adjustedCalories = baseCalories + (totalCaloriesBurned * 0.5); // Eat back 50% of burned calories
      const adjustedProtein = baseProtein + (totalCaloriesBurned > 300 ? 20 : 0); // Extra protein on heavy workout days
      
      return {
        calories: Math.round(adjustedCalories),
        protein: Math.round(adjustedProtein),
        carbs: Math.round(adjustedCalories * 0.45 / 4), // 45% of calories from carbs
        fat: Math.round(adjustedCalories * 0.25 / 9), // 25% from fat
        water: 2500 + (totalCaloriesBurned * 2), // Extra water for workouts
        adjustmentReason: totalCaloriesBurned > 0 ? `+${Math.round(totalCaloriesBurned * 0.5)} calories from ${todayWorkouts.length} workout(s)` : null
      };
    } catch (error) {
      throw new Error('Failed to calculate dynamic goals: ' + error.message);
    }
  }

  // Get real-time nutrition progress
  async getRealTimeProgress(userId) {
    try {
      const user = await User.findById(userId);
      const today = moment().startOf('day');
      
      // Get today's nutrition logs
      const todayLogs = user.nutritionLogs?.filter(log => 
        moment(log.date).isSame(today, 'day')
      ) || [];
      
      // Calculate totals
      const totals = todayLogs.reduce((sum, log) => ({
        calories: sum.calories + (log.totalCalories || 0),
        protein: sum.protein + (log.totalProtein || 0),
        carbs: sum.carbs + (log.totalCarbs || 0),
        fat: sum.fat + (log.totalFat || 0),
        water: sum.water + (log.waterIntake || 0)
      }), { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 });
      
      // Get dynamic goals
      const goals = await this.calculateDynamicGoals(userId);
      
      // Calculate percentages
      const progress = {
        calories: { current: totals.calories, goal: goals.calories, percentage: Math.round((totals.calories / goals.calories) * 100) },
        protein: { current: totals.protein, goal: goals.protein, percentage: Math.round((totals.protein / goals.protein) * 100) },
        carbs: { current: totals.carbs, goal: goals.carbs, percentage: Math.round((totals.carbs / goals.carbs) * 100) },
        fat: { current: totals.fat, goal: goals.fat, percentage: Math.round((totals.fat / goals.fat) * 100) },
        water: { current: totals.water, goal: goals.water, percentage: Math.round((totals.water / goals.water) * 100) }
      };
      
      return {
        progress,
        adjustmentReason: goals.adjustmentReason,
        streak: await this.calculateStreak(userId),
        lastMeal: todayLogs.length > 0 ? todayLogs[todayLogs.length - 1] : null
      };
    } catch (error) {
      throw new Error('Failed to get real-time progress: ' + error.message);
    }
  }

  // Calculate nutrition streak
  async calculateStreak(userId) {
    try {
      const user = await User.findById(userId);
      let streak = 0;
      let currentDate = moment().startOf('day');
      
      // Check each day backwards until we find a day without proper nutrition
      while (true) {
        const dayLogs = user.nutritionLogs?.filter(log => 
          moment(log.date).isSame(currentDate, 'day')
        ) || [];
        
        const dayCalories = dayLogs.reduce((sum, log) => sum + (log.totalCalories || 0), 0);
        
        // Consider it a "good day" if they logged at least 1000 calories
        if (dayCalories >= 1000) {
          streak++;
          currentDate.subtract(1, 'day');
        } else {
          break;
        }
        
        // Limit to 365 days to prevent infinite loops
        if (streak >= 365) break;
      }
      
      return streak;
    } catch (error) {
      return 0;
    }
  }

  // Get smart meal suggestions
  async getSmartSuggestions(userId) {
    try {
      const progress = await this.getRealTimeProgress(userId);
      const suggestions = [];
      
      const remaining = {
        calories: progress.progress.calories.goal - progress.progress.calories.current,
        protein: progress.progress.protein.goal - progress.progress.protein.current,
        carbs: progress.progress.carbs.goal - progress.progress.carbs.current,
        fat: progress.progress.fat.goal - progress.progress.fat.current
      };
      
      // Generate suggestions based on remaining macros
      if (remaining.protein > 30) {
        suggestions.push({
          type: 'protein',
          message: `You need ${remaining.protein}g more protein today`,
          foods: ['Greek yogurt', 'Chicken breast', 'Protein shake', 'Eggs']
        });
      }
      
      if (remaining.calories > 500) {
        suggestions.push({
          type: 'meal',
          message: `You have ${remaining.calories} calories left for today`,
          foods: ['Balanced dinner', 'Healthy snack', 'Post-workout meal']
        });
      }
      
      if (progress.progress.water.percentage < 50) {
        suggestions.push({
          type: 'hydration',
          message: 'You\'re behind on water intake',
          foods: ['Water', 'Herbal tea', 'Coconut water']
        });
      }
      
      return suggestions;
    } catch (error) {
      return [];
    }
  }

  // Quick log common foods
  async quickLogFood(userId, foodName, quantity = 1) {
    try {
      const commonFoods = {
        'banana': { calories: 105, protein: 1, carbs: 27, fat: 0 },
        'apple': { calories: 95, protein: 0, carbs: 25, fat: 0 },
        'egg': { calories: 70, protein: 6, carbs: 1, fat: 5 },
        'protein shake': { calories: 120, protein: 25, carbs: 3, fat: 1 },
        'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 4 },
        'rice': { calories: 130, protein: 3, carbs: 28, fat: 0 },
        'oatmeal': { calories: 150, protein: 5, carbs: 27, fat: 3 }
      };
      
      const food = commonFoods[foodName.toLowerCase()];
      if (!food) throw new Error('Food not found in quick database');
      
      const nutritionData = {
        date: new Date(),
        meals: [{
          name: foodName,
          quantity: quantity,
          calories: food.calories * quantity,
          protein: food.protein * quantity,
          carbs: food.carbs * quantity,
          fat: food.fat * quantity
        }],
        totalCalories: food.calories * quantity,
        totalProtein: food.protein * quantity,
        totalCarbs: food.carbs * quantity,
        totalFat: food.fat * quantity
      };
      
      const user = await User.findById(userId);
      user.nutritionLogs.push(nutritionData);
      await user.save();
      
      return nutritionData;
    } catch (error) {
      throw new Error('Failed to quick log food: ' + error.message);
    }
  }

  // Get nutrition insights
  async getNutritionInsights(userId) {
    try {
      const user = await User.findById(userId);
      const last7Days = user.nutritionLogs?.filter(log => 
        moment(log.date).isAfter(moment().subtract(7, 'days'))
      ) || [];
      
      if (last7Days.length === 0) {
        return ['Start logging your meals to get personalized insights!'];
      }
      
      const avgCalories = last7Days.reduce((sum, log) => sum + log.totalCalories, 0) / last7Days.length;
      const avgProtein = last7Days.reduce((sum, log) => sum + log.totalProtein, 0) / last7Days.length;
      
      const insights = [];
      
      if (avgCalories < 1200) {
        insights.push('⚠️ Your average calorie intake is quite low. Consider adding healthy snacks.');
      }
      
      if (avgProtein < 0.8 * (user.personalInfo?.weight || 70)) {
        insights.push('💪 Try to increase protein intake for better muscle recovery.');
      }
      
      const streak = await this.calculateStreak(userId);
      if (streak >= 7) {
        insights.push(`🔥 Amazing! You've been consistent for ${streak} days!`);
      }
      
      return insights.length > 0 ? insights : ['Keep up the great work with your nutrition tracking!'];
    } catch (error) {
      return ['Unable to generate insights at the moment.'];
    }
  }
}

module.exports = new DynamicNutritionService();