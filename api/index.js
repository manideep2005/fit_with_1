// Vercel serverless function entry point
const path = require('path');

// Set the correct working directory for Vercel
process.chdir(path.join(__dirname, '..'));

let app;

try {
  console.log('Loading Express app...');
  console.log('Current working directory:', process.cwd());
  console.log('__dirname:', __dirname);
  
  // Load the Express app
  app = require('../app.js');
  console.log('Express app loaded successfully');
} catch (error) {
  console.error('Error loading app:', error);
  console.error('Stack trace:', error.stack);
  
  // Fallback handler for when app fails to load
  module.exports = (req, res) => {
    console.error('Fallback handler called due to app load failure');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to initialize application',
      details: process.env.NODE_ENV === 'development' ? error.message : error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  };
  return;
}

// Ensure app is properly exported
if (!app) {
  console.error('App is null or undefined after loading');
  module.exports = (req, res) => {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Application failed to initialize properly',
      timestamp: new Date().toISOString()
    });
  };
} else {
  console.log('Exporting Express app for Vercel');
  // Export the Express app for Vercel
  module.exports = app;
}