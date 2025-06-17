// Database connection test endpoint
module.exports = async (req, res) => {
  try {
    // Set working directory
    const path = require('path');
    process.chdir(path.join(__dirname, '..'));
    
    // Load database module
    const database = require('../config/database');
    
    console.log('Testing database connection...');
    
    // Get current status
    const currentStatus = database.getConnectionStatus();
    console.log('Current status:', currentStatus);
    
    // Try to connect if not connected
    if (currentStatus.status !== 'connected') {
      console.log('Attempting to connect to database...');
      await database.connect();
    }
    
    // Perform health check
    const healthCheck = await database.healthCheck();
    console.log('Health check result:', healthCheck);
    
    res.status(200).json({
      message: 'Database test completed',
      currentStatus: database.getConnectionStatus(),
      healthCheck: healthCheck,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set',
        MONGO_URL: process.env.MONGO_URL ? 'Set' : 'Not set'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      error: 'Database test failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
};