const User = require('../models/User');
const bcrypt = require('bcrypt');

class UserService {
  // Create a new user
  static async createUser(userData) {
    try {
      const { email, password, fullName } = userData;
      
      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }
      
      // Create new user
      const user = new User({
        email: email.toLowerCase().trim(),
        password,
        fullName: fullName.trim(),
        onboardingCompleted: false
      });
      
      await user.save();
      
      // Return user without password
      const userObject = user.toObject();
      delete userObject.password;
      
      return userObject;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  // Authenticate user
  static async authenticateUser(email, password) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }
      
      // Update last login
      await user.updateLastLogin();
      
      // Return user without password
      const userObject = user.toObject();
      delete userObject.password;
      
      return userObject;
    } catch (error) {
      console.error('Error authenticating user:', error);
      throw error;
    }
  }
  
  // Get user by email
  static async getUserByEmail(email) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        return null;
      }
      
      // Return user without password
      const userObject = user.toObject();
      delete userObject.password;
      
      return userObject;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }
  
  // Get user by ID
  static async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return null;
      }
      
      // Return user without password
      const userObject = user.toObject();
      delete userObject.password;
      
      return userObject;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }
  
  // Complete user onboarding
  static async completeOnboarding(email, onboardingData) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      
      await user.completeOnboarding(onboardingData);
      
      // Return updated user without password
      const userObject = user.toObject();
      delete userObject.password;
      
      return userObject;
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  }
  
  // Update user profile
  static async updateUserProfile(email, updateData) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update allowed fields
      const allowedUpdates = ['fullName', 'personalInfo', 'fitnessGoals', 'healthInfo', 'preferences'];
      
      Object.keys(updateData).forEach(key => {
        if (allowedUpdates.includes(key)) {
          user[key] = updateData[key];
        }
      });
      
      await user.save();
      
      // Return updated user without password
      const userObject = user.toObject();
      delete userObject.password;
      
      return userObject;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
  
  // Add workout
  static async addWorkout(email, workoutData) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      
      user.workouts.push(workoutData);
      await user.save();
      
      return user.workouts[user.workouts.length - 1];
    } catch (error) {
      console.error('Error adding workout:', error);
      throw error;
    }
  }
  
  // Get user workouts
  static async getUserWorkouts(email, limit = 10) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      
      return user.workouts
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting user workouts:', error);
      throw error;
    }
  }
  
  // Add biometric data
  static async addBiometrics(email, biometricData) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      
      user.biometrics.push(biometricData);
      await user.save();
      
      return user.biometrics[user.biometrics.length - 1];
    } catch (error) {
      console.error('Error adding biometrics:', error);
      throw error;
    }
  }
  
  // Get user biometrics
  static async getUserBiometrics(email, limit = 10) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      
      return user.biometrics
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting user biometrics:', error);
      throw error;
    }
  }
  
  // Add nutrition log
  static async addNutritionLog(email, nutritionData) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      
      user.nutritionLogs.push(nutritionData);
      await user.save();
      
      return user.nutritionLogs[user.nutritionLogs.length - 1];
    } catch (error) {
      console.error('Error adding nutrition log:', error);
      throw error;
    }
  }
  
  // Get user nutrition logs
  static async getUserNutritionLogs(email, limit = 7) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      
      return user.nutritionLogs
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting user nutrition logs:', error);
      throw error;
    }
  }
  
  // Update password
  static async updatePassword(email, currentPassword, newPassword) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify current password
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }
      
      // Update password
      user.password = newPassword;
      await user.save();
      
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }
  
  // Reset password (for forgot password functionality)
  static async resetPassword(email, newPassword) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update password without requiring current password
      user.password = newPassword;
      await user.save();
      
      return { success: true, message: 'Password reset successfully' };
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }
  
  // Delete user account
  static async deleteUser(email, password) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify password before deletion
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        throw new Error('Password is incorrect');
      }
      
      await User.findByIdAndDelete(user._id);
      
      return { success: true, message: 'Account deleted successfully' };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
  
  // Get user statistics
  static async getUserStats(email) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      
      const stats = {
        totalWorkouts: user.workouts.length,
        totalWorkoutTime: user.workouts.reduce((total, workout) => total + (workout.duration || 0), 0),
        totalCaloriesBurned: user.workouts.reduce((total, workout) => total + (workout.calories || 0), 0),
        currentWeight: user.latestBiometrics?.weight || user.personalInfo?.weight,
        bmi: user.bmi,
        memberSince: user.createdAt,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
        onboardingCompleted: user.onboardingCompleted
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }
}

module.exports = UserService;