// Vercel serverless function entry point
const path = require('path');

// Set the correct working directory for Vercel
process.chdir(path.join(__dirname, '..'));

let app;

// Export a function that handles the request
module.exports = async (req, res) => {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
        // Log some routes for debugging
        const routes = [];
        app._router.stack.forEach(layer => {
          if (layer.route) {
            const methods = Object.keys(layer.route.methods);
            routes.push(`${methods.join(',').toUpperCase()} ${layer.route.path}`);
          }
        });
        console.log('Sample routes:', routes.slice(0, 10));
      }
    } catch (error) {
      console.error('Error loading app:', error);
      console.error('Stack trace:', error.stack);
      
      const errorResponse = {
        error: 'Internal Server Error',
        message: 'Failed to initialize application',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        url: req.url,
        method: req.method
      };
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).send(JSON.stringify(errorResponse));
    }
  }

  // Handle the request with the Express app
  if (app && typeof app === 'function') {
    console.log('Handling request with Express app:', req.method, req.url);
    
    // Ensure proper error handling
    try {
      return app(req, res);
    } catch (error) {
      console.error('Error handling request:', error);
      const errorResponse = {
        error: 'Request handling failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        url: req.url,
        method: req.method
      };
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).send(JSON.stringify(errorResponse));
    }
  } else {
    console.error('App is not a function:', typeof app);
    const errorResponse = {
      error: 'Internal Server Error',
      message: 'Application is not properly initialized',
      appType: typeof app,
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method
    };
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).send(JSON.stringify(errorResponse));
  }
};