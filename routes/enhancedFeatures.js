/**
 * Enhanced Features API Routes
 * Routes for the 6 key enhanced features
 */

const express = require('express');
const router = express.Router();

// Import services
const aiFormCheckerService = require('../services/aiFormCheckerService');
const smartNotificationService = require('../services/smartNotificationService');
const socialChallengesService = require('../services/socialChallengesService');
const progressPredictionService = require('../services/progressPredictionService');
const voiceCommandsService = require('../services/voiceCommandsService');
const buddyFinderService = require('../services/buddyFinderService');

// ============================================================================
// 1. AI FORM CHECKER API ROUTES
// ============================================================================

// Initialize AI form checker
router.post('/form-checker/initialize', async (req, res) => {
  try {
    const result = await aiFormCheckerService.initializeVisionAPI();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start form analysis session
router.post('/form-checker/start', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { exerciseType, cameraStream } = req.body;
    
    const result = await aiFormCheckerService.startFormAnalysis(userId, exerciseType, cameraStream);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analyze frame for form correction
router.post('/form-checker/analyze', async (req, res) => {
  try {
    const { sessionId, frameData } = req.body;
    
    const result = await aiFormCheckerService.analyzeFrame(sessionId, frameData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// End form analysis session
router.post('/form-checker/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const result = await aiFormCheckerService.endFormAnalysis(sessionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get form checker status
router.get('/form-checker/status', (req, res) => {
  const status = aiFormCheckerService.getStatus();
  res.json({ success: true, status });
});

// ============================================================================
// 2. SMART NOTIFICATIONS API ROUTES
// ============================================================================

// Register user for smart notifications
router.post('/smart-notifications/register', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const preferences = req.body;
    
    const result = await smartNotificationService.registerUser(userId, preferences);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send personalized notification
router.post('/smart-notifications/send', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { type, data } = req.body;
    
    const result = await smartNotificationService.sendPersonalizedNotification(userId, type, data);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update notification preferences
router.put('/smart-notifications/preferences', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const preferences = req.body;
    
    const result = await smartNotificationService.updateUserPreferences(userId, preferences);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get notification history
router.get('/smart-notifications/history', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { limit } = req.query;
    
    const history = await smartNotificationService.getNotificationHistory(userId, parseInt(limit));
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark notification as opened
router.post('/smart-notifications/opened', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { notificationId } = req.body;
    
    await smartNotificationService.markNotificationOpened(userId, notificationId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 3. SOCIAL CHALLENGES API ROUTES
// ============================================================================

// Create a new challenge
router.post('/social-challenges/create', async (req, res) => {
  try {
    const creatorId = req.session.user._id;
    const challengeData = req.body;
    
    const result = await socialChallengesService.createChallenge(creatorId, challengeData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Join a challenge
router.post('/social-challenges/:challengeId/join', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { challengeId } = req.params;
    const { teamId } = req.body;
    
    const result = await socialChallengesService.joinChallenge(challengeId, userId, teamId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update challenge progress
router.post('/social-challenges/:challengeId/progress', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { challengeId } = req.params;
    const metrics = req.body;
    
    const result = await socialChallengesService.updateProgress(challengeId, userId, metrics);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get active challenges
router.get('/social-challenges/active', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const filters = req.query;
    
    const result = await socialChallengesService.getActiveChallenges(userId, filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get challenge leaderboard
router.get('/social-challenges/:challengeId/leaderboard', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { limit } = req.query;
    
    const result = await socialChallengesService.getChallengeLeaderboard(challengeId, parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 4. PROGRESS PREDICTIONS API ROUTES
// ============================================================================

// Get weight loss prediction
router.post('/predictions/weight-loss', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { userProfile, goalData } = req.body;
    
    const result = await progressPredictionService.predictWeightLoss(userId, userProfile, goalData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get workout performance prediction
router.post('/predictions/performance', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { userProfile, workoutHistory } = req.body;
    
    const result = await progressPredictionService.predictWorkoutPerformance(userId, userProfile, workoutHistory);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get comprehensive predictions
router.post('/predictions/comprehensive', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { userProfile, fitnessData } = req.body;
    
    const result = await progressPredictionService.getComprehensivePredictions(userId, userProfile, fitnessData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 5. VOICE COMMANDS API ROUTES
// ============================================================================

// Start voice session
router.post('/voice/start', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { workoutType } = req.body;
    
    const result = await voiceCommandsService.startVoiceSession(userId, workoutType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process voice command
router.post('/voice/command', async (req, res) => {
  try {
    const { audioData, sessionId } = req.body;
    
    const result = await voiceCommandsService.processVoiceCommand(audioData, sessionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// End voice session
router.post('/voice/end', async (req, res) => {
  try {
    const result = await voiceCommandsService.endVoiceSession();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get voice commands status
router.get('/voice/status', (req, res) => {
  const status = voiceCommandsService.getStatus();
  res.json({ success: true, status });
});

// ============================================================================
// 6. BUDDY FINDER API ROUTES
// ============================================================================

// Create buddy profile
router.post('/buddy-finder/profile', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const profileData = req.body;
    
    const result = await buddyFinderService.createBuddyProfile(userId, profileData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Find workout buddies
router.post('/buddy-finder/search', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const searchCriteria = req.body;
    
    const result = await buddyFinderService.findBuddies(userId, searchCriteria);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Find nearby buddies
router.post('/buddy-finder/nearby', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { coordinates, radius } = req.body;
    
    const result = await buddyFinderService.findNearbyBuddies(userId, coordinates, radius);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send meetup request
router.post('/buddy-finder/meetup/request', async (req, res) => {
  try {
    const fromUserId = req.session.user._id;
    const { toUserId, requestData } = req.body;
    
    const result = await buddyFinderService.sendMeetupRequest(fromUserId, toUserId, requestData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user matches
router.get('/buddy-finder/matches', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { limit } = req.query;
    
    const result = await buddyFinderService.getUserMatches(userId, parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;