const { generateOTP, sendPasswordResetOTP, sendPasswordResetConfirmation } = require('./emailService');
const UserService = require('./userService');

// In-memory storage for OTPs (in production, use Redis or database)
const otpStorage = new Map();

class PasswordResetService {
  // Generate and send OTP for password reset
  static async initiatePasswordReset(email) {
    try {
      // Check if user exists
      const user = await UserService.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        return {
          success: true,
          message: 'If an account with this email exists, you will receive a password reset code.'
        };
      }

      // Generate OTP
      const otp = generateOTP();
      const expiryTime = Date.now() + (10 * 60 * 1000); // 10 minutes from now

      // Store OTP with expiry
      otpStorage.set(email.toLowerCase(), {
        otp: otp,
        expiryTime: expiryTime,
        attempts: 0,
        maxAttempts: 3
      });

      // Send OTP email
      const emailResult = await sendPasswordResetOTP(email, user.fullName, otp);
      
      if (emailResult.success) {
        console.log(`Password reset OTP sent to ${email}`);
        return {
          success: true,
          message: 'Password reset code sent to your email address.'
        };
      } else {
        // Remove OTP from storage if email failed
        otpStorage.delete(email.toLowerCase());
        throw new Error('Failed to send password reset email');
      }
    } catch (error) {
      console.error('Error initiating password reset:', error);
      throw error;
    }
  }

  // Verify OTP
  static verifyOTP(email, providedOTP) {
    const emailKey = email.toLowerCase();
    const otpData = otpStorage.get(emailKey);

    if (!otpData) {
      return {
        success: false,
        message: 'No password reset request found. Please request a new code.'
      };
    }

    // Check if OTP has expired
    if (Date.now() > otpData.expiryTime) {
      otpStorage.delete(emailKey);
      return {
        success: false,
        message: 'Password reset code has expired. Please request a new code.'
      };
    }

    // Check attempts
    if (otpData.attempts >= otpData.maxAttempts) {
      otpStorage.delete(emailKey);
      return {
        success: false,
        message: 'Too many failed attempts. Please request a new code.'
      };
    }

    // Verify OTP
    if (otpData.otp !== providedOTP.toString()) {
      otpData.attempts += 1;
      otpStorage.set(emailKey, otpData);
      
      const remainingAttempts = otpData.maxAttempts - otpData.attempts;
      return {
        success: false,
        message: `Invalid code. ${remainingAttempts} attempts remaining.`
      };
    }

    // OTP is valid - mark as verified but don't delete yet
    otpData.verified = true;
    otpStorage.set(emailKey, otpData);

    return {
      success: true,
      message: 'Code verified successfully. You can now reset your password.'
    };
  }

  // Reset password after OTP verification
  static async resetPassword(email, newPassword, otp) {
    try {
      const emailKey = email.toLowerCase();
      const otpData = otpStorage.get(emailKey);

      // Verify OTP one more time
      if (!otpData || !otpData.verified || otpData.otp !== otp.toString()) {
        return {
          success: false,
          message: 'Invalid or expired verification code.'
        };
      }

      // Check if still within time limit
      if (Date.now() > otpData.expiryTime) {
        otpStorage.delete(emailKey);
        return {
          success: false,
          message: 'Verification code has expired. Please request a new code.'
        };
      }

      // Get user
      const user = await UserService.getUserByEmail(email);
      if (!user) {
        otpStorage.delete(emailKey);
        return {
          success: false,
          message: 'User not found.'
        };
      }

      // Update password
      await UserService.updatePassword(email, null, newPassword, true); // true = skip current password check

      // Remove OTP from storage
      otpStorage.delete(emailKey);

      // Send confirmation email
      try {
        await sendPasswordResetConfirmation(email, user.fullName);
      } catch (emailError) {
        console.error('Failed to send password reset confirmation email:', emailError);
        // Don't fail the password reset if confirmation email fails
      }

      console.log(`Password successfully reset for ${email}`);
      return {
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.'
      };
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  // Clean up expired OTPs (should be called periodically)
  static cleanupExpiredOTPs() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [email, otpData] of otpStorage.entries()) {
      if (now > otpData.expiryTime) {
        otpStorage.delete(email);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired OTPs`);
    }

    return cleanedCount;
  }

  // Get OTP storage stats (for debugging)
  static getStats() {
    return {
      totalOTPs: otpStorage.size,
      otps: Array.from(otpStorage.entries()).map(([email, data]) => ({
        email,
        expiryTime: new Date(data.expiryTime),
        attempts: data.attempts,
        verified: data.verified || false,
        expired: Date.now() > data.expiryTime
      }))
    };
  }

  // Clear all OTPs (for testing)
  static clearAllOTPs() {
    const count = otpStorage.size;
    otpStorage.clear();
    console.log(`Cleared ${count} OTPs from storage`);
    return count;
  }
}

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  PasswordResetService.cleanupExpiredOTPs();
}, 5 * 60 * 1000);

module.exports = PasswordResetService;