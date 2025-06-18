// Simple debug endpoint for Vercel
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  const routes = [];
  
  try {
    // Try to load the main app to check routes
    const path = require('path');
    process.chdir(path.join(__dirname, '..'));
    const app = require('../app.js');
    
    if (app._router && app._router.stack) {
      app._router.stack.forEach(layer => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods);
          routes.push(`${methods.join(',').toUpperCase()} ${layer.route.path}`);
        }
      });
    }
    
    res.status(200).json({
      status: 'Debug endpoint working',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      nodeVersion: process.version,
      workingDirectory: process.cwd(),
      routesCount: routes.length,
      routes: routes.slice(0, 20), // First 20 routes
      appType: typeof app,
      hasRouter: !!app._router
    });
  } catch (error) {
    res.status(500).json({
      error: 'Debug endpoint error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      workingDirectory: process.cwd()
    });
  }
};