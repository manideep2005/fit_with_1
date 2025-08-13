const express = require('express');
const router = express.Router();
const streakService = require('../services/streakService');
const { updateLoginStreak } = require('../middleware/streakMiddleware');

// Apply login streak middleware to all routes
router.use(updateLoginStreak);

// Get user's streak status
router.get('/status', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const streakStatus = await streakService.getStreakStatus(req.user._id);
    res.json({
      success: true,
      streaks: streakStatus
    });
  } catch (error) {
    console.error('Get streak status error:', error);
    res.status(500).json({ 
      error: 'Failed to get streak status',
      details: error.message 
    });
  }
});

// Get streak leaderboard
router.get('/leaderboard/:type?', async (req, res) => {
  try {
    const streakType = req.params.type || 'workout';
    const limit = parseInt(req.query.limit) || 10;
    
    if (!['workout', 'nutrition', 'login'].includes(streakType)) {
      return res.status(400).json({ error: 'Invalid streak type' });
    }

    const leaderboard = await streakService.getStreakLeaderboard(streakType, limit);
    res.json({
      success: true,
      leaderboard,
      type: streakType
    });
  } catch (error) {
    console.error('Get streak leaderboard error:', error);
    res.status(500).json({ 
      error: 'Failed to get streak leaderboard',
      details: error.message 
    });
  }
});

// Force update user streaks (for testing/admin)
router.post('/update', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const streaks = await streakService.updateUserStreaks(req.session.user._id);
    res.json({
      success: true,
      message: 'Streaks updated successfully',
      streaks
    });
  } catch (error) {
    console.error('Update streaks error:', error);
    res.json({ 
      success: false,
      error: 'Failed to update streaks'
    });
  }
});

// Get streak rewards for user
router.get('/rewards', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    
    const streakRewards = user.gamification?.rewards?.filter(r => r.type === 'streak') || [];
    
    res.json({
      success: true,
      rewards: streakRewards
    });
  } catch (error) {
    console.error('Get streak rewards error:', error);
    res.status(500).json({ 
      error: 'Failed to get streak rewards',
      details: error.message 
    });
  }
});

module.exports = router;