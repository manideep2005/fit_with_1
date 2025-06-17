// Serverless-optimized version of the main app
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Basic middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Simple session configuration for serverless
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    },
    name: 'fit-with-ai-session'
}));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    vercel: !!process.env.VERCEL,
    message: 'Fit-With-AI API is running'
  });
});

// Basic routes
app.get('/', (req, res) => {
  try {
    res.render('index');
  } catch (error) {
    console.error('Error rendering index:', error);
    res.status(500).json({
      error: 'Failed to render homepage',
      message: error.message
    });
  }
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const database = require('../config/database');
    const healthCheck = await database.healthCheck();
    res.json({
      database: healthCheck,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set',
        VERCEL: !!process.env.VERCEL
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database test failed',
      message: error.message
    });
  }
});

// Test email service
app.get('/api/test-email', async (req, res) => {
  try {
    const { testEmailConnection } = require('../services/emailService');
    const result = await testEmailConnection();
    res.json({
      email: result,
      environment: {
        EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set',
        EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Not set'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Email test failed',
      message: error.message
    });
  }
});

// Basic signup route (simplified)
app.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!email || !fullName || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    // For now, just return success without database operations
    res.json({
      success: true,
      message: 'Signup endpoint working',
      data: { email, fullName }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Basic login route (simplified)
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }
    
    // For now, just return success without database operations
    res.json({ 
      success: true,
      message: 'Login endpoint working',
      data: { email }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    message: 'The requested resource was not found'
  });
});

module.exports = app;