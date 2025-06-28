#!/usr/bin/env node

/**
 * Vercel Deployment Readiness Check
 * Comprehensive test to verify if the app is ready for Vercel deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 VERCEL DEPLOYMENT READINESS CHECK\n');

let issues = [];
let warnings = [];
let passed = 0;
let total = 0;

function test(name, condition, errorMsg, warningMsg = null) {
  total++;
  console.log(`${total}. ${name}`);
  
  if (condition) {
    console.log('   ✅ PASSED\n');
    passed++;
  } else {
    if (warningMsg) {
      console.log(`   ⚠️  WARNING: ${warningMsg}\n`);
      warnings.push(`${name}: ${warningMsg}`);
    } else {
      console.log(`   ❌ FAILED: ${errorMsg}\n`);
      issues.push(`${name}: ${errorMsg}`);
    }
  }
}

// Test 1: Check if vercel.json exists and is valid
test(
  'Vercel Configuration File',
  fs.existsSync('./vercel.json'),
  'vercel.json file is missing'
);

// Test 2: Check if api/index.js exists
test(
  'Serverless Function Entry Point',
  fs.existsSync('./api/index.js'),
  'api/index.js file is missing - required for Vercel serverless functions'
);

// Test 3: Check if main app.js exists
test(
  'Main Application File',
  fs.existsSync('./app.js'),
  'app.js file is missing'
);

// Test 4: Check package.json
test(
  'Package.json Configuration',
  fs.existsSync('./package.json'),
  'package.json file is missing'
);

// Test 5: Check if required dependencies are installed
if (fs.existsSync('./package.json')) {
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const requiredDeps = ['express', 'mongoose', 'express-session', 'dotenv', 'ejs'];
  const missingDeps = requiredDeps.filter(dep => !pkg.dependencies[dep]);
  
  test(
    'Required Dependencies',
    missingDeps.length === 0,
    `Missing dependencies: ${missingDeps.join(', ')}`
  );
}

// Test 6: Check if node_modules exists
test(
  'Dependencies Installed',
  fs.existsSync('./node_modules'),
  'node_modules folder missing - run npm install',
  'Make sure to run npm install before deploying'
);

// Test 7: Check environment variables template
test(
  'Environment Variables Template',
  fs.existsSync('./.env') || fs.existsSync('./.env.example'),
  'No .env or .env.example file found'
);

// Test 8: Check if views directory exists
test(
  'Views Directory',
  fs.existsSync('./views'),
  'views directory is missing'
);

// Test 9: Check if models directory exists
test(
  'Models Directory',
  fs.existsSync('./models'),
  'models directory is missing'
);

// Test 10: Check if services directory exists
test(
  'Services Directory',
  fs.existsSync('./services'),
  'services directory is missing'
);

// Test 11: Check specific chat files
test(
  'Chat Service File',
  fs.existsSync('./services/chatService.js'),
  'chatService.js is missing'
);

test(
  'Message Model',
  fs.existsSync('./models/Message.js'),
  'Message.js model is missing'
);

test(
  'User Model',
  fs.existsSync('./models/User.js'),
  'User.js model is missing'
);

// Test 12: Check chat view
test(
  'Chat View Template',
  fs.existsSync('./views/chat-simple.ejs') || fs.existsSync('./views/chat.ejs'),
  'Chat view template is missing'
);

// Test 13: Syntax check for main files
try {
  require('./app.js');
  test(
    'App.js Syntax Check',
    true,
    'app.js has syntax errors'
  );
} catch (error) {
  test(
    'App.js Syntax Check',
    false,
    `app.js has syntax errors: ${error.message}`
  );
}

try {
  require('./api/index.js');
  test(
    'API Entry Point Syntax Check',
    true,
    'api/index.js has syntax errors'
  );
} catch (error) {
  test(
    'API Entry Point Syntax Check',
    false,
    `api/index.js has syntax errors: ${error.message}`
  );
}

// Test 14: Check vercel.json configuration
if (fs.existsSync('./vercel.json')) {
  try {
    const vercelConfig = JSON.parse(fs.readFileSync('./vercel.json', 'utf8'));
    
    test(
      'Vercel Config - Build Source',
      vercelConfig.builds && vercelConfig.builds[0] && vercelConfig.builds[0].src === 'api/index.js',
      'vercel.json should point to api/index.js as build source'
    );
    
    test(
      'Vercel Config - Routes',
      vercelConfig.routes && vercelConfig.routes.length > 0,
      'vercel.json should have route configurations'
    );
    
    test(
      'Vercel Config - API Routes',
      vercelConfig.routes && vercelConfig.routes.some(route => route.src.includes('/api/')),
      'vercel.json should include API route configurations'
    );
    
  } catch (error) {
    test(
      'Vercel Config Validation',
      false,
      `vercel.json has invalid JSON: ${error.message}`
    );
  }
}

// Test 15: Check for common Vercel issues
const appContent = fs.existsSync('./app.js') ? fs.readFileSync('./app.js', 'utf8') : '';

test(
  'No app.listen() in Production',
  !appContent.includes('app.listen(') || appContent.includes('if (!process.env.VERCEL)'),
  'app.listen() should be conditional for Vercel deployment',
  'Make sure app.listen() is wrapped in if (!process.env.VERCEL) check'
);

test(
  'Module Export Present',
  appContent.includes('module.exports = app'),
  'app.js should export the Express app with module.exports = app'
);

// Summary
console.log('=' * 60);
console.log('📊 DEPLOYMENT READINESS SUMMARY');
console.log('=' * 60);
console.log(`✅ Tests Passed: ${passed}/${total}`);
console.log(`❌ Issues Found: ${issues.length}`);
console.log(`⚠️  Warnings: ${warnings.length}\n`);

if (issues.length > 0) {
  console.log('🚨 CRITICAL ISSUES (Must fix before deployment):');
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS (Recommended to fix):');
  warnings.forEach((warning, index) => {
    console.log(`${index + 1}. ${warning}`);
  });
  console.log('');
}

// Final verdict
if (issues.length === 0) {
  console.log('🎉 VERDICT: Your app is READY for Vercel deployment!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Push your code to GitHub');
  console.log('2. Connect your GitHub repo to Vercel');
  console.log('3. Set environment variables in Vercel dashboard:');
  console.log('   - MONGODB_URI');
  console.log('   - SESSION_SECRET');
  console.log('   - EMAIL_USER');
  console.log('   - EMAIL_PASS');
  console.log('   - GEMINI_API_KEY');
  console.log('   - YOUTUBE_API_KEY');
  console.log('4. Deploy and test!');
  
  if (warnings.length > 0) {
    console.log('\n💡 Consider addressing the warnings above for optimal performance.');
  }
} else {
  console.log('❌ VERDICT: Your app has issues that need to be fixed before deployment.');
  console.log('Please address the critical issues listed above.');
}

console.log('\n🔗 Helpful links:');
console.log('- Vercel Node.js Guide: https://vercel.com/docs/functions/serverless-functions/runtimes/node-js');
console.log('- Express on Vercel: https://vercel.com/guides/using-express-with-vercel');