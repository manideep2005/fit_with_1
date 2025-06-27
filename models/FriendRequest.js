const mongoose = require('mongoose');

// Friend Request Schema
const friendRequestSchema = new mongoose.Schema({
  // Who sent the request
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Who received the request
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Request status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending'
  },
  
  // Optional message with the request
  message: {
    type: String,
    maxlength: 200,
    default: ''
  },
  
  // When the request was responded to
  respondedAt: {
    type: Date
  },
  
  // Expiry date for the request (optional)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
friendRequestSchema.index({ sender: 1, receiver: 1, status: 1 }); // Removed unique constraint to allow multiple requests
friendRequestSchema.index({ receiver: 1, status: 1 });
friendRequestSchema.index({ sender: 1, status: 1 });
friendRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to check if request exists
friendRequestSchema.statics.requestExists = function(senderId, receiverId) {
  return this.findOne({
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId }
    ],
    status: 'pending' // Only check for pending requests, allow new requests after rejection/cancellation
  });
};

// Static method to get pending requests for a user
friendRequestSchema.statics.getPendingRequests = function(userId) {
  return this.find({
    receiver: userId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('sender', 'fullName email personalInfo');
};

// Static method to get sent requests for a user
friendRequestSchema.statics.getSentRequests = function(userId) {
  return this.find({
    sender: userId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('receiver', 'fullName email personalInfo');
};

// Instance method to accept request
friendRequestSchema.methods.accept = async function() {
  this.status = 'accepted';
  this.respondedAt = new Date();
  await this.save();
  
  // Add both users as friends
  const User = require('./User');
  const sender = await User.findById(this.sender);
  const receiver = await User.findById(this.receiver);
  
  if (sender && receiver) {
    // Add to friends list if not already there
    if (!sender.friends.includes(this.receiver)) {
      sender.friends.push(this.receiver);
      await sender.save();
    }
    
    if (!receiver.friends.includes(this.sender)) {
      receiver.friends.push(this.sender);
      await receiver.save();
    }
  }
  
  return this;
};

// Instance method to reject request
friendRequestSchema.methods.reject = async function() {
  this.status = 'rejected';
  this.respondedAt = new Date();
  return await this.save();
};

// Instance method to cancel request
friendRequestSchema.methods.cancel = async function() {
  this.status = 'cancelled';
  this.respondedAt = new Date();
  return await this.save();
};

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

module.exports = FriendRequest;