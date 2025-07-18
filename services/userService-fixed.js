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
        fitnessId: user.fitnessId,
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
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      const user = await collection.findOne({ _id: new mongoose.Types.ObjectId(userId) });
      if (!user) {
        return null;
      }
      
      // Return user without password
      const userObject = { ...user };
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
  
  // Add workout - COMPLETELY FIXED
  static async addWorkout(email, workoutData) {
    try {
      const mongoose = require('mongoose');
      
      // Use direct MongoDB operations to avoid any schema conflicts
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      // Ensure workoutData has proper structure
      const workout = {
        date: workoutData.date || new Date(),
        type: workoutData.type || 'General',
        duration: Number(workoutData.duration) || 0,
        calories: Number(workoutData.calories) || 0,
        exercises: Array.isArray(workoutData.exercises) ? workoutData.exercises : [],
        notes: workoutData.notes || ''
      };
      
      console.log('Adding workout with proper structure:', workout);
      
      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { $push: { workouts: workout } }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      if (result.modifiedCount === 0) {
        throw new Error('Failed to add workout');
      }
      
      console.log('Workout added successfully');
      
      // Return the updated user data using direct MongoDB query
      const updatedUser = await collection.findOne({ email: email.toLowerCase().trim() });
      if (updatedUser) {
        delete updatedUser.password;
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Error adding workout:', error);
      throw error;
    }
  }
  
  // Add biometric data
  static async addBiometrics(email, biometricData) {
    try {
      const mongoose = require('mongoose');
      
      // Use direct MongoDB operations to avoid any schema conflicts
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      // Ensure biometricData has proper structure
      const biometric = {
        date: biometricData.date || new Date(),
        weight: biometricData.weight ? Number(biometricData.weight) : null,
        bodyFat: biometricData.bodyFat ? Number(biometricData.bodyFat) : null,
        muscleMass: biometricData.muscleMass ? Number(biometricData.muscleMass) : null,
        measurements: biometricData.measurements || {}
      };

      console.log('Adding biometric with proper structure:', biometric);

      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { $push: { biometrics: biometric } }
      );

      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }

      if (result.modifiedCount === 0) {
        throw new Error('Failed to add biometric data');
      }

      console.log('Biometric data added successfully');
      
      // Return the updated user data
      const updatedUser = await collection.findOne({ email: email.toLowerCase().trim() });
      if (updatedUser) {
        delete updatedUser.password;
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Error adding biometrics:', error);
      throw error;
    }
  }
  
  // Add nutrition log
  static async addNutritionLog(email, nutritionData) {
    try {
      const mongoose = require('mongoose');
      
      // Use direct MongoDB operations to avoid any schema conflicts
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      // Ensure nutritionData has proper structure
      const nutrition = {
        date: nutritionData.date || new Date(),
        meals: Array.isArray(nutritionData.meals) ? nutritionData.meals : [],
        totalCalories: Number(nutritionData.totalCalories) || 0,
        totalProtein: Number(nutritionData.totalProtein) || 0,
        totalCarbs: Number(nutritionData.totalCarbs) || 0,
        totalFat: Number(nutritionData.totalFat) || 0,
        waterIntake: Number(nutritionData.waterIntake) || 0
      };

      console.log('Adding nutrition log with proper structure:', nutrition);

      const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        { $push: { nutritionLogs: nutrition } }
      );

      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }

      if (result.modifiedCount === 0) {
        throw new Error('Failed to add nutrition log');
      }

      console.log('Nutrition log added successfully');
      
      // Return the updated user data
      const updatedUser = await collection.findOne({ email: email.toLowerCase().trim() });
      if (updatedUser) {
        delete updatedUser.password;
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Error adding nutrition log:', error);
      throw error;
    }
  }
  
  // Get user workouts
  static async getUserWorkouts(email, limit = 10) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      
      const user = await collection.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        throw new Error('User not found');
      }
      
      // Ensure workouts is an array before sorting
      const workouts = Array.isArray(user.workouts) ? user.workouts : [];
      return workouts
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting user workouts:', error);
      throw error;
    }
  }
  
  // Reset password
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
}

module.exports = UserService;