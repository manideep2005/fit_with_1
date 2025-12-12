class InsightsService {
    calculateHealthScore(user) {
        const workouts = user.workouts || [];
        const nutritionLogs = user.nutritionLogs || [];
        const biometrics = user.biometrics || [];
        const streaks = user.gamification?.streaks || {};
        
        let score = 0;
        const today = new Date();
        const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // Workout consistency (40 points)
        const weeklyWorkouts = workouts.filter(w => new Date(w.date) >= weekStart);
        const workoutScore = Math.min((weeklyWorkouts.length / 5) * 40, 40);
        score += workoutScore;
        
        // Nutrition tracking (30 points)
        const weeklyNutrition = nutritionLogs.filter(n => new Date(n.date) >= weekStart);
        const nutritionScore = Math.min((weeklyNutrition.length / 7) * 30, 30);
        score += nutritionScore;
        
        // Streaks (20 points)
        const workoutStreak = streaks.workout?.current || 0;
        const streakScore = Math.min((workoutStreak / 7) * 20, 20);
        score += streakScore;
        
        // Progress tracking (10 points)
        const progressScore = biometrics.length > 0 ? 10 : 0;
        score += progressScore;
        
        return Math.round(score);
    }
    
    analyzeTrends(user) {
        const workouts = user.workouts || [];
        const nutritionLogs = user.nutritionLogs || [];
        const today = new Date();
        
        // Last 2 weeks comparison
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastWeek = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
        
        const thisWeekWorkouts = workouts.filter(w => new Date(w.date) >= thisWeek).length;
        const lastWeekWorkouts = workouts.filter(w => 
            new Date(w.date) >= lastWeek && new Date(w.date) < thisWeek
        ).length;
        
        const workoutTrend = thisWeekWorkouts - lastWeekWorkouts;
        
        const thisWeekNutrition = nutritionLogs.filter(n => new Date(n.date) >= thisWeek).length;
        const lastWeekNutrition = nutritionLogs.filter(n => 
            new Date(n.date) >= lastWeek && new Date(n.date) < thisWeek
        ).length;
        
        const nutritionTrend = thisWeekNutrition - lastWeekNutrition;
        
        return {
            workout: {
                trend: workoutTrend > 0 ? 'up' : workoutTrend < 0 ? 'down' : 'stable',
                change: workoutTrend,
                message: workoutTrend > 0 ? `+${workoutTrend} more workouts this week` : 
                        workoutTrend < 0 ? `${Math.abs(workoutTrend)} fewer workouts this week` : 
                        'Consistent workout pattern'
            },
            nutrition: {
                trend: nutritionTrend > 0 ? 'up' : nutritionTrend < 0 ? 'down' : 'stable',
                change: nutritionTrend,
                message: nutritionTrend > 0 ? 'Better nutrition tracking' : 
                        nutritionTrend < 0 ? 'Less nutrition tracking' : 
                        'Steady nutrition habits'
            }
        };
    }
    
    generateSmartPredictions(user) {
        const workouts = user.workouts || [];
        const nutritionLogs = user.nutritionLogs || [];
        const goals = user.fitnessGoals || {};
        const streaks = user.gamification?.streaks || {};
        
        const predictions = [];
        
        // Workout prediction
        const avgWorkoutsPerWeek = workouts.length > 0 ? 
            (workouts.length / Math.max(1, Math.ceil((new Date() - new Date(workouts[0].date)) / (7 * 24 * 60 * 60 * 1000)))) : 0;
        
        if (avgWorkoutsPerWeek >= 3) {
            predictions.push({
                type: 'workout',
                icon: '🎯',
                title: 'Goal Achievement',
                prediction: 'You\'re on track to exceed your fitness goals this month!',
                confidence: 85,
                timeframe: '2 weeks'
            });
        } else {
            predictions.push({
                type: 'workout',
                icon: '⚡',
                title: 'Boost Needed',
                prediction: 'Add 1 more workout per week to reach your goals faster.',
                confidence: 75,
                timeframe: '1 week'
            });
        }
        
        // Streak prediction
        const currentStreak = streaks.workout?.current || 0;
        if (currentStreak >= 5) {
            predictions.push({
                type: 'streak',
                icon: '🔥',
                title: 'Streak Milestone',
                prediction: `You could reach a ${currentStreak + 7}-day streak by next week!`,
                confidence: 90,
                timeframe: '7 days'
            });
        }
        
        // Weight prediction (if goal is weight loss)
        if (goals.primaryGoal === 'weight-loss' && workouts.length >= 4) {
            predictions.push({
                type: 'weight',
                icon: '📉',
                title: 'Weight Progress',
                prediction: 'Continue current pace to lose 1-2 lbs this month.',
                confidence: 70,
                timeframe: '4 weeks'
            });
        }
        
        return predictions.slice(0, 3);
    }

    generateDailyInsights(user) {
        const insights = [];
        const today = new Date();
        const workouts = user.workouts || [];
        const nutritionLogs = user.nutritionLogs || [];
        
        // Add Health Score insight
        const healthScore = this.calculateHealthScore(user);
        insights.push({
            type: 'health-score',
            icon: '📊',
            title: 'Health Score',
            message: `Your current health score is ${healthScore}/100`,
            score: healthScore,
            action: 'View details',
            priority: 'high'
        });
        
        // Add Trend Analysis
        const trends = this.analyzeTrends(user);
        insights.push({
            type: 'trend-analysis',
            icon: '📈',
            title: 'Trend Analysis',
            message: trends.workout.message,
            trend: trends.workout.trend,
            action: 'View trends',
            priority: 'medium'
        });
        
        // Add Smart Predictions
        const predictions = this.generateSmartPredictions(user);
        if (predictions.length > 0) {
            insights.push({
                type: 'smart-predictions',
                icon: '🔮',
                title: 'Smart Predictions',
                message: predictions[0].prediction,
                confidence: predictions[0].confidence,
                action: 'View all predictions',
                priority: 'medium'
            });
        }
        
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
        if (goal === 'weight-loss') {
            insights.push({
                type: 'tip',
                icon: '🎯',
                title: 'Weight Loss Tip',
                message: 'Focus on creating a caloric deficit through balanced nutrition and regular exercise.',
                action: 'View meal plan',
                priority: 'medium'
            });
        } else if (goal === 'muscle-gain') {
            insights.push({
                type: 'tip',
                icon: '💪',
                title: 'Muscle Building Tip',
                message: 'Ensure adequate protein intake (1.6-2.2g per kg body weight) for optimal muscle growth.',
                action: 'Track protein',
                priority: 'medium'
            });
        }

        return insights.slice(0, 6); // Limit to 6 insights
    }

    generateWeeklyReport(user) {
        const workouts = user.workouts || [];
        const nutritionLogs = user.nutritionLogs || [];
        const today = new Date();
        const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const weeklyWorkouts = workouts.filter(w => new Date(w.date) >= weekStart);
        const weeklyNutrition = nutritionLogs.filter(n => new Date(n.date) >= weekStart);
        
        const totalCalories = weeklyNutrition.reduce((sum, log) => sum + (log.totalCalories || 0), 0);
        const totalWorkoutTime = weeklyWorkouts.reduce((sum, workout) => sum + (workout.duration || 0), 0);
        
        return {
            period: 'Last 7 days',
            workouts: {
                count: weeklyWorkouts.length,
                totalTime: totalWorkoutTime,
                averagePerDay: Math.round(totalWorkoutTime / 7)
            },
            nutrition: {
                totalCalories: totalCalories,
                averagePerDay: Math.round(totalCalories / 7),
                trackingDays: weeklyNutrition.length
            },
            achievements: [
                weeklyWorkouts.length >= 5 ? 'Consistent workout routine' : null,
                weeklyNutrition.length >= 6 ? 'Great nutrition tracking' : null,
                totalWorkoutTime >= 300 ? 'Active lifestyle maintained' : null
            ].filter(Boolean)
        };
    }
}

module.exports = new InsightsService();