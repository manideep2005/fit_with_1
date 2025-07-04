const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  category: {
    type: String,
    enum: ['fitness', 'nutrition', 'weight-loss', 'bodybuilding', 'yoga', 'running', 'general'],
    default: 'general'
  },
  privacy: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['member', 'moderator'],
      default: 'member'
    }
  }],
  avatar: {
    type: String,
    default: null
  },
  banner: {
    type: String,
    default: null
  },
  rules: [{
    title: String,
    description: String
  }],
  tags: [String],
  stats: {
    totalPosts: {
      type: Number,
      default: 0
    },
    totalMembers: {
      type: Number,
      default: 0
    },
    activeToday: {
      type: Number,
      default: 0
    }
  },
  settings: {
    allowMemberPosts: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    allowInvites: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Update member count when members change
groupSchema.pre('save', function(next) {
  this.stats.totalMembers = this.members.length;
  next();
});

module.exports = mongoose.model('Group', groupSchema);