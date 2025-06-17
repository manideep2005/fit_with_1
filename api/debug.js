// Debug endpoint for Vercel deployment
module.exports = (req, res) => {
  // Only allow in development or if specifically enabled
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_DEBUG) {
    return res.status(404).json({ error: 'Not found' });
  }

  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: !!process.env.VERCEL,
    MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set',
    SESSION_SECRET: process.env.SESSION_SECRET ? 'Set' : 'Not set',
    EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set',
    EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Not set'
  };

  res.status(200).json({
    status: 'Debug Info',
    timestamp: new Date().toISOString(),
    environment: envVars,
    request: {
      method: req.method,
      url: req.url,
      headers: Object.keys(req.headers)
    }
  });
};