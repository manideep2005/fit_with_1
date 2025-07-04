const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['workout', 'nutrition', 'habit', 'social', 'custom'],
    required: true
  },
  category: {
    type: String,
    enum: ['strength', 'cardio', 'flexibility', 'nutrition', 'hydration', 'sleep', 'mindfulness'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  duration: {
    value: Number,
    unit: {
      type: String,
      enum: ['days', 'weeks', 'months']
    }
  },
  target: {
    value: Number,
    unit: String,
    description: String
  },
  rewards: {
    points: {
      type: Number,
      default: 0
    },
    badges: [String],
    unlocks: [String]
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      current: {
        type: Number,
        default: 0
      },
      percentage: {
        type: Number,
        default: 0
      },
      lastUpdate: Date
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'failed', 'paused'],
      default: 'active'
    },
    completedAt: Date
  }],
  rules: [{
    description: String,
    validation: String
  }],
  tags: [String],
  startDate: Date,
  endDate: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

challengeSchema.index({ type: 1, category: 1, isActive: 1 });
challengeSchema.index({ 'participants.user': 1 });

module.exports = mongoose.model('Challenge', challengeSchema);