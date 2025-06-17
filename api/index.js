// Vercel serverless function entry point
const express = require('express');

// Create a simple health check first to test deployment
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    vercel: !!process.env.VERCEL,
    message: 'Fit-With-AI API is running'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.status(200).json({
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Try to load the serverless-optimized app first
let mainApp;
try {
  mainApp = require('./serverless-app.js');
  console.log('Serverless app loaded successfully');
} catch (error) {
  console.error('Error loading serverless app:', error);
  
  // Try to load the full app as fallback
  try {
    mainApp = require('../app.js');
    console.log('Full app loaded as fallback');
  } catch (fullAppError) {
    console.error('Error loading full app:', fullAppError);
    
    // Final fallback routes
    app.get('*', (req, res) => {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to initialize any application version',
        details: process.env.NODE_ENV === 'development' ? {
          serverlessError: error.message,
          fullAppError: fullAppError.message
        } : 'Application initialization failed',
        path: req.path
      });
    });
    
    module.exports = app;
    return;
  }
}

// If an app loaded successfully, use it for all other routes
app.use('/', mainApp);

// Export the Express app for Vercel
module.exports = app;