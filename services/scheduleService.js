const Schedule = require('../models/Schedule');
const User = require('../models/User');
const emailService = require('./emailService');

class ScheduleService {
  // Create a new schedule event
  static async createEvent(userId, eventData) {
    try {
      const event = new Schedule({
        userId,
        ...eventData
      });

      await event.save();

      // If it's a recurring event, create future instances
      if (eventData.recurring && eventData.recurring.enabled) {
        await this.createRecurringEvents(event);
      }

      return { success: true, event };
    } catch (error) {
      console.error('Error creating schedule event:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's schedule for a specific date range
  static async getUserSchedule(userId, startDate, endDate) {
    try {
      const events = await Schedule.getUserSchedule(userId, startDate, endDate);
      return { success: true, events };
    } catch (error) {
      console.error('Error getting user schedule:', error);
      return { success: false, error: error.message };
    }
  }

  // Get today's events for a user
  static async getTodaysEvents(userId) {
    try {
      const events = await Schedule.getTodaysEvents(userId);
      return { success: true, events };
    } catch (error) {
      console.error('Error getting today\'s events:', error);
      return { success: false, error: error.message };
    }
  }

  // Get upcoming events
  static async getUpcomingEvents(userId, limit = 10) {
    try {
      const events = await Schedule.getUpcomingEvents(userId, limit);
      return { success: true, events };
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      return { success: false, error: error.message };
    }
  }

  // Update an event
  static async updateEvent(eventId, userId, updateData) {
    try {
      const event = await Schedule.findOneAndUpdate(
        { _id: eventId, userId },
        updateData,
        { new: true }
      );

      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      return { success: true, event };
    } catch (error) {
      console.error('Error updating event:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete an event
  static async deleteEvent(eventId, userId) {
    try {
      const event = await Schedule.findOneAndDelete({ _id: eventId, userId });
      
      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting event:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark event as completed
  static async completeEvent(eventId, userId, notes) {
    try {
      const event = await Schedule.findOne({ _id: eventId, userId });
      
      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      await event.markCompleted(notes);

      // Award XP for completing scheduled events
      if (event.type === 'workout') {
        await this.awardCompletionXP(userId, event);
      }

      return { success: true, event };
    } catch (error) {
      console.error('Error completing event:', error);
      return { success: false, error: error.message };
    }
  }

  // Create recurring events
  static async createRecurringEvents(baseEvent) {
    try {
      const { recurring, startDate, endDate } = baseEvent;
      const events = [];
      
      let currentDate = new Date(startDate);
      const endRecurrence = recurring.endRecurrence || new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)); // 1 year default
      
      while (currentDate <= endRecurrence) {
        // Calculate next occurrence based on frequency
        switch (recurring.frequency) {
          case 'daily':
            currentDate.setDate(currentDate.getDate() + recurring.interval);
            break;
          case 'weekly':
            currentDate.setDate(currentDate.getDate() + (7 * recurring.interval));
            break;
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + recurring.interval);
            break;
        }

        if (currentDate <= endRecurrence) {
          const eventDuration = endDate.getTime() - startDate.getTime();
          const newEndDate = new Date(currentDate.getTime() + eventDuration);

          const newEvent = new Schedule({
            ...baseEvent.toObject(),
            _id: undefined,
            startDate: new Date(currentDate),
            endDate: newEndDate,
            createdAt: undefined,
            updatedAt: undefined
          });

          events.push(newEvent);
        }
      }

      if (events.length > 0) {
        await Schedule.insertMany(events);
      }

      return events;
    } catch (error) {
      console.error('Error creating recurring events:', error);
      throw error;
    }
  }

  // Send reminders for upcoming events
  static async sendReminders() {
    try {
      const eventsNeedingReminders = await Schedule.getEventsNeedingReminders();
      
      for (const event of eventsNeedingReminders) {
        const user = await User.findById(event.userId);
        if (!user) continue;

        for (const reminder of event.reminders) {
          if (!reminder.sent) {
            const reminderTime = new Date(event.startDate.getTime() - (reminder.minutesBefore * 60 * 1000));
            const now = new Date();

            if (now >= reminderTime) {
              await this.sendEventReminder(user, event, reminder);
              reminder.sent = true;
              reminder.sentAt = now;
            }
          }
        }

        await event.save();
      }

      return { success: true, remindersSent: eventsNeedingReminders.length };
    } catch (error) {
      console.error('Error sending reminders:', error);
      return { success: false, error: error.message };
    }
  }

  // Send individual event reminder
  static async sendEventReminder(user, event, reminder) {
    try {
      const eventTime = event.startDate.toLocaleString();
      const eventType = event.type.charAt(0).toUpperCase() + event.type.slice(1);
      
      if (reminder.type === 'email' || reminder.type === 'both') {
        await emailService.sendScheduleReminder(user.email, {
          userName: user.fullName,
          eventTitle: event.title,
          eventType: eventType,
          eventTime: eventTime,
          eventDescription: event.description,
          minutesBefore: reminder.minutesBefore
        });
      }

      // TODO: Implement push notifications when ready
      if (reminder.type === 'push' || reminder.type === 'both') {
        // await pushNotificationService.sendReminder(user, event);
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending event reminder:', error);
      throw error;
    }
  }

  // Award XP for completing scheduled events
  static async awardCompletionXP(userId, event) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      let xpReward = 20; // Base XP for completing scheduled event

      // Bonus XP based on event type and duration
      if (event.type === 'workout') {
        const duration = event.durationMinutes;
        if (duration >= 60) xpReward += 30;
        else if (duration >= 30) xpReward += 20;
        else xpReward += 10;
      }

      // Update user's gamification data
      if (!user.gamification) {
        user.gamification = {
          totalXP: 0,
          currentLevel: 1,
          xpToNextLevel: 100
        };
      }

      user.gamification.totalXP += xpReward;

      // Check for level up
      while (user.gamification.totalXP >= user.gamification.xpToNextLevel) {
        user.gamification.currentLevel += 1;
        user.gamification.totalXP -= user.gamification.xpToNextLevel;
        user.gamification.xpToNextLevel = user.gamification.currentLevel * 100;
      }

      await user.save();

      return { success: true, xpAwarded: xpReward };
    } catch (error) {
      console.error('Error awarding completion XP:', error);
      return { success: false, error: error.message };
    }
  }

  // Get schedule statistics
  static async getScheduleStats(userId, startDate, endDate) {
    try {
      const events = await Schedule.find({
        userId,
        startDate: { $gte: startDate, $lte: endDate }
      });

      const stats = {
        total: events.length,
        completed: events.filter(e => e.status === 'completed').length,
        missed: events.filter(e => e.status === 'missed').length,
        upcoming: events.filter(e => e.status === 'scheduled' && e.startDate > new Date()).length,
        byType: {}
      };

      // Group by type
      events.forEach(event => {
        if (!stats.byType[event.type]) {
          stats.byType[event.type] = { total: 0, completed: 0 };
        }
        stats.byType[event.type].total++;
        if (event.status === 'completed') {
          stats.byType[event.type].completed++;
        }
      });

      return { success: true, stats };
    } catch (error) {
      console.error('Error getting schedule stats:', error);
      return { success: false, error: error.message };
    }
  }

  // AI-powered schedule suggestions
  static async generateScheduleSuggestions(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const suggestions = [];
      const now = new Date();
      const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));

      // Suggest workout based on user's fitness goals
      if (user.fitnessGoals?.workoutFrequency > 0) {
        const workoutSuggestion = {
          title: this.getWorkoutSuggestion(user.fitnessGoals),
          type: 'workout',
          category: this.getWorkoutCategory(user.fitnessGoals),
          startDate: new Date(tomorrow.setHours(user.preferences?.workoutTime === 'morning' ? 7 : 18, 0, 0, 0)),
          endDate: new Date(tomorrow.setHours(user.preferences?.workoutTime === 'morning' ? 8 : 19, 0, 0, 0)),
          description: 'AI-suggested workout based on your fitness goals',
          createdBy: 'ai-coach'
        };
        suggestions.push(workoutSuggestion);
      }

      // Suggest meal prep if user has nutrition goals
      if (user.fitnessGoals?.primaryGoal === 'weight-loss' || user.fitnessGoals?.primaryGoal === 'muscle-gain') {
        const mealPrepSuggestion = {
          title: 'Weekly Meal Prep Session',
          type: 'nutrition',
          category: 'meal-prep',
          startDate: new Date(tomorrow.setHours(10, 0, 0, 0)),
          endDate: new Date(tomorrow.setHours(12, 0, 0, 0)),
          description: 'Prepare healthy meals for the week ahead',
          createdBy: 'ai-coach'
        };
        suggestions.push(mealPrepSuggestion);
      }

      return { success: true, suggestions };
    } catch (error) {
      console.error('Error generating schedule suggestions:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper methods for AI suggestions
  static getWorkoutSuggestion(fitnessGoals) {
    const workoutTypes = {
      'weight-loss': 'HIIT Cardio Session',
      'muscle-gain': 'Strength Training',
      'endurance': 'Cardio Endurance Training',
      'strength': 'Power Lifting Session',
      'general-fitness': 'Full Body Workout',
      'flexibility': 'Yoga & Stretching'
    };
    return workoutTypes[fitnessGoals.primaryGoal] || 'General Fitness Workout';
  }

  static getWorkoutCategory(fitnessGoals) {
    const categories = {
      'weight-loss': 'hiit',
      'muscle-gain': 'strength',
      'endurance': 'cardio',
      'strength': 'strength',
      'general-fitness': 'strength',
      'flexibility': 'yoga'
    };
    return categories[fitnessGoals.primaryGoal] || 'other';
  }
}

module.exports = ScheduleService;