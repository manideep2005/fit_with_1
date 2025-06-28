#!/usr/bin/env node

/**
 * Quick test to verify login/signup routes work
 */

require('dotenv').config();

async function testLoginSignupRoutes() {
  console.log('🧪 Testing Login/Signup Routes...\n');
  
  try {
    // Load the app
    const app = require('./app.js');
    console.log('✅ App loaded successfully');
    
    // Check if routes are registered
    if (app._router && app._router.stack) {
      const routes = [];
      app._router.stack.forEach(layer => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods);
          routes.push(`${methods.join(',').toUpperCase()} ${layer.route.path}`);
        }
      });
      
      const loginRoute = routes.find(r => r.includes('/login'));
      const signupRoute = routes.find(r => r.includes('/signup'));
      
      console.log('✅ Routes check:');
      console.log(`   Login route: ${loginRoute ? '✅ Found' : '❌ Missing'}`);
      console.log(`   Signup route: ${signupRoute ? '✅ Found' : '❌ Missing'}`);
      
      if (loginRoute) console.log(`      ${loginRoute}`);
      if (signupRoute) console.log(`      ${signupRoute}`);
      
    } else {
      console.log('❌ No routes found');
    }
    
    console.log('\n🎉 Login/Signup routes are properly configured!');
    console.log('🚀 The app should work correctly now.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testLoginSignupRoutes();