// Vercel serverless function entry point
const path = require('path');

// Set the correct working directory for Vercel
process.chdir(path.join(__dirname, '..'));

let app;

// Export a function that handles the request
module.exports = (req, res) => {
  // Initialize app on first request if not already done
  if (!app) {
    try {
      console.log('Loading Express app...');
      console.log('Current working directory:', process.cwd());
      console.log('__dirname:', __dirname);
      console.log('Request URL:', req.url);
      console.log('Request method:', req.method);
      
      // Load the Express app
      app = require('../app.js');
      console.log('Express app loaded successfully');
      console.log('App type:', typeof app);
      console.log('App has handle method:', typeof app.handle === 'function');
      
      if (app._router && app._router.stack) {
        console.log('Routes registered:', app._router.stack.length);
      }
    } catch (error) {
      console.error('Error loading app:', error);
      console.error('Stack trace:', error.stack);
      
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to initialize application',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        url: req.url,
        method: req.method
      });
    }
  }

  // Handle the request with the Express app
  if (app && typeof app === 'function') {
    console.log('Handling request with Express app:', req.method, req.url);
    return app(req, res);
  } else {
    console.error('App is not a function:', typeof app);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Application is not properly initialized',
      appType: typeof app,
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method
    });
  }
};