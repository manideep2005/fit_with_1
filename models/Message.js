const mongoose = require('mongoose');

// Message Schema for friend-to-friend chat
const messageSchema = new mongoose.Schema({
  // Sender and receiver information
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Message content
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  // Message type (text, image, workout-share, etc.)
  messageType: {
    type: String,
    enum: ['text', 'image', 'workout-share', 'progress-share', 'meal-share'],
    default: 'text'
  },
  
  // Additional data for special message types
  attachmentData: {
    workoutId: { type: mongoose.Schema.Types.Mixed }, // Allow both ObjectId and String
    imageUrl: { type: String },
    progressData: { type: Object },
    mealData: { type: Object }
  },
  
  // Message status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  
  // Read timestamp
  readAt: {
    type: Date
  },
  
  // Conversation ID (combination of sender and receiver IDs)
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ receiver: 1, status: 1 });

// Static method to create conversation ID
messageSchema.statics.createConversationId = function(userId1, userId2) {
  // Always put the smaller ID first to ensure consistency
  const ids = [userId1.toString(), userId2.toString()].sort();
  return `${ids[0]}_${ids[1]}`;
};

// Static method to get conversation messages
messageSchema.statics.getConversationMessages = function(userId1, userId2, limit = 50, skip = 0) {
  const conversationId = this.createConversationId(userId1, userId2);
  return this.find({
    conversationId: conversationId,
    isDeleted: false
  })
  .populate('sender', 'fullName personalInfo.firstName personalInfo.lastName')
  .populate('receiver', 'fullName personalInfo.firstName personalInfo.lastName')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = function(userId1, userId2, readerId) {
  const conversationId = this.createConversationId(userId1, userId2);
  return this.updateMany({
    conversationId: conversationId,
    receiver: readerId,
    status: { $ne: 'read' }
  }, {
    status: 'read',
    readAt: new Date()
  });
};

// Static method to get unread message count
messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    receiver: userId,
    status: { $ne: 'read' },
    isDeleted: false
  });
};

// Static method to get user's conversations
messageSchema.statics.getUserConversations = function(userId) {
  return this.aggregate([
    {
      $match: {
        $or: [
          { sender: new mongoose.Types.ObjectId(userId) },
          { receiver: new mongoose.Types.ObjectId(userId) }
        ],
        isDeleted: false
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiver', new mongoose.Types.ObjectId(userId)] },
                  { $ne: ['$status', 'read'] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'lastMessage.sender',
        foreignField: '_id',
        as: 'senderInfo'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'lastMessage.receiver',
        foreignField: '_id',
        as: 'receiverInfo'
      }
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    }
  ]);
};

// Instance method to mark as read
messageSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Instance method to soft delete
messageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;