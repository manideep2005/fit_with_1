// Vercel serverless function for admin panel
const adminApp = require('../admin-ultimate');

module.exports = (req, res) => {
  // Add /admin prefix to all routes
  req.url = req.url.replace('/api/admin', '');
  if (req.url === '') req.url = '/';
  
  return adminApp(req, res);
};