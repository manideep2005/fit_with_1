// Simple serverless function for testing
module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Basic routing
  const { url, method } = req;
  
  if (url === '/api/simple' || url === '/api/simple/') {
    res.status(200).json({
      status: 'OK',
      message: 'Simple API is working!',
      timestamp: new Date().toISOString(),
      method: method,
      url: url,
      environment: process.env.NODE_ENV || 'development',
      vercel: !!process.env.VERCEL
    });
    return;
  }
  
  if (url === '/api/health' || url === '/api/health/') {
    res.status(200).json({
      status: 'OK',
      message: 'Health check passed',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      vercel: !!process.env.VERCEL
    });
    return;
  }
  
  // Default response
  res.status(200).json({
    message: 'Fit-With-AI API is running',
    timestamp: new Date().toISOString(),
    path: url,
    method: method,
    available_endpoints: [
      '/api/simple',
      '/api/health'
    ]
  });
};