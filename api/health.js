// Simple health check endpoint for Vercel
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    nodeVersion: process.version,
    workingDirectory: process.cwd(),
    message: 'Health check endpoint working'
  });
};