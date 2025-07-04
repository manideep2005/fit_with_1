const User = require('../models/User');
const bcrypt = require('bcrypt');

class UserService {
  // Create a new user
  static async createUser(userData) {
    try {
      const { email, password, fullName } = userData;
      
      // Check if user already exists using direct query
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
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
  
  // Authenticate user - FIXED to handle schema corruption gracefully
  static async authenticateUser(email, password) {
    try {
      const mongoose = require('mongoose');
      const bcrypt = require('bcrypt');
      
      // Use direct MongoDB operations to avoid schema issues during authentication
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      // Find user directly from collection
      const user = await collection.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      // Verify password using bcrypt directly
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }
      
      // Update last login using direct MongoDB operations
      await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { 
          $set: { lastLogin: new Date() },
          $inc: { loginCount: 1 }
        }
      );
      
      // Return user without password, ensuring arrays are properly formatted
      const userObject = {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        fitnessId: user.fitnessId, // Add fitnessId
        isActive: user.isActive !== false, // Default to true if undefined
        isVerified: user.isVerified || false,
        onboardingCompleted: user.onboardingCompleted || false,
        personalInfo: user.personalInfo || {},
        fitnessGoals: user.fitnessGoals || {},
        healthInfo: user.healthInfo || {},
        preferences: user.preferences || {},
        subscription: user.subscription || { plan: 'free', status: 'active' },
        workouts: Array.isArray(user.workouts) ? user.workouts : [],
        biometrics: Array.isArray(user.biometrics) ? user.biometrics : [],
        nutritionLogs: Array.isArray(user.nutritionLogs) ? user.nutritionLogs : [],
        friends: Array.isArray(user.friends) ? user.friends : [],
        challenges: Array.isArray(user.challenges) ? user.challenges : [],
        lastLogin: new Date(),
        loginCount: (user.loginCount || 0) + 1,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      return userObject;
    } catch (error) {
      console.error('Error authenticating user:', error);
      throw error;
    }
  }
  
  // Get user by email (returns plain object) - FIXED to handle schema corruption
  static async getUserByEmail(email) {
    try {
      const mongoose = require('mongoose');
      
      // Use direct MongoDB operations to avoid schema issues
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      const user = await collection.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return null;
      }
      
      // Return user without password, ensuring arrays are properly formatted
      const userObject = {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        profilePhoto: user.profilePhoto || null,
        isActive: user.isActive !== false,
        isVerified: user.isVerified || false,
        onboardingCompleted: user.onboardingCompleted || false,
        personalInfo: user.personalInfo || {},
        fitnessGoals: user.fitnessGoals || {},
        healthInfo: user.healthInfo || {},
        preferences: user.preferences || {},
        subscription: user.subscription || { plan: 'free', status: 'active' },
        workouts: Array.isArray(user.workouts) ? user.workouts : [],
        biometrics: Array.isArray(user.biometrics) ? user.biometrics : [],
        nutritionLogs: Array.isArray(user.nutritionLogs) ? user.nutritionLogs : [],
        friends: Array.isArray(user.friends) ? user.friends : [],
        challenges: Array.isArray(user.challenges) ? user.challenges : [],
        lastLogin: user.lastLogin,
        loginCount: user.loginCount || 0,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
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
  
  // Complete user onboarding - FIXED to use direct MongoDB operations to avoid schema conflicts
  static async completeOnboarding(email, onboardingData) {
    try {
      const mongoose = require('mongoose');
      
      // Use direct MongoDB operations to avoid schema validation issues
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      // First check if user exists
      const existingUser = await collection.findOne({ email: email.toLowerCase().trim() });
      if (!existingUser) {
        throw new Error('User not found');
      }
      
      console.log('Found user for onboarding completion:', existingUser.email);
      
      // Prepare update data with proper validation
      const updateData = {
        onboardingCompleted: true,
        personalInfo: onboardingData.personalInfo || {},
        fitnessGoals: onboardingData.fitnessGoals || {},
        healthInfo: onboardingData.healthInfo || {},
        preferences: onboardingData.preferences || {},
        updatedAt: new Date()
      };
      
      console.log('Updating user with data:', JSON.stringify(updateData, null, 2));
      
      // Update user directly in database
      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { $set: updateData }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found during update');
      }
      
      if (result.modifiedCount === 0) {
        console.log('No modifications made - user may already have this data');
      }
      
      console.log('Update result:', result);
      
      // Get updated user
      const updatedUser = await collection.findOne({ email: email.toLowerCase().trim() });
      if (!updatedUser) {
        throw new Error('Failed to retrieve updated user');
      }
      
      // Return user without password
      const userObject = { ...updatedUser };
      delete userObject.password;
      
      console.log('Onboarding completion successful for user:', userObject.email);
      return userObject;
    } catch (error) {
      console.error('Error completing onboarding:', {
        message: error.message,
        stack: error.stack,
        email: email
      });
      throw error;
    }
  }
  
  // Update user profile
  static async updateUserProfile(email, updateData) {
    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
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
  
  // Add workout - FIXED to use direct MongoDB operations to avoid schema conflicts
  static async addWorkout(email, workoutData) {
    try {
      const mongoose = require('mongoose');
      
      // Use direct MongoDB collection operations to completely bypass Mongoose schema issues
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { $push: { workouts: workoutData } }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      if (result.modifiedCount === 0) {
        throw new Error('Failed to add workout');
      }
      
      // Return the workout data that was added
      return workoutData;
    } catch (error) {
      console.error('Error adding workout:', error);
      throw error;
    }
  }
  
  // Get user workouts
  static async getUserWorkouts(email, limit = 10) {
    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        throw new Error('User not found');
      }
      
      // Ensure workouts is an array before sorting
      const workouts = user.workouts || [];
      return workouts
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting user workouts:', error);
      throw error;
    }
  }
  
  // Add biometric data - FIXED to use direct MongoDB operations to avoid schema conflicts
  static async addBiometrics(email, biometricData) {
    try {
      const mongoose = require('mongoose');
      
      // Use direct MongoDB collection operations to completely bypass Mongoose schema issues
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { $push: { biometrics: biometricData } }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      if (result.modifiedCount === 0) {
        throw new Error('Failed to add biometric data');
      }
      
      // Return the biometric data that was added
      return biometricData;
    } catch (error) {
      console.error('Error adding biometrics:', error);
      throw error;
    }
  }
  
  // Get user biometrics
  static async getUserBiometrics(email, limit = 10) {
    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        throw new Error('User not found');
      }
      
      // Ensure biometrics is an array before sorting
      const biometrics = user.biometrics || [];
      return biometrics
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting user biometrics:', error);
      throw error;
    }
  }
  
  // Add nutrition log - FIXED to use direct MongoDB operations to avoid schema conflicts
  static async addNutritionLog(email, nutritionData) {
    try {
      const mongoose = require('mongoose');
      
      // Use direct MongoDB collection operations to completely bypass Mongoose schema issues
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { $push: { nutritionLogs: nutritionData } }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      if (result.modifiedCount === 0) {
        throw new Error('Failed to add nutrition log');
      }
      
      // Return the nutrition data that was added
      return nutritionData;
    } catch (error) {
      console.error('Error adding nutrition log:', error);
      throw error;
    }
  }
  
  // Get user nutrition logs
  static async getUserNutritionLogs(email, limit = 7) {
    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        throw new Error('User not found');
      }
      
      // Ensure nutritionLogs is an array before sorting
      const nutritionLogs = user.nutritionLogs || [];
      return nutritionLogs
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting user nutrition logs:', error);
      throw error;
    }
  }
  
  // Update password - FIXED to use direct MongoDB operations
  static async updatePassword(email, currentPassword, newPassword) {
    try {
      const mongoose = require('mongoose');
      const bcrypt = require('bcrypt');
      
      // Get user using Mongoose for password comparison
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify current password
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }
      
      // Use direct MongoDB operations to update password
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      // Hash the new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password directly in database
      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { $set: { password: hashedPassword } }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      if (result.modifiedCount === 0) {
        throw new Error('Failed to update password');
      }
      
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }
  
  // Reset password (for forgot password functionality) - FIXED to use direct MongoDB operations
  static async resetPassword(email, newPassword) {
    try {
      const mongoose = require('mongoose');
      const bcrypt = require('bcrypt');
      
      // Use direct MongoDB operations to avoid schema conflicts
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      // Check if user exists
      const user = await collection.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        throw new Error('User not found');
      }
      
      // Hash the new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password directly in database
      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { $set: { password: hashedPassword } }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      if (result.modifiedCount === 0) {
        throw new Error('Failed to update password');
      }
      
      return { success: true, message: 'Password reset successfully' };
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }
  
  // Delete user account
  static async deleteUser(email, password) {
    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
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
  
  // Update user preferences - FIXED to use direct MongoDB operations to avoid schema conflicts
  static async updateUserPreferences(email, preferences) {
    try {
      // Get current user preferences first
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        throw new Error('User not found');
      }
      
      // Merge preferences
      const updatedPreferences = { 
        ...user.preferences?.toObject?.() || user.preferences || {}, 
        ...preferences 
      };
      
      // Use direct MongoDB update operation
      const result = await User.updateOne(
        { email: email.toLowerCase().trim() },
        { $set: { preferences: updatedPreferences } }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      if (result.modifiedCount === 0) {
        throw new Error('Failed to update preferences');
      }
      
      // Return updated user without password
      const updatedUser = await User.findOne({ email: email.toLowerCase().trim() });
      const userObject = updatedUser.toObject();
      delete userObject.password;
      
      return userObject;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  // Get user statistics
  static async getUserStats(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        throw new Error('User not found');
      }
      
      // Ensure arrays exist before processing
      const workouts = user.workouts || [];
      const biometrics = user.biometrics || [];
      
      const stats = {
        totalWorkouts: workouts.length,
        totalWorkoutTime: workouts.reduce((total, workout) => total + (workout.duration || 0), 0),
        totalCaloriesBurned: workouts.reduce((total, workout) => total + (workout.calories || 0), 0),
        currentWeight: biometrics.length > 0 ? biometrics[biometrics.length - 1]?.weight : user.personalInfo?.weight,
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

  // Subscription Management Methods
  
  // Update user subscription
  static async updateSubscription(email, subscriptionData) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { $set: { subscription: subscriptionData } }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      if (result.modifiedCount === 0) {
        throw new Error('Failed to update subscription');
      }
      
      return { success: true, message: 'Subscription updated successfully' };
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }
  
  // Add payment to user's payment history
  static async addPayment(email, paymentData) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { $push: { 'subscription.paymentHistory': paymentData } }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      if (result.modifiedCount === 0) {
        throw new Error('Failed to add payment');
      }
      
      return paymentData;
    } catch (error) {
      console.error('Error adding payment:', error);
      throw error;
    }
  }
  
  // Get user subscription details
  static async getSubscription(email) {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      
      return user.subscription || { plan: 'free', status: 'active' };
    } catch (error) {
      console.error('Error getting subscription:', error);
      throw error;
    }
  }

  // Settings-specific methods
  
  // Update profile information
  static async updateProfile(email, profileData) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      const updateData = {};
      if (profileData.fullName) updateData.fullName = profileData.fullName;
      if (profileData.email) updateData.email = profileData.email.toLowerCase().trim();
      
      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { $set: updateData }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      const updatedUser = await collection.findOne({ email: profileData.email?.toLowerCase().trim() || email.toLowerCase().trim() });
      delete updatedUser.password;
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }
  
  // Update profile photo
  static async updateProfilePhoto(email, photoUrl) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { $set: { profilePhoto: photoUrl } }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      return { photoUrl };
    } catch (error) {
      console.error('Error updating profile photo:', error);
      throw error;
    }
  }
  
  // Remove profile photo
  static async removeProfilePhoto(email) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { $unset: { profilePhoto: "" } }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error removing profile photo:', error);
      throw error;
    }
  }
  
  // Reset all user data
  static async resetUserData(email) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { 
          $set: {
            workouts: [],
            biometrics: [],
            nutritionLogs: [],
            'gamification.totalXP': 0,
            'gamification.currentLevel': 1,
            'gamification.streaks.workout.current': 0,
            'gamification.streaks.nutrition.current': 0,
            'gamification.achievements': [],
            'gamification.rewards': []
          }
        }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      return { success: true, message: 'All data has been reset successfully' };
    } catch (error) {
      console.error('Error resetting user data:', error);
      throw error;
    }
  }
  
  // Delete account
  static async deleteAccount(email) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      // Also clean up related data
      const userSessionsCollection = db.collection('usersessions');
      const messagesCollection = db.collection('messages');
      const friendRequestsCollection = db.collection('friendrequests');
      
      // Get user ID first
      const user = await collection.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        throw new Error('User not found');
      }
      
      const userId = user._id;
      
      // Delete user sessions
      await userSessionsCollection.deleteMany({ userId: userId });
      
      // Delete messages
      await messagesCollection.deleteMany({ 
        $or: [{ sender: userId }, { receiver: userId }] 
      });
      
      // Delete friend requests
      await friendRequestsCollection.deleteMany({ 
        $or: [{ sender: userId }, { receiver: userId }] 
      });
      
      // Delete user
      const result = await collection.deleteOne({ email: email.toLowerCase().trim() });
      
      if (result.deletedCount === 0) {
        throw new Error('Failed to delete account');
      }
      
      return { success: true, message: 'Account deleted successfully' };
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  // Meal planner methods
  
  // Add meal plan
  static async addMealPlan(email, mealData) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { $push: { mealPlans: mealData } }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      return mealData;
    } catch (error) {
      console.error('Error adding meal plan:', error);
      throw error;
    }
  }
  
  // Update meal plan
  static async updateMealPlan(email, mealId, updateData) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      const result = await collection.updateOne(
        { 
          email: email.toLowerCase().trim(),
          'mealPlans.id': mealId
        },
        { 
          $set: {
            'mealPlans.$.mealType': updateData.mealType,
            'mealPlans.$.name': updateData.name,
            'mealPlans.$.calories': updateData.calories,
            'mealPlans.$.protein': updateData.protein,
            'mealPlans.$.carbs': updateData.carbs,
            'mealPlans.$.fat': updateData.fat,
            'mealPlans.$.notes': updateData.notes,
            'mealPlans.$.updatedAt': updateData.updatedAt
          }
        }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User or meal not found');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating meal plan:', error);
      throw error;
    }
  }
  
  // Delete meal plan
  static async deleteMealPlan(email, mealId) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { $pull: { mealPlans: { id: mealId } } }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      throw error;
    }
  }
}

module.exports = UserService;