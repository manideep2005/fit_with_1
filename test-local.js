#!/usr/bin/env node

/**
 * Local App Loading Test
 * Tests if the app can be loaded without errors
 */

console.log('Testing local app loading...');

try {
  // Set environment to development for testing
  process.env.NODE_ENV = 'development';
  
  console.log('Loading app.js...');
  const app = require('./app.js');
  
  if (app) {
    console.log('✅ App loaded successfully');
    console.log('App type:', typeof app);
    console.log('App has listen method:', typeof app.listen === 'function');
    
    // Test if we can get the routes
    if (app._router && app._router.stack) {
      console.log('✅ Routes are registered');
      console.log('Number of routes:', app._router.stack.length);
      
      // List some routes
      const routes = [];
      app._router.stack.forEach(layer => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods);
          routes.push(`${methods.join(',').toUpperCase()} ${layer.route.path}`);
        }
      });
      
      console.log('Sample routes:');
      routes.slice(0, 10).forEach(route => console.log(`  ${route}`));
      if (routes.length > 10) {
        console.log(`  ... and ${routes.length - 10} more routes`);
      }
    } else {
      console.log('⚠️  No routes found in app._router');
    }
    
    console.log('\n✅ Local app test passed');
    process.exit(0);
  } else {
    console.log('❌ App is null or undefined');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error loading app:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}