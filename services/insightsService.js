class InsightsService {
    generateDailyInsights(user) {
        const insights = [];
        const today = new Date();
        const workouts = user.workouts || [];
        const nutritionLogs = user.nutritionLogs || [];
        
        // Workout insights
        const recentWorkouts = workouts.filter(w => 
            new Date(w.date) > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        );
        
        if (recentWorkouts.length === 0) {
            insights.push({
                type: 'motivation',
                icon: '💪',
                title: 'Time to Move!',
                message: 'You haven\'t worked out this week. A 15-minute walk can boost your energy!',
                action: 'Start a quick workout',
                priority: 'high'
            });
        } else if (recentWorkouts.length >= 3) {
            insights.push({
                type: 'celebration',
                icon: '🎉',
                title: 'Great Progress!',
                message: `You've completed ${recentWorkouts.length} workouts this week. Keep it up!`,
                action: 'View progress',
                priority: 'medium'
            });
        }

        // Nutrition insights
        const todayNutrition = nutritionLogs.filter(log => 
            new Date(log.date).toDateString() === today.toDateString()
        );
        
        const totalWater = todayNutrition.reduce((sum, log) => sum + (log.waterIntake || 0), 0);
        
        if (totalWater < 1500) {
            insights.push({
                type: 'health',
                icon: '💧',
                title: 'Hydration Check',
                message: `You've had ${totalWater}ml of water today. Aim for 2500ml for optimal health.`,
                action: 'Log water intake',
                priority: 'medium'
            });
        }

        // Streak insights
        const streaks = user.gamification?.streaks || {};
        if (streaks.workout?.current >= 3) {
            insights.push({
                type: 'streak',
                icon: '🔥',
                title: 'Streak Power!',
                message: `${streaks.workout.current} day workout streak! Don't break the chain.`,
                action: 'Continue streak',
                priority: 'high'
            });
        }

        // Personalized tips based on goals
        const goal = user.fitnessGoals?.primaryGoal;
        if (goal === 'weight-loss' && recentWorkouts.length > 0) {
            insights.push({
                type: 'tip',
                icon: '🎯',
                title: 'Weight Loss Tip',
                message: 'Combine your workouts with a slight calorie deficit for optimal results.',
                action: 'View nutrition plan',
                priority: 'low'
            });
        }

        return insights.slice(0, 4); // Return top 4 insights
    }

    generateWeeklyReport(user) {
        const workouts = user.workouts || [];
        const nutritionLogs = user.nutritionLogs || [];
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);

        const weeklyWorkouts = workouts.filter(w => new Date(w.date) >= weekStart);
        const weeklyNutrition = nutritionLogs.filter(n => new Date(n.date) >= weekStart);

        return {
            workouts: {
                count: weeklyWorkouts.length,
                totalCalories: weeklyWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0),
                totalDuration: weeklyWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0)
            },
            nutrition: {
                logsCount: weeklyNutrition.length,
                avgCalories: weeklyNutrition.length > 0 ? 
                    Math.round(weeklyNutrition.reduce((sum, n) => sum + (n.totalCalories || 0), 0) / weeklyNutrition.length) : 0,
                totalWater: weeklyNutrition.reduce((sum, n) => sum + (n.waterIntake || 0), 0)
            },
            insights: this.generateDailyInsights(user)
        };
    }
}

module.exports = new InsightsService();