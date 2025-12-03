const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  fitnessId: { type: String, unique: true },
  onboardingCompleted: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  personalInfo: { type: Object, default: {} },
  fitnessGoals: { type: Object, default: {} },
  healthInfo: { type: Object, default: {} },
  preferences: { type: Object, default: {} },
  subscription: { type: Object, default: { plan: 'free', status: 'active' } },
  workouts: { type: Array, default: [] },
  nutritionLogs: { type: Array, default: [] },
  biometrics: { type: Array, default: [] },
  gamification: { type: Object, default: {} }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);