// Debug endpoint to check environment and database connection
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const debug = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      environmentVariables: {
        MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set',
        SESSION_SECRET: process.env.SESSION_SECRET ? 'Set' : 'Not set',
        EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set',
        EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Not set',
        NODE_ENV: process.env.NODE_ENV || 'Not set'
      }
    };

    // Try to test database connection
    try {
      const database = require('../config/database');
      const healthCheck = await database.healthCheck();
      debug.database = healthCheck;
    } catch (dbError) {
      debug.database = {
        error: dbError.message,
        healthy: false
      };
    }

    // Try to test email service
    try {
      const { testEmailConnection } = require('../services/emailService');
      const emailTest = await testEmailConnection();
      debug.email = emailTest;
    } catch (emailError) {
      debug.email = {
        error: emailError.message,
        working: false
      };
    }

    res.status(200).json(debug);
  } catch (error) {
    res.status(500).json({
      error: 'Debug endpoint failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};