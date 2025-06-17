// Vercel serverless function entry point
let app;

try {
  // Load the Express app
  app = require('../app.js');
} catch (error) {
  console.error('Error loading app:', error);
  
  // Fallback handler for when app fails to load
  module.exports = (req, res) => {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to initialize application',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  };
  return;
}

// Export the Express app for Vercel
module.exports = app;