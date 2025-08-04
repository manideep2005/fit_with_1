const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const { ensureFitnessAuth } = require('../middleware/fitnessAuth');

// Apply fitness authentication to all routes
router.use(ensureFitnessAuth);

// Fit With AI specific routes

// Fitness Dashboard
router.get('/dashboard', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/dashboard',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('dashboard', {
    user: req.session.user,
    currentPath: '/dashboard',
    navToken: navToken,
    currentPage: 'dashboard'
  });
});

// Workouts
router.get('/workouts', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/workouts',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('workouts', {
    user: req.session.user,
    currentPath: '/fitness/workouts',
    navToken: navToken,
    currentPage: 'workouts',
    service: 'fitness'
  });
});

// Progress Tracking
router.get('/progress', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/progress',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('progress', {
    user: req.session.user,
    currentPath: '/fitness/progress',
    navToken: navToken,
    currentPage: 'progress',
    service: 'fitness'
  });
});

// Meal Planner
router.get('/meal-planner', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/meal-planner',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('meal-planner', {
    user: req.session.user,
    currentPath: '/fitness/meal-planner',
    navToken: navToken,
    currentPage: 'meal-planner',
    service: 'fitness'
  });
});

// Nutrition Tracking
router.get('/nutrition', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/nutrition',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('nutrition', {
    user: req.session.user,
    currentPath: '/fitness/nutrition',
    navToken: navToken,
    currentPage: 'nutrition',
    service: 'fitness'
  });
});

// NutriScan
router.get('/nutriscan', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/nutriscan',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('nutriscan', {
    user: req.session.user,
    currentPath: '/fitness/nutriscan',
    navToken: navToken,
    currentPage: 'nutriscan',
    service: 'fitness'
  });
});

// Challenges
router.get('/challenges', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/challenges',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('challenges', {
    user: req.session.user,
    currentPath: '/fitness/challenges',
    navToken: navToken,
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
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/schedule',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('schedule', {
    user: req.session.user,
    currentPath: '/fitness/schedule',
    navToken: navToken,
    currentPage: 'schedule',
    service: 'fitness'
  });
});

// Community
router.get('/community', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/community',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('community', {
    user: req.session.user,
    currentPath: '/fitness/community',
    navToken: navToken,
    currentPage: 'community',
    service: 'fitness'
  });
});

// AI Coach
router.get('/ai-coach', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/ai-coach',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('ai-coach', {
    user: req.session.user,
    currentPath: '/fitness/ai-coach',
    navToken: navToken,
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
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/settings',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('settings', {
    user: req.session.user,
    currentPath: '/fitness/settings',
    navToken: navToken,
    currentPage: 'settings',
    service: 'fitness'
  });
});

// Subscription
router.get('/subscription', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/fitness/subscription',
    service: 'fitness',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('subscription', {
    user: req.session.user,
    currentPath: '/fitness/subscription',
    navToken: navToken,
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

// API Routes are now handled by separate API files

module.exports = router;