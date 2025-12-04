/**
 * Smart Notifications Service
 * AI-powered personalized notifications for user engagement
 */

const notificationService = require('./notificationService');

class SmartNotificationService {
    constructor() {
        this.notificationQueue = [];
        this.userPreferences = new Map();
        this.notificationHistory = new Map();
        this.aiInsights = new Map();
        this.initializeScheduledNotifications();
    }

    initializeScheduledNotifications() {
        // Fallback implementation without cron
        console.log('📱 Smart notifications initialized (cron disabled)');
        
        // Optional: Set up simple intervals for basic scheduling
        // setInterval(() => this.sendMorningMotivation(), 24 * 60 * 60 * 1000); // Daily
    }

    async registerUser(userId, preferences = {}) {
        try {
            const defaultPreferences = {
                workoutReminders: true,
                nutritionReminders: true,
                progressUpdates: true,
                motivationalMessages: true,
                hydrationReminders: true,
                streakNotifications: true,
                challengeUpdates: true,
                socialNotifications: true,
                preferredTime: {
                    morning: '08:00',
                    evening: '18:00'
                },
                frequency: 'daily', // daily, weekly, minimal
                timezone: 'UTC'
            };

            this.userPreferences.set(userId, {
                ...defaultPreferences,
                ...preferences,
                registeredAt: Date.now()
            });

            // Initialize user history
            this.notificationHistory.set(userId, []);
            this.aiInsights.set(userId, {
                engagementScore: 0.5,
                preferredTopics: [],
                bestTimes: [],
                responseRate: 0
            });

            return {
                success: true,
                message: 'Smart notifications enabled'
            };

        } catch (error) {
            console.error('Register user error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendPersonalizedNotification(userId, type, data = {}) {
        try {
            const preferences = this.userPreferences.get(userId);
            if (!preferences || !preferences[type]) {
                return { success: false, reason: 'Notifications disabled for this type' };
            }

            const insights = this.aiInsights.get(userId);
            const notification = await this.generateSmartNotification(userId, type, data, insights);

            if (!notification) {
                return { success: false, reason: 'No suitable notification generated' };
            }

            // Send notification
            const result = await this.deliverNotification(userId, notification);

            // Track notification
            this.trackNotification(userId, notification, result);

            return result;

        } catch (error) {
            console.error('Send personalized notification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async generateSmartNotification(userId, type, data, insights) {
        const templates = this.getNotificationTemplates();
        const userHistory = this.notificationHistory.get(userId) || [];
        
        // AI-powered notification generation
        switch (type) {
            case 'workoutReminder':
                return this.generateWorkoutReminder(data, insights, userHistory);
            
            case 'nutritionReminder':
                return this.generateNutritionReminder(data, insights);
            
            case 'progressUpdate':
                return this.generateProgressUpdate(data, insights);
            
            case 'motivationalMessage':
                return this.generateMotivationalMessage(data, insights);
            
            case 'streakNotification':
                return this.generateStreakNotification(data, insights);
            
            case 'challengeUpdate':
                return this.generateChallengeUpdate(data, insights);
            
            case 'socialNotification':
                return this.generateSocialNotification(data, insights);
            
            case 'hydrationReminder':
                return this.generateHydrationReminder(data, insights);
            
            default:
                return null;
        }
    }

    generateWorkoutReminder(data, insights, history) {
        const { lastWorkout, preferredTime, workoutStreak } = data;
        const daysSinceLastWorkout = lastWorkout ? 
            Math.floor((Date.now() - new Date(lastWorkout).getTime()) / (1000 * 60 * 60 * 24)) : 0;

        let title, body, priority;

        if (daysSinceLastWorkout === 0) {
            // Already worked out today
            return null;
        } else if (daysSinceLastWorkout === 1) {
            title = "Ready for another great workout? 💪";
            body = "You crushed it yesterday! Let's keep the momentum going.";
            priority = 'normal';
        } else if (daysSinceLastWorkout <= 3) {
            title = "Your muscles are calling! 🏋️‍♀️";
            body = `It's been ${daysSinceLastWorkout} days. Time to get back in there!`;
            priority = 'high';
        } else {
            title = "We miss you! Come back stronger 🔥";
            body = "Every champion has setbacks. Today is your comeback day!";
            priority = 'high';
        }

        // Add streak motivation
        if (workoutStreak > 0) {
            body += ` Don't break your ${workoutStreak}-day streak!`;
        }

        return {
            type: 'workoutReminder',
            title: title,
            body: body,
            priority: priority,
            data: {
                action: 'open_workouts',
                daysSince: daysSinceLastWorkout,
                streak: workoutStreak
            },
            scheduledFor: Date.now()
        };
    }

    generateNutritionReminder(data, insights) {
        const { todayCalories, targetCalories, waterIntake, targetWater } = data;
        const calorieProgress = todayCalories / targetCalories;
        const waterProgress = waterIntake / targetWater;

        let title, body;

        if (calorieProgress < 0.3) {
            title = "Fuel your body! 🍎";
            body = "You've only logged a few calories today. Don't forget to eat well!";
        } else if (calorieProgress > 1.2) {
            title = "Mindful eating reminder 🥗";
            body = "You're over your calorie goal. Consider lighter options for dinner.";
        } else if (waterProgress < 0.5) {
            title = "Hydration check! 💧";
            body = `You're at ${Math.round(waterProgress * 100)}% of your water goal. Keep sipping!`;
        } else {
            return null; // No reminder needed
        }

        return {
            type: 'nutritionReminder',
            title: title,
            body: body,
            priority: 'normal',
            data: {
                action: 'open_nutrition',
                calorieProgress: Math.round(calorieProgress * 100),
                waterProgress: Math.round(waterProgress * 100)
            }
        };
    }

    generateProgressUpdate(data, insights) {
        const { weeklyStats, achievements, improvements } = data;
        
        if (!weeklyStats) return null;

        const workoutIncrease = weeklyStats.workoutIncrease || 0;
        const weightChange = weeklyStats.weightChange || 0;

        let title, body;

        if (workoutIncrease > 0) {
            title = "Amazing progress! 📈";
            body = `You increased your workouts by ${workoutIncrease}% this week!`;
        } else if (Math.abs(weightChange) > 0.5) {
            const direction = weightChange > 0 ? 'gained' : 'lost';
            title = "Body composition update 📊";
            body = `You've ${direction} ${Math.abs(weightChange).toFixed(1)} lbs this week.`;
        } else if (achievements && achievements.length > 0) {
            title = "New achievement unlocked! 🏆";
            body = `Congratulations on: ${achievements[0].name}`;
        } else {
            title = "Keep up the consistency! 💯";
            body = "Small daily improvements lead to big results!";
        }

        return {
            type: 'progressUpdate',
            title: title,
            body: body,
            priority: 'normal',
            data: {
                action: 'open_progress',
                stats: weeklyStats,
                achievements: achievements
            }
        };
    }

    generateMotivationalMessage(data, insights) {
        const motivationalMessages = [
            {
                title: "You're stronger than you think! 💪",
                body: "Every workout is a step closer to your goals."
            },
            {
                title: "Progress, not perfection! 🎯",
                body: "Small consistent actions create extraordinary results."
            },
            {
                title: "Your future self will thank you! 🌟",
                body: "The work you put in today pays dividends tomorrow."
            },
            {
                title: "Champions are made in training! 🏆",
                body: "Every rep, every set, every day matters."
            },
            {
                title: "Believe in your journey! ✨",
                body: "You have everything it takes to succeed."
            }
        ];

        // Select based on user's engagement score
        const messageIndex = Math.floor(insights.engagementScore * motivationalMessages.length);
        const message = motivationalMessages[Math.min(messageIndex, motivationalMessages.length - 1)];

        return {
            type: 'motivationalMessage',
            title: message.title,
            body: message.body,
            priority: 'low',
            data: {
                action: 'open_dashboard',
                category: 'motivation'
            }
        };
    }

    generateStreakNotification(data, insights) {
        const { workoutStreak, nutritionStreak, type } = data;
        const streak = type === 'workout' ? workoutStreak : nutritionStreak;

        if (streak < 3) return null; // Only notify for streaks of 3+

        let title, body;

        if (streak === 7) {
            title = "🔥 WEEK STREAK! 🔥";
            body = `${streak} days of ${type} consistency! You're on fire!`;
        } else if (streak === 30) {
            title = "🏆 MONTH STREAK! 🏆";
            body = `${streak} days strong! You're a true champion!`;
        } else if (streak % 10 === 0) {
            title = `${streak}-Day Streak! 🎉`;
            body = `Your consistency is paying off! Keep it going!`;
        } else if (streak % 5 === 0) {
            title = `${streak} days and counting! 💯`;
            body = `Your dedication is inspiring! Don't stop now!`;
        } else {
            return null;
        }

        return {
            type: 'streakNotification',
            title: title,
            body: body,
            priority: 'high',
            data: {
                action: 'open_progress',
                streakType: type,
                streakCount: streak
            }
        };
    }

    generateChallengeUpdate(data, insights) {
        const { challengeName, progress, daysLeft, position } = data;

        let title, body;

        if (progress >= 100) {
            title = "Challenge Complete! 🎉";
            body = `You crushed the ${challengeName} challenge!`;
        } else if (daysLeft <= 1) {
            title = "Final push! ⏰";
            body = `Last day of ${challengeName}. You're at ${progress}%!`;
        } else if (position && position <= 3) {
            title = `Top ${position} in ${challengeName}! 🏆`;
            body = "You're leading the pack! Keep pushing!";
        } else if (progress >= 75) {
            title = "Almost there! 🎯";
            body = `${progress}% complete in ${challengeName}. Final stretch!`;
        } else {
            return null;
        }

        return {
            type: 'challengeUpdate',
            title: title,
            body: body,
            priority: 'normal',
            data: {
                action: 'open_challenges',
                challengeId: data.challengeId,
                progress: progress
            }
        };
    }

    generateSocialNotification(data, insights) {
        const { type, friendName, activity } = data;

        let title, body;

        switch (type) {
            case 'friend_workout':
                title = `${friendName} just worked out! 💪`;
                body = "Get inspired and start your own workout!";
                break;
            case 'friend_achievement':
                title = `${friendName} earned an achievement! 🏆`;
                body = "Congratulate them and chase your own goals!";
                break;
            case 'challenge_invite':
                title = `${friendName} challenged you! ⚡`;
                body = `Join the ${activity} challenge and compete!`;
                break;
            default:
                return null;
        }

        return {
            type: 'socialNotification',
            title: title,
            body: body,
            priority: 'normal',
            data: {
                action: 'open_community',
                friendId: data.friendId,
                activityType: type
            }
        };
    }

    generateHydrationReminder(data, insights) {
        const { waterIntake, targetWater, lastLog } = data;
        const progress = waterIntake / targetWater;
        const hoursSinceLastLog = lastLog ? 
            (Date.now() - new Date(lastLog).getTime()) / (1000 * 60 * 60) : 24;

        if (progress >= 1 || hoursSinceLastLog < 2) {
            return null; // Already hydrated or recently logged
        }

        let title, body;

        if (progress < 0.3) {
            title = "Time to hydrate! 💧";
            body = "You're behind on your water goal. Drink up!";
        } else if (progress < 0.7) {
            title = "Hydration check! 🚰";
            body = `${Math.round(progress * 100)}% of your water goal. Keep going!`;
        } else {
            title = "Almost there! 💦";
            body = "Just a bit more water to hit your daily goal!";
        }

        return {
            type: 'hydrationReminder',
            title: title,
            body: body,
            priority: 'low',
            data: {
                action: 'log_water',
                currentProgress: Math.round(progress * 100)
            }
        };
    }

    async deliverNotification(userId, notification) {
        try {
            // Get user's FCM token (would be stored in database)
            const userToken = await this.getUserFCMToken(userId);
            
            if (!userToken) {
                return {
                    success: false,
                    reason: 'No FCM token found'
                };
            }

            // Send via Firebase
            const result = await notificationService.sendNotification(
                userToken,
                notification.title,
                notification.body,
                notification.data
            );

            return {
                success: result.success,
                notificationId: this.generateNotificationId(),
                deliveredAt: Date.now()
            };

        } catch (error) {
            console.error('Deliver notification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    trackNotification(userId, notification, result) {
        const history = this.notificationHistory.get(userId) || [];
        
        history.push({
            id: result.notificationId,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            sentAt: Date.now(),
            delivered: result.success,
            opened: false, // Will be updated when user opens
            clicked: false // Will be updated when user clicks
        });

        // Keep only last 100 notifications
        if (history.length > 100) {
            history.splice(0, history.length - 100);
        }

        this.notificationHistory.set(userId, history);
        this.updateUserInsights(userId, notification, result);
    }

    updateUserInsights(userId, notification, result) {
        const insights = this.aiInsights.get(userId);
        const history = this.notificationHistory.get(userId) || [];

        // Calculate engagement score
        const recentNotifications = history.slice(-20); // Last 20 notifications
        const openRate = recentNotifications.filter(n => n.opened).length / recentNotifications.length;
        const clickRate = recentNotifications.filter(n => n.clicked).length / recentNotifications.length;

        insights.engagementScore = (openRate * 0.6 + clickRate * 0.4) || 0.5;
        insights.responseRate = openRate;

        // Update preferred topics
        if (result.success) {
            if (!insights.preferredTopics.includes(notification.type)) {
                insights.preferredTopics.push(notification.type);
            }
        }

        // Update best times (simplified)
        const hour = new Date().getHours();
        if (!insights.bestTimes.includes(hour)) {
            insights.bestTimes.push(hour);
        }

        this.aiInsights.set(userId, insights);
    }

    // Scheduled notification methods
    async sendMorningMotivation() {
        console.log('🌅 Sending morning motivation notifications');
        
        for (const [userId, preferences] of this.userPreferences) {
            if (preferences.motivationalMessages) {
                await this.sendPersonalizedNotification(userId, 'motivationalMessage', {
                    timeOfDay: 'morning'
                });
            }
        }
    }

    async sendWorkoutReminders() {
        console.log('🏋️ Sending workout reminder notifications');
        
        for (const [userId, preferences] of this.userPreferences) {
            if (preferences.workoutReminders) {
                // Get user's workout data (would come from database)
                const workoutData = await this.getUserWorkoutData(userId);
                
                await this.sendPersonalizedNotification(userId, 'workoutReminder', workoutData);
            }
        }
    }

    async sendWeeklyProgress() {
        console.log('📊 Sending weekly progress notifications');
        
        for (const [userId, preferences] of this.userPreferences) {
            if (preferences.progressUpdates) {
                const progressData = await this.getUserProgressData(userId);
                
                await this.sendPersonalizedNotification(userId, 'progressUpdate', progressData);
            }
        }
    }

    async sendHydrationReminders() {
        console.log('💧 Sending hydration reminder notifications');
        
        for (const [userId, preferences] of this.userPreferences) {
            if (preferences.hydrationReminders) {
                const hydrationData = await this.getUserHydrationData(userId);
                
                await this.sendPersonalizedNotification(userId, 'hydrationReminder', hydrationData);
            }
        }
    }

    // Utility methods
    async getUserFCMToken(userId) {
        // This would fetch from database
        // For now, return null to simulate missing token
        return null;
    }

    async getUserWorkoutData(userId) {
        // This would fetch from database
        return {
            lastWorkout: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            workoutStreak: 5,
            preferredTime: '18:00'
        };
    }

    async getUserProgressData(userId) {
        // This would fetch from database
        return {
            weeklyStats: {
                workoutIncrease: 15,
                weightChange: -0.8
            },
            achievements: [
                { name: "Week Warrior", description: "7 days of workouts" }
            ]
        };
    }

    async getUserHydrationData(userId) {
        // This would fetch from database
        return {
            waterIntake: 1200, // ml
            targetWater: 2500, // ml
            lastLog: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
        };
    }

    generateNotificationId() {
        return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getNotificationTemplates() {
        return {
            workout: [],
            nutrition: [],
            progress: [],
            motivation: [],
            social: []
        };
    }

    // Public API methods
    async updateUserPreferences(userId, preferences) {
        const current = this.userPreferences.get(userId) || {};
        this.userPreferences.set(userId, { ...current, ...preferences });
        
        return {
            success: true,
            message: 'Preferences updated'
        };
    }

    async getNotificationHistory(userId, limit = 20) {
        const history = this.notificationHistory.get(userId) || [];
        return history.slice(-limit).reverse();
    }

    async markNotificationOpened(userId, notificationId) {
        const history = this.notificationHistory.get(userId) || [];
        const notification = history.find(n => n.id === notificationId);
        
        if (notification) {
            notification.opened = true;
            notification.openedAt = Date.now();
            this.updateUserInsights(userId, notification, { success: true });
        }
    }

    async markNotificationClicked(userId, notificationId) {
        const history = this.notificationHistory.get(userId) || [];
        const notification = history.find(n => n.id === notificationId);
        
        if (notification) {
            notification.clicked = true;
            notification.clickedAt = Date.now();
            this.updateUserInsights(userId, notification, { success: true });
        }
    }

    getStatus() {
        return {
            registeredUsers: this.userPreferences.size,
            activeNotifications: this.notificationQueue.length,
            totalNotificationsSent: Array.from(this.notificationHistory.values())
                .reduce((total, history) => total + history.length, 0),
            averageEngagement: Array.from(this.aiInsights.values())
                .reduce((total, insights) => total + insights.engagementScore, 0) / this.aiInsights.size || 0
        };
    }
}

module.exports = new SmartNotificationService();