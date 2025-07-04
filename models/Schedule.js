const mongoose = require('mongoose');

const scheduleEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['workout', 'nutrition', 'meal', 'health-check', 'reminder', 'custom'],
    required: true
  },
  category: {
    type: String,
    enum: ['strength', 'cardio', 'yoga', 'hiit', 'recovery', 'meal-prep', 'doctor-visit', 'supplement', 'other'],
    default: 'other'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  allDay: {
    type: Boolean,
    default: false
  },
  recurring: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    interval: {
      type: Number,
      default: 1
    },
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6
    }],
    endRecurrence: {
      type: Date
    }
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'push', 'both'],
      default: 'both'
    },
    minutesBefore: {
      type: Number,
      default: 30
    },
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date
  }],
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'missed'],
    default: 'scheduled'
  },
  completedAt: Date,
  notes: String,
  workoutData: {
    exercises: [{
      name: String,
      sets: Number,
      reps: Number,
      weight: Number,
      duration: Number
    }],
    estimatedCalories: Number,
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced']
    }
  },
  mealData: {
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack']
    },
    foods: [{
      name: String,
      quantity: Number,
      unit: String,
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number
    }],
    totalCalories: Number,
    prepTime: Number
  },
  location: String,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  tags: [String],
  createdBy: {
    type: String,
    enum: ['user', 'ai-coach', 'system'],
    default: 'user'
  }
}, {
  timestamps: true
});

// Indexes for better performance
scheduleEventSchema.index({ userId: 1, startDate: 1 });
scheduleEventSchema.index({ userId: 1, type: 1 });
scheduleEventSchema.index({ startDate: 1, status: 1 });
scheduleEventSchema.index({ 'reminders.minutesBefore': 1, 'reminders.sent': 1 });

// Virtual for duration in minutes
scheduleEventSchema.virtual('durationMinutes').get(function() {
  return Math.round((this.endDate - this.startDate) / (1000 * 60));
});

// Method to mark as completed
scheduleEventSchema.methods.markCompleted = function(notes) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (notes) this.notes = notes;
  return this.save();
};

// Method to check if reminder should be sent
scheduleEventSchema.methods.shouldSendReminder = function() {
  const now = new Date();
  return this.reminders.some(reminder => {
    const reminderTime = new Date(this.startDate.getTime() - (reminder.minutesBefore * 60 * 1000));
    return !reminder.sent && now >= reminderTime && now < this.startDate;
  });
};

// Static method to get user's schedule for date range
scheduleEventSchema.statics.getUserSchedule = function(userId, startDate, endDate) {
  return this.find({
    userId,
    startDate: { $gte: startDate, $lte: endDate }
  }).sort({ startDate: 1 });
};

// Static method to get today's events
scheduleEventSchema.statics.getTodaysEvents = function(userId) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  return this.find({
    userId,
    startDate: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ startDate: 1 });
};

// Static method to get upcoming events
scheduleEventSchema.statics.getUpcomingEvents = function(userId, limit = 10) {
  const now = new Date();
  return this.find({
    userId,
    startDate: { $gte: now },
    status: { $in: ['scheduled', 'in-progress'] }
  }).sort({ startDate: 1 }).limit(limit);
};

// Static method to get events needing reminders
scheduleEventSchema.statics.getEventsNeedingReminders = function() {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + (60 * 60 * 1000));
  
  return this.find({
    startDate: { $gte: now, $lte: oneHourFromNow },
    status: 'scheduled',
    'reminders.sent': false
  });
};

const Schedule = mongoose.model('Schedule', scheduleEventSchema);

module.exports = Schedule;