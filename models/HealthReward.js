const mongoose = require('mongoose');

// Health Reward Schema
const healthRewardSchema = new mongoose.Schema({
  // Reward Identification
  rewardId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  
  // Reward Type and Category
  type: { 
    type: String, 
    enum: ['blood-test', 'health-checkup', 'discount-coupon', 'consultation', 'lab-test'], 
    required: true 
  },
  category: { 
    type: String, 
    enum: ['diagnostic', 'preventive', 'wellness', 'specialty'], 
    required: true 
  },
  
  // Unlock Requirements
  streakRequirement: { 
    type: Number, 
    required: true 
  },
  streakType: { 
    type: String, 
    enum: ['workout', 'nutrition', 'combined'], 
    required: true 
  },
  
  // Reward Details
  value: { 
    type: Number, // Monetary value or percentage discount
    required: true 
  },
  valueType: { 
    type: String, 
    enum: ['percentage', 'fixed-amount', 'free'], 
    default: 'percentage' 
  },
  
  // Validity and Usage
  validityDays: { 
    type: Number, 
    default: 30 // Days from unlock
  },
  maxUsage: { 
    type: Number, 
    default: 1 // How many times can be used
  },
  
  // Partner Information
  partnerName: String,
  partnerLogo: String,
  partnerWebsite: String,
  
  // Availability
  isActive: { 
    type: Boolean, 
    default: true 
  },
  availableRegions: [String], // Geographic regions where available
  
  // Terms and Conditions
  terms: String,
  instructions: String, // How to redeem
  
  // Metadata
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// User Health Reward Instance Schema (tracks individual user rewards)
const userHealthRewardSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  rewardId: { 
    type: String, 
    required: true 
  },
  
  // Unlock Information
  unlockedAt: { 
    type: Date, 
    default: Date.now 
  },
  streakAchieved: { 
    type: Number, 
    required: true 
  },
  streakType: { 
    type: String, 
    enum: ['workout', 'nutrition', 'combined'], 
    required: true 
  },
  
  // Usage Tracking
  status: { 
    type: String, 
    enum: ['available', 'redeemed', 'expired', 'used'], 
    default: 'available' 
  },
  usageCount: { 
    type: Number, 
    default: 0 
  },
  redeemedAt: Date,
  usedAt: [Date], // Array of usage dates
  
  // Expiry
  expiresAt: { 
    type: Date, 
    required: true 
  },
  
  // Redemption Details
  redemptionCode: String, // Unique code for redemption
  redemptionInstructions: String,
  
  // Location Context (where user was when unlocked)
  userLocation: {
    city: String,
    state: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Nearby Facilities (cached at unlock time)
  nearbyFacilities: [{
    name: String,
    address: String,
    phone: String,
    website: String,
    distance: Number, // in km
    rating: Number,
    specialties: [String],
    coordinates: {
      lat: Number,
      lng: Number
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
healthRewardSchema.index({ rewardId: 1 });
healthRewardSchema.index({ type: 1, isActive: 1 });
healthRewardSchema.index({ streakRequirement: 1, streakType: 1 });

userHealthRewardSchema.index({ userId: 1, status: 1 });
userHealthRewardSchema.index({ userId: 1, expiresAt: 1 });
userHealthRewardSchema.index({ rewardId: 1, userId: 1 });

// Pre-save middleware to update timestamps
healthRewardSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate unique redemption code
userHealthRewardSchema.pre('save', function(next) {
  if (this.isNew && !this.redemptionCode) {
    this.redemptionCode = this.generateRedemptionCode();
  }
  next();
});

// Method to generate redemption code
userHealthRewardSchema.methods.generateRedemptionCode = function() {
  const prefix = this.streakType.toUpperCase().substring(0, 2);
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}${random}`.toUpperCase();
};

// Method to check if reward is still valid
userHealthRewardSchema.methods.isValid = function() {
  return this.status === 'available' && this.expiresAt > new Date();
};

// Method to redeem reward
userHealthRewardSchema.methods.redeem = function() {
  if (!this.isValid()) {
    throw new Error('Reward is not valid for redemption');
  }
  
  this.status = 'redeemed';
  this.redeemedAt = new Date();
  return this.save();
};

// Method to mark as used
userHealthRewardSchema.methods.markAsUsed = function() {
  if (this.status !== 'redeemed') {
    throw new Error('Reward must be redeemed before marking as used');
  }
  
  this.usageCount += 1;
  this.usedAt.push(new Date());
  
  // Check if max usage reached
  const maxUsage = 1; // Default, should be fetched from HealthReward
  if (this.usageCount >= maxUsage) {
    this.status = 'used';
  }
  
  return this.save();
};

// Static method to find available rewards for user
userHealthRewardSchema.statics.findAvailableForUser = function(userId) {
  return this.find({
    userId: userId,
    status: 'available',
    expiresAt: { $gt: new Date() }
  }).sort({ unlockedAt: -1 });
};

// Static method to find expired rewards and mark them
userHealthRewardSchema.statics.markExpiredRewards = async function() {
  const expiredRewards = await this.find({
    status: 'available',
    expiresAt: { $lt: new Date() }
  });
  
  for (const reward of expiredRewards) {
    reward.status = 'expired';
    await reward.save();
  }
  
  return expiredRewards.length;
};

const HealthReward = mongoose.model('HealthReward', healthRewardSchema);
const UserHealthReward = mongoose.model('UserHealthReward', userHealthRewardSchema);

module.exports = {
  HealthReward,
  UserHealthReward
};