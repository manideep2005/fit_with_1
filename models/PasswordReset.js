const mongoose = require('mongoose');

// Password Reset Schema for serverless-friendly password reset
const passwordResetSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  
  otp: {
    type: String,
    required: true
  },
  
  verified: {
    type: Boolean,
    default: false
  },
  
  attempts: {
    type: Number,
    default: 0,
    max: 3
  },
  
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
  }
}, {
  timestamps: true
});

// Index for automatic cleanup of expired documents
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create or update password reset
passwordResetSchema.statics.createReset = async function(email, otp) {
  // Remove any existing reset for this email
  await this.deleteMany({ email: email.toLowerCase().trim() });
  
  // Create new reset
  return await this.create({
    email: email.toLowerCase().trim(),
    otp: otp,
    verified: false,
    attempts: 0
  });
};

// Static method to verify OTP
passwordResetSchema.statics.verifyOTP = async function(email, otp) {
  const reset = await this.findOne({ 
    email: email.toLowerCase().trim(),
    expiresAt: { $gt: new Date() }
  });
  
  if (!reset) {
    throw new Error('No password reset found or reset has expired');
  }
  
  if (reset.attempts >= 3) {
    throw new Error('Too many failed attempts. Please request a new reset code');
  }
  
  if (reset.otp !== otp) {
    reset.attempts += 1;
    await reset.save();
    throw new Error(`Invalid reset code. ${3 - reset.attempts} attempts remaining`);
  }
  
  // Mark as verified
  reset.verified = true;
  await reset.save();
  
  return reset;
};

// Static method to check if reset is verified
passwordResetSchema.statics.isVerified = async function(email) {
  const reset = await this.findOne({ 
    email: email.toLowerCase().trim(),
    verified: true,
    expiresAt: { $gt: new Date() }
  });
  
  return !!reset;
};

// Static method to complete reset and cleanup
passwordResetSchema.statics.completeReset = async function(email) {
  await this.deleteMany({ email: email.toLowerCase().trim() });
};

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

module.exports = PasswordReset;