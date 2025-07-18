const User = require('../models/User');

class MealTrackingService {
    constructor() {
        this.trackingMethods = {
            PHOTO_VERIFICATION: 'photo_verification',
            CHECK_IN_REMINDER: 'check_in_reminder',
            SMART_WATCH_INTEGRATION: 'smart_watch_integration',
            VOICE_CONFIRMATION: 'voice_confirmation',
            FAMILY_VERIFICATION: 'family_verification'
        };
        
        // Initialize in-app notification system instead of email
        this.notifications = [];
    }

    async initiateMealTracking(userId, mealPlan) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            // Create tracking schedule for the day
            const trackingSchedule = this.createTrackingSchedule(mealPlan);
            
            // Save tracking data
            user.mealTracking = {
                date: new Date().toDateString(),
                plannedMeals: mealPlan,
                trackingSchedule: trackingSchedule,
                completedMeals: [],
                missedMeals: [],
                trackingScore: 0,
                lastUpdated: new Date()
            };
            
            await user.save();
            
            // Schedule reminders
            await this.scheduleTrackingReminders(userId, trackingSchedule);
            
            return {
                success: true,
                trackingId: user.mealTracking._id,
                schedule: trackingSchedule
            };
            
        } catch (error) {
            console.error('Error initiating meal tracking:', error);
            throw error;
        }
    }

    createTrackingSchedule(mealPlan) {
        const schedule = [];
        const now = new Date();
        
        // Define typical meal times
        const mealTimes = {
            breakfast: { hour: 8, minute: 0 },
            lunch: { hour: 13, minute: 0 },
            snacks: { hour: 16, minute: 0 },
            dinner: { hour: 20, minute: 0 }
        };
        
        Object.keys(mealPlan).forEach(mealType => {
            if (mealPlan[mealType]) {
                const mealTime = new Date(now);
                mealTime.setHours(mealTimes[mealType].hour, mealTimes[mealType].minute, 0, 0);
                
                // If meal time has passed today, schedule for tomorrow
                if (mealTime < now) {
                    mealTime.setDate(mealTime.getDate() + 1);
                }
                
                schedule.push({
                    mealType: mealType,
                    mealName: mealPlan[mealType].name,
                    scheduledTime: mealTime,
                    reminderTime: new Date(mealTime.getTime() - 30 * 60000), // 30 min before
                    checkInTime: new Date(mealTime.getTime() + 60 * 60000), // 1 hour after
                    status: 'pending',
                    trackingMethods: this.getRecommendedTrackingMethods(mealType)
                });
            }
        });
        
        return schedule;
    }

    getRecommendedTrackingMethods(mealType) {
        // Different tracking methods for different meal types
        const methods = [];
        
        switch (mealType) {
            case 'breakfast':
                methods.push(this.trackingMethods.PHOTO_VERIFICATION);
                methods.push(this.trackingMethods.CHECK_IN_REMINDER);
                break;
            case 'lunch':
                methods.push(this.trackingMethods.PHOTO_VERIFICATION);
                methods.push(this.trackingMethods.VOICE_CONFIRMATION);
                break;
            case 'snacks':
                methods.push(this.trackingMethods.CHECK_IN_REMINDER);
                break;
            case 'dinner':
                methods.push(this.trackingMethods.PHOTO_VERIFICATION);
                methods.push(this.trackingMethods.FAMILY_VERIFICATION);
                break;
        }
        
        return methods;
    }

    async scheduleTrackingReminders(userId, trackingSchedule) {
        try {
            for (const meal of trackingSchedule) {
                // Schedule pre-meal reminder
                setTimeout(async () => {
                    await this.sendMealReminder(userId, meal, 'pre_meal');
                }, meal.reminderTime.getTime() - Date.now());
                
                // Schedule post-meal check-in
                setTimeout(async () => {
                    await this.sendMealCheckIn(userId, meal);
                }, meal.checkInTime.getTime() - Date.now());
                
                // Schedule missed meal follow-up
                setTimeout(async () => {
                    await this.handleMissedMeal(userId, meal);
                }, meal.checkInTime.getTime() + (2 * 60 * 60 * 1000) - Date.now()); // 2 hours after check-in time
            }
        } catch (error) {
            console.error('Error scheduling reminders:', error);
        }
    }

    async sendMealReminder(userId, meal, type) {
        try {
            const user = await User.findById(userId);
            if (!user) return;

            let title, message;
            
            if (type === 'pre_meal') {
                title = `🍽️ Time for ${meal.mealType}!`;
                message = `It's time for your ${meal.mealType}: ${meal.mealName}. Remember to take a photo and enjoy mindfully!`;
            }

            // Create in-app notification
            const notification = {
                id: Date.now().toString(),
                userId: userId,
                type: 'meal_reminder',
                title: title,
                message: message,
                mealId: meal._id,
                timestamp: new Date(),
                read: false
            };

            this.notifications.push(notification);

            // Also send browser notification if available
            await this.sendBrowserNotification(userId, title, message);

        } catch (error) {
            console.error('Error sending meal reminder:', error);
        }
    }

    async sendMealCheckIn(userId, meal) {
        try {
            const user = await User.findById(userId);
            if (!user) return;
            
            const title = `Did you eat your ${meal.mealType}?`;
            const message = `Please check in for your planned meal: ${meal.mealName}`;

            // Create in-app notification
            const notification = {
                id: Date.now().toString(),
                userId: userId,
                type: 'meal_checkin',
                title: title,
                message: message,
                mealId: meal._id,
                timestamp: new Date(),
                read: false,
                actions: [
                    { type: 'completed', label: '✅ Yes, I ate it!' },
                    { type: 'partial', label: '🥄 Ate some of it' },
                    { type: 'missed', label: '❌ Missed it' }
                ]
            };

            this.notifications.push(notification);

        } catch (error) {
            console.error('Error sending meal check-in:', error);
        }
    }

    async recordMealConsumption(userId, mealId, consumptionData) {
        try {
            const user = await User.findById(userId);
            if (!user || !user.mealTracking) {
                throw new Error('User or meal tracking not found');
            }

            const {
                status, // 'completed', 'partial', 'missed', 'substituted'
                actualMeal, // if different from planned
                portion, // percentage eaten (0-100)
                enjoymentRating, // 1-5 stars
                photo, // base64 or file path
                notes,
                timestamp
            } = consumptionData;

            // Find the meal in tracking schedule
            const mealIndex = user.mealTracking.trackingSchedule.findIndex(
                meal => meal._id.toString() === mealId
            );

            if (mealIndex === -1) {
                throw new Error('Meal not found in tracking schedule');
            }

            // Update meal status
            user.mealTracking.trackingSchedule[mealIndex].status = status;
            user.mealTracking.trackingSchedule[mealIndex].actualConsumption = {
                status,
                actualMeal,
                portion,
                enjoymentRating,
                photo,
                notes,
                timestamp: timestamp || new Date()
            };

            // Update completed/missed meals arrays
            if (status === 'completed' || status === 'partial') {
                user.mealTracking.completedMeals.push({
                    mealType: user.mealTracking.trackingSchedule[mealIndex].mealType,
                    plannedMeal: user.mealTracking.trackingSchedule[mealIndex].mealName,
                    actualMeal: actualMeal || user.mealTracking.trackingSchedule[mealIndex].mealName,
                    portion,
                    enjoymentRating,
                    timestamp: timestamp || new Date()
                });
            } else if (status === 'missed') {
                user.mealTracking.missedMeals.push({
                    mealType: user.mealTracking.trackingSchedule[mealIndex].mealType,
                    plannedMeal: user.mealTracking.trackingSchedule[mealIndex].mealName,
                    reason: notes || 'No reason provided',
                    timestamp: timestamp || new Date()
                });
            }

            // Calculate tracking score
            user.mealTracking.trackingScore = this.calculateTrackingScore(user.mealTracking);
            user.mealTracking.lastUpdated = new Date();

            await user.save();

            // Send feedback based on consumption
            await this.sendConsumptionFeedback(userId, consumptionData);

            return {
                success: true,
                trackingScore: user.mealTracking.trackingScore,
                message: this.getTrackingMessage(status, portion)
            };

        } catch (error) {
            console.error('Error recording meal consumption:', error);
            throw error;
        }
    }

    calculateTrackingScore(mealTracking) {
        const totalMeals = mealTracking.trackingSchedule.length;
        if (totalMeals === 0) return 0;

        let score = 0;
        
        mealTracking.trackingSchedule.forEach(meal => {
            if (meal.actualConsumption) {
                switch (meal.actualConsumption.status) {
                    case 'completed':
                        score += meal.actualConsumption.portion || 100;
                        break;
                    case 'partial':
                        score += (meal.actualConsumption.portion || 50) * 0.8;
                        break;
                    case 'substituted':
                        score += 70; // Credit for eating something healthy
                        break;
                    case 'missed':
                        score += 0;
                        break;
                }
            }
        });

        return Math.round(score / totalMeals);
    }

    getTrackingMessage(status, portion) {
        switch (status) {
            case 'completed':
                return portion >= 90 ? 
                    "Excellent! You completed your meal plan perfectly! 🌟" :
                    "Great job following your meal plan! 👍";
            case 'partial':
                return "Good effort! Even partial completion helps your health goals. 💪";
            case 'substituted':
                return "Smart substitution! Flexibility is key to sustainable eating. 🔄";
            case 'missed':
                return "No worries! Let's get back on track with your next meal. 🎯";
            default:
                return "Thanks for checking in! 📝";
        }
    }

    async sendConsumptionFeedback(userId, consumptionData) {
        try {
            const user = await User.findById(userId);
            if (!user) return;

            const { status, enjoymentRating, notes } = consumptionData;

            // Send personalized feedback based on consumption
            if (status === 'completed' && enjoymentRating >= 4) {
                await this.sendPositiveFeedback(user, consumptionData);
            } else if (status === 'missed') {
                await this.sendMissedMealSupport(user, consumptionData);
            } else if (enjoymentRating <= 2) {
                await this.sendMealImprovementSuggestion(user, consumptionData);
            }

        } catch (error) {
            console.error('Error sending consumption feedback:', error);
        }
    }

    async sendPositiveFeedback(user, consumptionData) {
        const title = "🎉 Great job on your meal!";
        const message = `We're thrilled that you enjoyed your meal and stuck to your plan! Your consistency is building healthy habits. Keep up the fantastic work! 💪`;

        // Create in-app notification
        const notification = {
            id: Date.now().toString(),
            userId: user._id,
            type: 'positive_feedback',
            title: title,
            message: message,
            timestamp: new Date(),
            read: false
        };

        this.notifications.push(notification);
    }

    async sendMissedMealSupport(user, consumptionData) {
        const title = "Let's get back on track! 🎯";
        const message = `No worries about missing a meal! Set phone reminders, prep ingredients in advance, and remember: progress, not perfection! Your next meal is a fresh start! 🌅`;

        // Create in-app notification
        const notification = {
            id: Date.now().toString(),
            userId: user._id,
            type: 'missed_meal_support',
            title: title,
            message: message,
            timestamp: new Date(),
            read: false
        };

        this.notifications.push(notification);
    }

    async sendMealImprovementSuggestion(user, consumptionData) {
        const title = "Let's improve your meal experience! 🍽️";
        const message = `Thanks for the honest feedback! Our AI will suggest better alternatives that match your taste preferences. You can also adjust spice levels and add foods you dislike to your profile.`;

        // Create in-app notification
        const notification = {
            id: Date.now().toString(),
            userId: user._id,
            type: 'meal_improvement',
            title: title,
            message: message,
            timestamp: new Date(),
            read: false
        };

        this.notifications.push(notification);
    }

    async sendBrowserNotification(userId, title, message) {
        // This would be handled by the frontend using the Notifications API
        console.log(`Browser notification for ${userId}: ${title} - ${message}`);
    }

    // Get notifications for a user
    getNotifications(userId) {
        return this.notifications.filter(notification => 
            notification.userId.toString() === userId.toString()
        ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Mark notification as read
    markNotificationAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
        }
    }

    // Clear old notifications (older than 7 days)
    clearOldNotifications() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        this.notifications = this.notifications.filter(notification => 
            new Date(notification.timestamp) > sevenDaysAgo
        );
    }

    async handleMissedMeal(userId, meal) {
        try {
            const user = await User.findById(userId);
            if (!user || !user.mealTracking) return;

            // Check if meal was already recorded
            const mealInSchedule = user.mealTracking.trackingSchedule.find(
                m => m._id.toString() === meal._id.toString()
            );

            if (mealInSchedule && mealInSchedule.status === 'pending') {
                // Mark as missed and send support
                await this.recordMealConsumption(userId, meal._id, {
                    status: 'missed',
                    notes: 'Auto-marked as missed - no response to check-in',
                    timestamp: new Date()
                });

                await this.sendMissedMealSupport(user, { status: 'missed' });
            }

        } catch (error) {
            console.error('Error handling missed meal:', error);
        }
    }

    async sendPushNotification(userId, title, message) {
        // Implement push notification logic here
        // This would integrate with services like Firebase Cloud Messaging
        console.log(`Push notification for ${userId}: ${title} - ${message}`);
    }

    async getDailyTrackingReport(userId, date = new Date()) {
        try {
            const user = await User.findById(userId);
            if (!user || !user.mealTracking) {
                return { success: false, message: 'No tracking data found' };
            }

            const dateString = date.toDateString();
            if (user.mealTracking.date !== dateString) {
                return { success: false, message: 'No tracking data for this date' };
            }

            const report = {
                date: dateString,
                trackingScore: user.mealTracking.trackingScore,
                totalMeals: user.mealTracking.trackingSchedule.length,
                completedMeals: user.mealTracking.completedMeals.length,
                missedMeals: user.mealTracking.missedMeals.length,
                adherenceRate: (user.mealTracking.completedMeals.length / user.mealTracking.trackingSchedule.length) * 100,
                mealDetails: user.mealTracking.trackingSchedule.map(meal => ({
                    mealType: meal.mealType,
                    plannedMeal: meal.mealName,
                    status: meal.status,
                    actualConsumption: meal.actualConsumption
                })),
                insights: this.generateTrackingInsights(user.mealTracking)
            };

            return { success: true, report };

        } catch (error) {
            console.error('Error generating tracking report:', error);
            throw error;
        }
    }

    generateTrackingInsights(mealTracking) {
        const insights = [];
        
        const adherenceRate = (mealTracking.completedMeals.length / mealTracking.trackingSchedule.length) * 100;
        
        if (adherenceRate >= 90) {
            insights.push("Excellent adherence! You're building strong healthy habits. 🌟");
        } else if (adherenceRate >= 70) {
            insights.push("Good progress! Small improvements can make a big difference. 👍");
        } else if (adherenceRate >= 50) {
            insights.push("You're on the right track. Consider setting meal reminders. ⏰");
        } else {
            insights.push("Let's work together to improve your meal consistency. 💪");
        }

        // Analyze missed meal patterns
        const missedMealTypes = mealTracking.missedMeals.map(m => m.mealType);
        const mostMissedMeal = this.getMostFrequent(missedMealTypes);
        
        if (mostMissedMeal) {
            insights.push(`You tend to miss ${mostMissedMeal} most often. Let's create a strategy for this meal.`);
        }

        // Analyze enjoyment ratings
        const enjoymentRatings = mealTracking.completedMeals
            .filter(m => m.enjoymentRating)
            .map(m => m.enjoymentRating);
        
        if (enjoymentRatings.length > 0) {
            const avgEnjoyment = enjoymentRatings.reduce((a, b) => a + b, 0) / enjoymentRatings.length;
            if (avgEnjoyment >= 4) {
                insights.push("You're really enjoying your meals! Great taste preferences. 😋");
            } else if (avgEnjoyment < 3) {
                insights.push("Let's adjust your meal preferences to find foods you love more. 🔄");
            }
        }

        return insights;
    }

    getMostFrequent(arr) {
        if (arr.length === 0) return null;
        
        const frequency = {};
        arr.forEach(item => {
            frequency[item] = (frequency[item] || 0) + 1;
        });
        
        return Object.keys(frequency).reduce((a, b) => 
            frequency[a] > frequency[b] ? a : b
        );
    }

    async getWeeklyTrackingAnalytics(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            // This would typically query a tracking history collection
            // For now, we'll return a sample structure
            
            const analytics = {
                weeklyAdherence: 75,
                bestDay: 'Monday',
                worstDay: 'Friday',
                mostEnjoyedMeals: ['Paneer Butter Masala', 'Masala Dosa', 'Chicken Biryani'],
                leastEnjoyedMeals: ['Bitter Gourd Curry'],
                consistencyTrend: 'improving',
                recommendations: [
                    'Consider meal prep on Sundays for better weekday adherence',
                    'Friday seems challenging - try simpler meals',
                    'Your breakfast adherence is excellent - apply same strategy to dinner'
                ]
            };

            return { success: true, analytics };

        } catch (error) {
            console.error('Error getting weekly analytics:', error);
            throw error;
        }
    }
}

module.exports = new MealTrackingService();