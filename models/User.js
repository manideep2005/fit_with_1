const mongoose = require('mongoose');

// Personal Information Schema
const personalInfoSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  age: { type: Number, min: 13, max: 120 },
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer-not-to-say'] },
  height: { type: Number }, // in cm
  weight: { type: Number }, // in kg
  location: { type: String }
}, { _id: false });

// Fitness Goals Schema
const fitnessGoalsSchema = new mongoose.Schema({
  primaryGoal: { 
    type: String, 
    enum: ['weight-loss', 'muscle-gain', 'endurance', 'strength', 'general-fitness', 'flexibility'] 
  },
  targetWeight: { type: Number },
  activityLevel: { 
    type: String, 
    enum: ['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active'] 
  },
  workoutFrequency: { type: Number, min: 0, max: 7 }, // days per week
  preferredWorkoutTypes: [{ type: String }],
  fitnessExperience: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'] 
  }
}, { _id: false });

// Health Information Schema
const healthInfoSchema = new mongoose.Schema({
  medicalConditions: [{ type: String }],
  medications: [{ type: String }],
  allergies: [{ type: String }],
  injuries: [{ type: String }],
  dietaryRestrictions: [{ type: String }],
  smokingStatus: { 
    type: String, 
    enum: ['never', 'former', 'current'] 
  },
  alcoholConsumption: { 
    type: String, 
    enum: ['none', 'occasional', 'moderate', 'frequent'] 
  }
}, { _id: false });

// Preferences Schema
const preferencesSchema = new mongoose.Schema({
  workoutTime: { 
    type: String, 
    enum: ['early-morning', 'morning', 'afternoon', 'evening', 'night'] 
  },
  workoutDuration: { type: Number }, // in minutes
  equipmentAccess: [{ type: String }],
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    workout: { type: Boolean, default: true },
    nutrition: { type: Boolean, default: true },
    progress: { type: Boolean, default: true }
  },
  privacy: {
    profileVisibility: { 
      type: String, 
      enum: ['public', 'friends', 'private'], 
      default: 'friends' 
    },
    shareProgress: { type: Boolean, default: false },
    shareWorkouts: { type: Boolean, default: false }
  }
}, { _id: false });

// Main User Schema
const userSchema = new mongoose.Schema({
  // Basic Authentication
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  fullName: { 
    type: String, 
    required: true,
    trim: true
  },

  // Account Status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  onboardingCompleted: { type: Boolean, default: false },
  
  // Onboarding Data
  personalInfo: personalInfoSchema,
  fitnessGoals: fitnessGoalsSchema,
  healthInfo: healthInfoSchema,
  preferences: preferencesSchema,

  // Activity Tracking
  lastLogin: { type: Date },
  loginCount: { type: Number, default: 0 },
  
  // Subscription Data
  subscription: {
    plan: { 
      type: String, 
      enum: ['free', 'basic', 'premium', 'pro'], 
      default: 'free' 
    },
    status: { 
      type: String, 
      enum: ['active', 'inactive', 'cancelled', 'expired'], 
      default: 'active' 
    },
    startDate: { type: Date },
    endDate: { type: Date },
    autoRenew: { type: Boolean, default: false },
    paymentHistory: [{
      date: { type: Date, default: Date.now },
      amount: Number,
      plan: String,
      duration: String, // monthly, yearly
      paymentMethod: String,
      transactionId: String,
      status: { type: String, enum: ['completed', 'pending', 'failed'], default: 'completed' }
    }]
  },
  
  // Progress Data
  workouts: [{
    date: { type: Date, default: Date.now },
    type: String,
    duration: Number, // in minutes
    calories: Number,
    exercises: [{
      name: String,
      sets: Number,
      reps: Number,
      weight: Number,
      duration: Number
    }],
    notes: String
  }],

  biometrics: [{
    date: { type: Date, default: Date.now },
    weight: Number,
    bodyFat: Number,
    muscleMass: Number,
    measurements: {
      chest: Number,
      waist: Number,
      hips: Number,
      arms: Number,
      thighs: Number
    }
  }],

  // Nutrition Data
  nutritionLogs: [{
    date: { type: Date, default: Date.now },
    meals: [{
      type: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
      foods: [{
        name: String,
        quantity: Number,
        unit: String,
        calories: Number,
        protein: Number,
        carbs: Number,
        fat: Number
      }]
    }],
    totalCalories: Number,
    totalProtein: Number,
    totalCarbs: Number,
    totalFat: Number,
    waterIntake: Number // in ml
  }],

  // Social Features
  friends: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  challenges: [{
    challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
    joinedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' },
    progress: Number
  }],

  // AI Coach Data
  aiCoachData: {
    personalityType: String,
    motivationStyle: String,
    communicationPreference: String,
    lastInteraction: Date,
    conversationHistory: [{
      timestamp: { type: Date, default: Date.now },
      message: String,
      response: String,
      context: String
    }]
  },

  // Gamification System
  gamification: {
    // Experience Points and Level
    totalXP: { type: Number, default: 0 },
    currentLevel: { type: Number, default: 1 },
    xpToNextLevel: { type: Number, default: 100 },
    
    // Streaks
    streaks: {
      workout: {
        current: { type: Number, default: 0 },
        longest: { type: Number, default: 0 },
        lastWorkoutDate: { type: Date }
      },
      nutrition: {
        current: { type: Number, default: 0 },
        longest: { type: Number, default: 0 },
        lastLogDate: { type: Date }
      },
      login: {
        current: { type: Number, default: 0 },
        longest: { type: Number, default: 0 },
        lastLoginDate: { type: Date }
      }
    },
    
    // Achievements/Badges
    achievements: [{
      id: String,
      name: String,
      description: String,
      category: { type: String, enum: ['workout', 'nutrition', 'social', 'milestone', 'streak', 'special'] },
      icon: String,
      rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' },
      xpReward: { type: Number, default: 0 },
      unlockedAt: { type: Date, default: Date.now },
      progress: { type: Number, default: 100 } // Percentage completed
    }],
    
    // Challenges Progress
    challengeStats: {
      completed: { type: Number, default: 0 },
      active: { type: Number, default: 0 },
      totalParticipated: { type: Number, default: 0 }
    },
    
    // Fitness Character Stats (RPG-like)
    character: {
      strength: { type: Number, default: 10 },
      endurance: { type: Number, default: 10 },
      flexibility: { type: Number, default: 10 },
      nutrition: { type: Number, default: 10 },
      consistency: { type: Number, default: 10 },
      overall: { type: Number, default: 50 }
    },
    
    // Weekly/Monthly Stats
    weeklyStats: {
      workoutsCompleted: { type: Number, default: 0 },
      caloriesBurned: { type: Number, default: 0 },
      xpEarned: { type: Number, default: 0 },
      weekStartDate: { type: Date }
    },
    
    monthlyStats: {
      workoutsCompleted: { type: Number, default: 0 },
      caloriesBurned: { type: Number, default: 0 },
      xpEarned: { type: Number, default: 0 },
      monthStartDate: { type: Date }
    },
    
    // Rewards and Unlocks
    rewards: [{
      id: String,
      name: String,
      type: { type: String, enum: ['health', 'fitness', 'workout-plan', 'recipe', 'customization', 'feature', 'badge'] },
      subType: String, // More specific reward type
      description: String,
      value: String, // Reward value/benefit description
      unlockedAt: { type: Date, default: Date.now },
      used: { type: Boolean, default: false },
      usedAt: Date,
      streakType: String, // 'workout' or 'nutrition'
      streakCount: Number, // Streak length when earned
      expiresAt: Date,
      rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' }
    }],
    
    // Social Gamification
    social: {
      friendsInvited: { type: Number, default: 0 },
      workoutsShared: { type: Number, default: 0 },
      challengesWon: { type: Number, default: 0 },
      helpfulVotes: { type: Number, default: 0 }
    }
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
// userSchema.index({ email: 1 }); // Removed: duplicate index (email already has unique: true)
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ 'workouts.date': -1 });
userSchema.index({ 'biometrics.date': -1 });

// Virtual for full name from personal info
userSchema.virtual('displayName').get(function() {
  if (this.personalInfo && this.personalInfo.firstName && this.personalInfo.lastName) {
    return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
  }
  return this.fullName;
});

// Virtual for BMI calculation
userSchema.virtual('bmi').get(function() {
  if (this.personalInfo && this.personalInfo.height && this.personalInfo.weight) {
    const heightInM = this.personalInfo.height / 100;
    return (this.personalInfo.weight / (heightInM * heightInM)).toFixed(1);
  }
  return null;
});

// Virtual for latest biometrics
userSchema.virtual('latestBiometrics').get(function() {
  if (this.biometrics && this.biometrics.length > 0) {
    return this.biometrics[this.biometrics.length - 1];
  }
  return null;
});

// Virtual for subscription display name
userSchema.virtual('subscriptionDisplayName').get(function() {
  const planNames = {
    'free': 'Free Plan',
    'basic': 'Basic Plan',
    'premium': 'Premium Plan',
    'pro': 'Pro Plan'
  };
  return planNames[this.subscription?.plan || 'free'] || 'Free Plan';
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();
  
  try {
    const bcrypt = require('bcrypt');
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

// Method to complete onboarding
userSchema.methods.completeOnboarding = function(onboardingData) {
  this.onboardingCompleted = true;
  
  if (onboardingData.personalInfo) {
    this.personalInfo = onboardingData.personalInfo;
  }
  if (onboardingData.fitnessGoals) {
    this.fitnessGoals = onboardingData.fitnessGoals;
  }
  if (onboardingData.healthInfo) {
    this.healthInfo = onboardingData.healthInfo;
  }
  if (onboardingData.preferences) {
    this.preferences = onboardingData.preferences;
  }
  
  return this.save();
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

// Static method to create user with validation
userSchema.statics.createUser = async function(userData) {
  const user = new this(userData);
  return await user.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;