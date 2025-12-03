// Server entry point for deployment
console.log('🚀 Starting Fit-With-AI server...');
console.log('Environment:', process.env.NODE_ENV || 'production');
console.log('Vercel deployment:', !!process.env.VERCEL);

// Load environment variables
require('dotenv').config();

// Choose the right app version based on environment
let app;

if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  // Use deployment-safe version for production/Vercel
  console.log('📦 Loading deployment-safe app version...');
  app = require('./app-deploy');
} else {
  // Use full-featured version for local development
  console.log('🔧 Loading full-featured app version...');
  try {
    app = require('./app');
  } catch (error) {
    console.log('⚠️ Full app failed to load, falling back to deployment version:', error.message);
    app = require('./app-deploy');
  }
}

// Export for Vercel serverless
module.exports = app;

// Start server locally (not in Vercel)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  
  // For local development, start the server
  if (typeof app.listen === 'function') {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Local URL: http://localhost:${PORT}`);
    });
  } else {
    console.log('⚠️ App is not an Express server instance');
  }
} else {
  console.log('☁️ Running in Vercel serverless mode');
}