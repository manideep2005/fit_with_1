// Server entry point for deployment
console.log('🚀 Starting Fit-With-AI server...');
console.log('Environment:', process.env.NODE_ENV || 'production');
console.log('Vercel deployment:', !!process.env.VERCEL);

// Load environment variables
require('dotenv').config();

// Always use the full app.js with all features
console.log('🔧 Loading complete app.js with all features...');
const app = require('./app');
console.log('✅ Complete app loaded successfully');

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