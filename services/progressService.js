/**
 * Progress Service
 * Provides comprehensive progress tracking and analytics for users
 */

const UserService = require('./userService');

class ProgressService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Get comprehensive progress data for a user
    async getProgressData(userId, timeframe = 'week') {
        try {
            const cacheKey = `progress_${userId}_${timeframe}`;
            const cached = this.cache.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }

            const user = await UserService.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const progressData = {
                stats: await this.calculateStats(user, timeframe),
                workoutProgress: await this.getWorkoutProgress(user, timeframe),
                bodyMetrics: await this.getBodyMetrics(user, timeframe),
                nutritionProgress: await this.getNutritionProgress(user, timeframe),
                achievements: await this.getAchievements(user),
                trends: await this.calculateTrends(user, timeframe),
                predictions: await this.getPredictions(user)
            };

            // Cache the result
            this.cache.set(cacheKey, {
                data: progressData,
                timestamp: Date.now()
            });

            return progressData;

        } catch (error) {
            console.error('Get progress data error:', error);
            throw error;
        }
    }

    // Calculate key statistics
    async calculateStats(user, timeframe) {
        const now = new Date();
        const timeframes = {
            today: 1,
            week: 7,
            month: 30,
            '3months': 90,
            year: 365,
            alltime: null
        };

        const days = timeframes[timeframe];
        const startDate = days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : null;

        const workouts = user.workouts || [];
        const nutritionLogs = user.nutritionLogs || [];
        const biometrics = user.biometrics || [];

        // Filter data by timeframe
        const filteredWorkouts = startDate 
            ? workouts.filter(w => new Date(w.date) >= startDate)
            : workouts;
        
        const filteredNutrition = startDate
            ? nutritionLogs.filter(n => new Date(n.date) >= startDate)
            : nutritionLogs;

        const filteredBiometrics = startDate
            ? biometrics.filter(b => new Date(b.date) >= startDate)
            : biometrics;

        // Calculate statistics
        const totalCaloriesBurned = filteredWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
        const totalActiveMinutes = filteredWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
        const totalSteps = this.estimateSteps(filteredWorkouts);
        const avgCaloriesPerDay = filteredNutrition.length > 0 
            ? filteredNutrition.reduce((sum, n) => sum + (n.totalCalories || 0), 0) / filteredNutrition.length
            : 0;

        // Calculate fitness score
        const fitnessScore = this.calculateFitnessScore(user, filteredWorkouts, filteredNutrition);

        // Calculate changes from previous period
        const previousPeriodStart = startDate ? new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000) : null;
        const previousWorkouts = previousPeriodStart && startDate
            ? workouts.filter(w => new Date(w.date) >= previousPeriodStart && new Date(w.date) < startDate)
            : [];

        const previousCalories = previousWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
        const previousMinutes = previousWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);

        const caloriesChange = previousCalories > 0 ? ((totalCaloriesBurned - previousCalories) / previousCalories * 100) : 0;
        const minutesChange = previousMinutes > 0 ? ((totalActiveMinutes - previousMinutes) / previousMinutes * 100) : 0;

        return {
            caloriesBurned: {
                value: totalCaloriesBurned,
                change: Math.round(caloriesChange),
                trend: caloriesChange >= 0 ? 'up' : 'down'
            },
            activeMinutes: {
                value: totalActiveMinutes,
                change: Math.round(minutesChange),
                trend: minutesChange >= 0 ? 'up' : 'down'
            },
            steps: {
                value: totalSteps,
                change: Math.round(Math.random() * 20 - 10), // Mock change
                trend: Math.random() > 0.5 ? 'up' : 'down'
            },
            fitnessScore: {
                value: fitnessScore,
                change: Math.round(Math.random() * 10 - 5), // Mock change
                trend: Math.random() > 0.5 ? 'up' : 'down'
            },
            workoutsCompleted: filteredWorkouts.length,
            avgCaloriesPerDay: Math.round(avgCaloriesPerDay)
        };
    }

    // Get workout progress data
    async getWorkoutProgress(user, timeframe) {
        const workouts = user.workouts || [];
        const now = new Date();
        
        // Get data for chart (last 7 days for week view, etc.)
        const chartDays = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 7;
        const chartData = [];
        
        for (let i = chartDays - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dayWorkouts = workouts.filter(w => {
                const workoutDate = new Date(w.date);
                return workoutDate.toDateString() === date.toDateString();
            });
            
            const dayCalories = dayWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
            
            chartData.push({
                date: date.toISOString().split('T')[0],
                label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                calories: dayCalories,
                workouts: dayWorkouts.length,
                duration: dayWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0)
            });
        }

        // Calculate workout type distribution
        const workoutTypes = {};
        workouts.forEach(w => {
            const type = w.type || 'General';
            workoutTypes[type] = (workoutTypes[type] || 0) + 1;
        });

        // Get recent workouts with progress comparison
        const recentWorkouts = workouts.slice(-10).map(workout => {
            // Find similar previous workout for comparison
            const similarWorkouts = workouts.filter(w => 
                w.type === workout.type && 
                new Date(w.date) < new Date(workout.date)
            );
            
            const lastSimilar = similarWorkouts[similarWorkouts.length - 1];
            let progress = null;
            
            if (lastSimilar) {
                const caloriesDiff = (workout.calories || 0) - (lastSimilar.calories || 0);
                const durationDiff = (workout.duration || 0) - (lastSimilar.duration || 0);
                
                progress = {
                    calories: caloriesDiff,
                    duration: durationDiff,
                    trend: caloriesDiff >= 0 ? 'improved' : 'declined'
                };
            }

            return {
                ...workout,
                progress,
                date: new Date(workout.date).toLocaleDateString()
            };
        });

        return {
            chartData,
            workoutTypes,
            recentWorkouts,
            totalWorkouts: workouts.length,
            avgCaloriesPerWorkout: workouts.length > 0 
                ? Math.round(workouts.reduce((sum, w) => sum + (w.calories || 0), 0) / workouts.length)
                : 0
        };
    }

    // Get body metrics progress
    async getBodyMetrics(user, timeframe) {
        const biometrics = user.biometrics || [];
        const now = new Date();
        
        // Sort by date
        const sortedBiometrics = biometrics.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Get chart data for weight and body fat
        const chartData = sortedBiometrics.slice(-12).map(b => ({
            date: new Date(b.date).toLocaleDateString('en-US', { month: 'short' }),
            weight: b.weight || null,
            bodyFat: b.bodyFat || null,
            muscleMass: b.muscleMass || null
        }));

        // Calculate changes
        const latest = sortedBiometrics[sortedBiometrics.length - 1];
        const previous = sortedBiometrics[sortedBiometrics.length - 2];
        
        let changes = {};
        if (latest && previous) {
            changes = {
                weight: latest.weight && previous.weight 
                    ? Math.round((latest.weight - previous.weight) * 10) / 10
                    : 0,
                bodyFat: latest.bodyFat && previous.bodyFat
                    ? Math.round((latest.bodyFat - previous.bodyFat) * 10) / 10
                    : 0,
                muscleMass: latest.muscleMass && previous.muscleMass
                    ? Math.round((latest.muscleMass - previous.muscleMass) * 10) / 10
                    : 0
            };
        }

        // Calculate BMI if we have current weight and height
        let bmi = null;
        if (latest?.weight && user.personalInfo?.height) {
            const heightInM = user.personalInfo.height / 100;
            bmi = Math.round((latest.weight / (heightInM * heightInM)) * 10) / 10;
        }

        return {
            chartData,
            current: latest || {},
            changes,
            bmi,
            totalMeasurements: biometrics.length
        };
    }

    // Get nutrition progress
    async getNutritionProgress(user, timeframe) {
        const nutritionLogs = user.nutritionLogs || [];
        const now = new Date();
        
        // Get recent nutrition data
        const chartDays = 7;
        const chartData = [];
        
        for (let i = chartDays - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dayLogs = nutritionLogs.filter(n => {
                const logDate = new Date(n.date);
                return logDate.toDateString() === date.toDateString();
            });
            
            const dayTotals = dayLogs.reduce((totals, log) => ({
                calories: totals.calories + (log.totalCalories || 0),
                protein: totals.protein + (log.totalProtein || 0),
                carbs: totals.carbs + (log.totalCarbs || 0),
                fat: totals.fat + (log.totalFat || 0),
                water: totals.water + (log.waterIntake || 0)
            }), { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 });
            
            chartData.push({
                date: date.toISOString().split('T')[0],
                label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                ...dayTotals
            });
        }

        // Calculate averages
        const totalDays = chartData.length;
        const averages = chartData.reduce((avg, day) => ({
            calories: avg.calories + day.calories / totalDays,
            protein: avg.protein + day.protein / totalDays,
            carbs: avg.carbs + day.carbs / totalDays,
            fat: avg.fat + day.fat / totalDays,
            water: avg.water + day.water / totalDays
        }), { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 });

        // Get goals (from user profile or defaults)
        const goals = {
            calories: user.fitnessGoals?.dailyCalories || 2000,
            protein: user.fitnessGoals?.protein || 150,
            carbs: user.fitnessGoals?.carbs || 250,
            fat: user.fitnessGoals?.fat || 65,
            water: 2500
        };

        // Calculate adherence percentages
        const adherence = {
            calories: goals.calories > 0 ? Math.round((averages.calories / goals.calories) * 100) : 0,
            protein: goals.protein > 0 ? Math.round((averages.protein / goals.protein) * 100) : 0,
            carbs: goals.carbs > 0 ? Math.round((averages.carbs / goals.carbs) * 100) : 0,
            fat: goals.fat > 0 ? Math.round((averages.fat / goals.fat) * 100) : 0,
            water: goals.water > 0 ? Math.round((averages.water / goals.water) * 100) : 0
        };

        return {
            chartData,
            averages: {
                calories: Math.round(averages.calories),
                protein: Math.round(averages.protein),
                carbs: Math.round(averages.carbs),
                fat: Math.round(averages.fat),
                water: Math.round(averages.water)
            },
            goals,
            adherence,
            totalLogs: nutritionLogs.length
        };
    }

    // Get achievements and milestones
    async getAchievements(user) {
        const achievements = [];
        const workouts = user.workouts || [];
        const nutritionLogs = user.nutritionLogs || [];
        
        // Workout achievements
        if (workouts.length >= 1) {
            achievements.push({
                id: 'first_workout',
                title: 'First Workout',
                description: 'Completed your first workout',
                icon: '🏋️',
                date: workouts[0].date,
                category: 'workout'
            });
        }
        
        if (workouts.length >= 10) {
            achievements.push({
                id: 'workout_10',
                title: 'Workout Warrior',
                description: 'Completed 10 workouts',
                icon: '💪',
                date: workouts[9].date,
                category: 'workout'
            });
        }
        
        if (workouts.length >= 50) {
            achievements.push({
                id: 'workout_50',
                title: 'Fitness Enthusiast',
                description: 'Completed 50 workouts',
                icon: '🔥',
                date: workouts[49].date,
                category: 'workout'
            });
        }

        // Nutrition achievements
        if (nutritionLogs.length >= 7) {
            achievements.push({
                id: 'nutrition_week',
                title: 'Nutrition Tracker',
                description: 'Logged nutrition for 7 days',
                icon: '🥗',
                date: nutritionLogs[6].date,
                category: 'nutrition'
            });
        }

        // Calculate streaks
        const workoutStreak = this.calculateWorkoutStreak(workouts);
        const nutritionStreak = this.calculateNutritionStreak(nutritionLogs);

        if (workoutStreak >= 7) {
            achievements.push({
                id: 'workout_streak_7',
                title: 'Week Warrior',
                description: `${workoutStreak} day workout streak`,
                icon: '🔥',
                date: new Date(),
                category: 'streak'
            });
        }

        return {
            achievements: achievements.slice(-6), // Show last 6 achievements
            totalAchievements: achievements.length,
            workoutStreak,
            nutritionStreak
        };
    }

    // Calculate trends and insights
    async calculateTrends(user, timeframe) {
        const workouts = user.workouts || [];
        const nutritionLogs = user.nutritionLogs || [];
        
        const trends = [];

        // Workout frequency trend
        const recentWorkouts = workouts.slice(-14); // Last 2 weeks
        const firstWeekWorkouts = recentWorkouts.slice(0, 7);
        const secondWeekWorkouts = recentWorkouts.slice(7, 14);
        
        if (secondWeekWorkouts.length > firstWeekWorkouts.length) {
            trends.push({
                type: 'positive',
                title: 'Workout Frequency Increasing',
                description: `You've increased your workout frequency by ${secondWeekWorkouts.length - firstWeekWorkouts.length} sessions this week`,
                icon: '📈'
            });
        } else if (secondWeekWorkouts.length < firstWeekWorkouts.length) {
            trends.push({
                type: 'negative',
                title: 'Workout Frequency Decreasing',
                description: `Your workout frequency decreased by ${firstWeekWorkouts.length - secondWeekWorkouts.length} sessions this week`,
                icon: '📉'
            });
        }

        // Calorie burn trend
        const firstWeekCalories = firstWeekWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
        const secondWeekCalories = secondWeekWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
        
        if (secondWeekCalories > firstWeekCalories) {
            trends.push({
                type: 'positive',
                title: 'Calorie Burn Improving',
                description: `You burned ${secondWeekCalories - firstWeekCalories} more calories this week`,
                icon: '🔥'
            });
        }

        // Consistency trend
        const consistency = this.calculateConsistency(workouts);
        if (consistency >= 0.8) {
            trends.push({
                type: 'positive',
                title: 'Excellent Consistency',
                description: `You're maintaining ${Math.round(consistency * 100)}% workout consistency`,
                icon: '🎯'
            });
        } else if (consistency < 0.5) {
            trends.push({
                type: 'warning',
                title: 'Consistency Needs Improvement',
                description: `Your workout consistency is ${Math.round(consistency * 100)}%. Try to maintain a regular schedule`,
                icon: '⚠️'
            });
        }

        return trends;
    }

    // Get predictions using the prediction service
    async getPredictions(user) {
        try {
            const progressPredictionService = require('./progressPredictionService');
            
            const userProfile = {
                personalInfo: user.personalInfo,
                fitnessGoals: user.fitnessGoals,
                healthInfo: user.healthInfo
            };

            const fitnessData = {
                workoutHistory: user.workouts || [],
                goals: user.fitnessGoals || {},
                primaryGoal: {
                    type: user.fitnessGoals?.primaryGoal || 'general_fitness',
                    currentProgress: 50, // Mock progress
                    timelineWeeks: 12
                },
                progressHistory: [], // Mock progress history
                currentWorkout: {
                    intensity: 6,
                    recoveryHours: 24,
                    formScore: 85
                }
            };

            const predictions = await progressPredictionService.getComprehensivePredictions(
                user._id,
                userProfile,
                fitnessData
            );

            return predictions.success ? predictions.predictions : null;

        } catch (error) {
            console.error('Get predictions error:', error);
            return null;
        }
    }

    // Helper methods
    estimateSteps(workouts) {
        // Estimate steps based on workouts (rough calculation)
        return workouts.reduce((steps, workout) => {
            const duration = workout.duration || 0;
            const type = workout.type || '';
            
            let stepsPerMinute = 0;
            if (type.toLowerCase().includes('cardio') || type.toLowerCase().includes('running')) {
                stepsPerMinute = 120;
            } else if (type.toLowerCase().includes('walking')) {
                stepsPerMinute = 100;
            } else {
                stepsPerMinute = 30; // General activity
            }
            
            return steps + (duration * stepsPerMinute);
        }, 0);
    }

    calculateFitnessScore(user, workouts, nutritionLogs) {
        let score = 50; // Base score
        
        // Workout frequency (0-25 points)
        const workoutsPerWeek = workouts.length / 4; // Assuming 4 weeks of data
        score += Math.min(workoutsPerWeek * 5, 25);
        
        // Nutrition consistency (0-15 points)
        const nutritionDays = nutritionLogs.length;
        score += Math.min(nutritionDays * 0.5, 15);
        
        // Workout variety (0-10 points)
        const workoutTypes = new Set(workouts.map(w => w.type)).size;
        score += Math.min(workoutTypes * 2, 10);
        
        return Math.min(Math.round(score), 100);
    }

    calculateWorkoutStreak(workouts) {
        if (!workouts.length) return 0;
        
        const sortedWorkouts = workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
        let streak = 0;
        let currentDate = new Date();
        
        for (const workout of sortedWorkouts) {
            const workoutDate = new Date(workout.date);
            const daysDiff = Math.floor((currentDate - workoutDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff <= streak + 1) {
                streak++;
                currentDate = workoutDate;
            } else {
                break;
            }
        }
        
        return streak;
    }

    calculateNutritionStreak(nutritionLogs) {
        if (!nutritionLogs.length) return 0;
        
        const sortedLogs = nutritionLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        let streak = 0;
        let currentDate = new Date();
        
        for (const log of sortedLogs) {
            const logDate = new Date(log.date);
            const daysDiff = Math.floor((currentDate - logDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff <= streak + 1) {
                streak++;
                currentDate = logDate;
            } else {
                break;
            }
        }
        
        return streak;
    }

    calculateConsistency(workouts) {
        if (workouts.length < 7) return 0;
        
        const last30Days = workouts.filter(w => {
            const workoutDate = new Date(w.date);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            return workoutDate >= thirtyDaysAgo;
        });
        
        return last30Days.length / 30; // Consistency over 30 days
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }

    // Get cache status
    getCacheStatus() {
        return {
            size: this.cache.size,
            timeout: this.cacheTimeout
        };
    }
}

module.exports = new ProgressService();