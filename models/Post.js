const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  type: {
    type: String,
    enum: ['text', 'image', 'workout', 'progress', 'question', 'achievement'],
    default: 'text'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  images: [{
    url: String,
    caption: String
  }],
  workoutData: {
    exercises: [{
      name: String,
      sets: Number,
      reps: Number,
      weight: Number,
      duration: Number
    }],
    totalDuration: Number,
    caloriesBurned: Number
  },
  progressData: {
    beforeImage: String,
    afterImage: String,
    weight: Number,
    bodyFat: Number,
    measurements: {
      chest: Number,
      waist: Number,
      hips: Number,
      arms: Number,
      thighs: Number
    },
    timeframe: String
  },
  tags: [String],
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  stats: {
    totalLikes: {
      type: Number,
      default: 0
    },
    totalComments: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Update stats when likes/comments change
postSchema.pre('save', function(next) {
  this.stats.totalLikes = this.likes.length;
  this.stats.totalComments = this.comments.length;
  next();
});

// Index for better performance
postSchema.index({ group: 1, createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);