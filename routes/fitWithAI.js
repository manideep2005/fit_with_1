const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const { ensureFitnessAuth } = require('../middleware/fitnessAuth');
const { generateNavId, storeNavData, createNavUrl } = require('../utils/slugify');

// Apply fitness authentication to all routes
router.use(ensureFitnessAuth);

// Fit With AI specific routes

// Fitness Dashboard
router.get('/dashboard', (req, res) => {
  const navId = generateNavId(req.session.user.email, '/dashboard');
  
  // Store navigation data with short ID
  storeNavData(navId, {
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    sessionId: req.sessionID || 'no-session',
    route: '/dashboard',
    onboardingData: req.session.user.onboardingData || null
  });

  res.render('dashboard', {
    user: req.session.user,
    currentPath: '/dashboard',
    navId: navId, // Short navigation ID instead of long token
    currentPage: 'dashboard'
  });
});

// Workouts
router.get('/workouts', (req, res) => {
  const navId = generateNavId(req.session.user.email, '/fitness/workouts');
  
  storeNavData(navId, {
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/workouts',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  });

  res.render('workouts', {
    user: req.session.user,
    currentPath: '/fitness/workouts',
    navId: navId,
    currentPage: 'workouts',
    service: 'fitness'
  });
});

// Progress Tracking
router.get('/progress', (req, res) => {
  const navId = generateNavId(req.session.user.email, '/fitness/progress');
  
  storeNavData(navId, {
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/progress',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  });

  res.render('progress', {
    user: req.session.user,
    currentPath: '/fitness/progress',
    navId: navId,
    currentPage: 'progress',
    service: 'fitness'
  });
});

// Meal Planner
router.get('/meal-planner', (req, res) => {
  const navId = generateNavId(req.session.user.email, '/fitness/meal-planner');
  
  storeNavData(navId, {
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/meal-planner',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  });

  res.render('meal-planner', {
    user: req.session.user,
    currentPath: '/fitness/meal-planner',
    navId: navId,
    currentPage: 'meal-planner',
    service: 'fitness'
  });
});

// Nutrition Tracking
router.get('/nutrition', (req, res) => {
  const navId = generateNavId(req.session.user.email, '/fitness/nutrition');
  
  storeNavData(navId, {
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/nutrition',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  });

  res.render('nutrition', {
    user: req.session.user,
    currentPath: '/fitness/nutrition',
    navId: navId,
    currentPage: 'nutrition',
    service: 'fitness'
  });
});

// NutriScan
router.get('/nutriscan', (req, res) => {
  const navId = generateNavId(req.session.user.email, '/fitness/nutriscan');
  
  storeNavData(navId, {
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/nutriscan',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  });

  res.render('nutriscan', {
    user: req.session.user,
    currentPath: '/fitness/nutriscan',
    navId: navId,
    currentPage: 'nutriscan',
    service: 'fitness'
  });
});

// Challenges
router.get('/challenges', (req, res) => {
  const navId = generateNavId(req.session.user.email, '/fitness/challenges');
  
  storeNavData(navId, {
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/challenges',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  });

  res.render('challenges', {
    user: req.session.user,
    currentPath: '/fitness/challenges',
    navId: navId,
    currentPage: 'challenges',
    service: 'fitness'
  });
});

// Biometrics
router.get('/biometrics', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/biometrics',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('biometrics', {
    user: req.session.user,
    currentPath: '/fitness/biometrics',
    navToken: navToken,
    currentPage: 'biometrics',
    service: 'fitness'
  });
});

// Schedule
router.get('/schedule', (req, res) => {
  const navId = generateNavId(req.session.user.email, '/fitness/schedule');
  
  storeNavData(navId, {
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/schedule',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  });

  res.render('schedule', {
    user: req.session.user,
    currentPath: '/fitness/schedule',
    navId: navId,
    currentPage: 'schedule',
    service: 'fitness'
  });
});

// Community
router.get('/community', (req, res) => {
  const navId = generateNavId(req.session.user.email, '/fitness/community');
  
  storeNavData(navId, {
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/community',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  });

  res.render('community', {
    user: req.session.user,
    currentPath: '/fitness/community',
    navId: navId,
    currentPage: 'community',
    service: 'fitness'
  });
});

// AI Coach
router.get('/ai-coach', (req, res) => {
  const navId = generateNavId(req.session.user.email, '/fitness/ai-coach');
  
  storeNavData(navId, {
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/ai-coach',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  });

  res.render('ai-coach', {
    user: req.session.user,
    currentPath: '/fitness/ai-coach',
    navId: navId,
    currentPage: 'ai-coach',
    service: 'fitness'
  });
});

// Chat
router.get('/chat', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/chat',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('chat', {
    user: req.session.user,
    currentPath: '/fitness/chat',
    navToken: navToken,
    currentPage: 'chat',
    service: 'fitness'
  });
});

// Settings
router.get('/settings', (req, res) => {
  const navId = generateNavId(req.session.user.email, '/fitness/settings');
  
  storeNavData(navId, {
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/settings',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  });

  res.render('settings', {
    user: req.session.user,
    currentPath: '/fitness/settings',
    navId: navId,
    currentPage: 'settings',
    service: 'fitness'
  });
});

// Subscription
router.get('/subscription', (req, res) => {
  const navId = generateNavId(req.session.user.email, '/fitness/subscription');
  
  storeNavData(navId, {
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/subscription',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  });

  res.render('subscription', {
    user: req.session.user,
    currentPath: '/fitness/subscription',
    navId: navId,
    currentPage: 'subscription',
    service: 'fitness'
  });
});

// Health route (for fitness users accessing health features)
router.get('/health', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/health',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('health', {
    user: req.session.user,
    currentPath: '/fitness/health',
    navToken: navToken,
    currentPage: 'health',
    service: 'fitness'
  });
});

// Payment success route
router.get('/payment-success', (req, res) => {
  res.render('payment-success');
});

// Virtual Doctor
router.get('/virtual-doctor', (req, res) => {
  const navId = generateNavId(req.session.user.email, '/fitness/virtual-doctor');
  
  storeNavData(navId, {
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/virtual-doctor',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  });

  res.render('virtual-doctor', {
    user: req.session.user,
    currentPath: '/fitness/virtual-doctor',
    navId: navId,
    currentPage: 'virtual-doctor',
    service: 'fitness'
  });
});

// Virtual Doctor API - Test endpoint
router.get('/api/virtual-doctor-test', (req, res) => {
  res.json({
    success: true,
    message: 'Virtual doctor API is working',
    timestamp: new Date().toISOString()
  });
});

// Virtual Doctor API - AI Symptom Analysis
router.post('/api/virtual-doctor-analyze', async (req, res) => {
  try {
    console.log('Virtual doctor API called with:', req.body);
    const virtualDoctorAnalyze = require('../api/virtual-doctor-analyze');
    await virtualDoctorAnalyze(req, res);
  } catch (error) {
    console.error('Virtual doctor API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request: ' + error.message
    });
  }
});

// API Routes are now handled by separate API files

module.exports = router;