const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['workout', 'nutrition', 'streak', 'social', 'milestone'],
    required: true
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  points: {
    type: Number,
    default: 0
  },
  requirements: {
    type: {
      type: String,
      enum: ['count', 'streak', 'total', 'percentage']
    },
    target: Number,
    metric: String,
    timeframe: String
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement'
  }]
}, {
  timestamps: true
});

const userAchievementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  achievement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement',
    required: true
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  },
  progress: {
    current: {
      type: Number,
      default: 0
    },
    target: Number,
    percentage: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

userAchievementSchema.index({ user: 1, achievement: 1 }, { unique: true });

const Achievement = mongoose.model('Achievement', achievementSchema);
const UserAchievement = mongoose.model('UserAchievement', userAchievementSchema);

module.exports = { Achievement, UserAchievement };