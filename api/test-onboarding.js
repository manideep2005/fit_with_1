// Test onboarding completion endpoint
module.exports = async (req, res) => {
  try {
    // Set working directory
    const path = require('path');
    process.chdir(path.join(__dirname, '..'));
    
    // Load required modules
    const database = require('../config/database');
    const UserService = require('../services/userService');
    
    console.log('Testing onboarding completion...');
    
    // Connect to database
    if (database.getConnectionStatus().status !== 'connected') {
      await database.connect();
    }
    
    const testEmail = 'test@example.com';
    
    // Check if user exists
    console.log('Checking if user exists...');
    const user = await UserService.getUserByEmail(testEmail);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        email: testEmail
      });
    }
    
    console.log('User found:', {
      email: user.email,
      fullName: user.fullName,
      onboardingCompleted: user.onboardingCompleted
    });
    
    // Test onboarding data
    const testOnboardingData = {
      personalInfo: {
        firstName: "Test",
        lastName: "User",
        age: 25,
        gender: "male",
        height: 175,
        weight: 70
      },
      fitnessGoals: {
        primaryGoal: "weight-loss",
        targetWeight: 65,
        activityLevel: "moderately-active",
        workoutFrequency: 3,
        preferredWorkoutTypes: ["weight-loss", "improve-fitness"],
        fitnessExperience: "beginner"
      },
      healthInfo: {
        dietaryRestrictions: [],
        smokingStatus: "never",
        alcoholConsumption: "rarely"
      },
      preferences: {
        workoutTime: "morning",
        workoutDuration: 60,
        equipmentAccess: [],
        notifications: {
          email: true,
          push: true,
          workout: true,
          nutrition: true,
          progress: true
        },
        privacy: {
          profileVisibility: "friends",
          shareProgress: false,
          shareWorkouts: false
        }
      }
    };
    
    console.log('Attempting to complete onboarding...');
    
    try {
      const updatedUser = await UserService.completeOnboarding(testEmail, testOnboardingData);
      
      res.status(200).json({
        success: true,
        message: 'Onboarding test completed successfully',
        user: {
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          onboardingCompleted: updatedUser.onboardingCompleted,
          personalInfo: updatedUser.personalInfo,
          fitnessGoals: updatedUser.fitnessGoals
        }
      });
      
    } catch (onboardingError) {
      console.error('Onboarding completion failed:', onboardingError);
      res.status(500).json({
        error: 'Onboarding completion failed',
        message: onboardingError.message,
        stack: onboardingError.stack
      });
    }
    
  } catch (error) {
    console.error('Test onboarding error:', error);
    res.status(500).json({
      error: 'Test failed',
      message: error.message,
      stack: error.stack
    });
  }
};