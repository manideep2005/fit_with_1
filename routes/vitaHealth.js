const express = require('express');
const router = express.Router();
const DualUserService = require('../services/dualUserService');
const { ensureHealthAuth } = require('../middleware/healthAuth');

// Apply health authentication to all routes
router.use(ensureHealthAuth);

// VitaHealth specific routes

// Health Dashboard
router.get('/dashboard', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/vitahealth/dashboard',
    service: 'health',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('health-dashboard', {
    user: req.session.user,
    currentPath: '/vitahealth/dashboard',
    navToken: navToken,
    currentPage: 'health-dashboard',
    service: 'health'
  });
});

// Medical Records
router.get('/medical-records', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/vitahealth/medical-records',
    service: 'health',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('medical-records', {
    user: req.session.user,
    currentPath: '/vitahealth/medical-records',
    navToken: navToken,
    currentPage: 'medical-records',
    service: 'health'
  });
});

// Appointments
router.get('/appointments', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/vitahealth/appointments',
    service: 'health',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('appointments', {
    user: req.session.user,
    currentPath: '/vitahealth/appointments',
    navToken: navToken,
    currentPage: 'appointments',
    service: 'health'
  });
});

// Health AI Assistant
router.get('/ai-assistant', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/vitahealth/ai-assistant',
    service: 'health',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('health-ai-assistant', {
    user: req.session.user,
    currentPath: '/vitahealth/ai-assistant',
    navToken: navToken,
    currentPage: 'health-ai-assistant',
    service: 'health'
  });
});

// Fitness Integration (for health users accessing fitness features)
router.get('/fitness', (req, res) => {
  const navToken = Buffer.from(JSON.stringify({
    email: req.session.user.email || 'unknown',
    fullName: req.session.user.fullName || 'User',
    firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session',
    route: '/vitahealth/fitness',
    service: 'health',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('fitness-integration', {
    user: req.session.user,
    currentPath: '/vitahealth/fitness',
    navToken: navToken,
    currentPage: 'fitness-integration',
    service: 'health'
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
    route: '/vitahealth/settings',
    service: 'health',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('settings', {
    user: req.session.user,
    currentPath: '/vitahealth/settings',
    navToken: navToken,
    currentPage: 'settings',
    service: 'health'
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
    route: '/vitahealth/subscription',
    service: 'health',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('subscription', {
    user: req.session.user,
    currentPath: '/vitahealth/subscription',
    navToken: navToken,
    currentPage: 'subscription',
    service: 'health'
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
    route: '/vitahealth/chat',
    service: 'health',
    onboardingData: req.session.user.onboardingData || null
  })).toString('base64');

  res.render('chat', {
    user: req.session.user,
    currentPath: '/vitahealth/chat',
    navToken: navToken,
    currentPage: 'chat',
    service: 'health'
  });
});

// Payment success route
router.get('/payment-success', (req, res) => {
  res.render('payment-success');
});

// API Routes are now handled by separate API files

module.exports = router;