const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const UserService = require('../services/userService');
const User = require('../models/User');

// GET settings page
router.get('/', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const user = await User.findById(req.session.user._id);
    res.render('settings', { user });
});

// POST to update settings
router.post('/', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        const user = await User.findById(req.session.user._id);

        // Update user fields
        user.personalInfo = req.body.personalInfo;
        user.fitnessGoals = req.body.fitnessGoals;
        user.healthInfo = req.body.healthInfo;
        user.preferences = req.body.preferences;
        user.dailyCalorieGoal = req.body.dailyCalorieGoal;
        user.dailyWaterGoal = req.body.dailyWaterGoal;
        user.regionalPreference = req.body.regionalPreference;

        await user.save();

        res.redirect('/settings');
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).send('Error updating settings');
    }
});

// Configure multer for profile photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Update profile information
router.post('/profile', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const { fullName, email } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        error: 'Full name and email are required'
      });
    }

    const updatedUser = await UserService.updateProfile(userEmail, {
      fullName: fullName.trim(),
      email: email.trim()
    });

    // Update session
    req.session.user.fullName = updatedUser.fullName;
    req.session.user.email = updatedUser.email;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        fullName: updatedUser.fullName,
        email: updatedUser.email
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update profile'
    });
  }
});

// Upload profile photo
router.post('/profile-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No photo file provided'
      });
    }

    const userEmail = req.session.user.email;
    const photoUrl = `/uploads/profiles/${req.file.filename}`;

    await UserService.updateProfilePhoto(userEmail, photoUrl);
    
    // Update session
    req.session.user.profilePhoto = photoUrl;
    
    // Save session immediately and wait for it to complete
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to save session'
        });
      }
      
      res.json({
        success: true,
        message: 'Profile photo updated successfully',
        photoUrl: photoUrl + '?t=' + Date.now() // Cache busting
      });
    });

  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload profile photo'
    });
  }
});

// Remove profile photo
router.delete('/profile-photo', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    await UserService.removeProfilePhoto(userEmail);

    res.json({
      success: true,
      message: 'Profile photo removed successfully'
    });

  } catch (error) {
    console.error('Remove profile photo error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove profile photo'
    });
  }
});

// Reset all user data
router.post('/reset-data', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    await UserService.resetUserData(userEmail);

    res.json({
      success: true,
      message: 'All data has been reset successfully'
    });

  } catch (error) {
    console.error('Reset data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset data'
    });
  }
});

// Delete account
router.delete('/account', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required to delete account'
      });
    }

    // Verify password before deletion
    const user = await UserService.authenticateUser(userEmail, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    await UserService.deleteAccount(userEmail);

    // Clear session
    req.session.user = null;

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete account'
    });
  }
});

module.exports = router;