/**
 * Navigation Middleware
 * Handles navigation ID validation and data retrieval
 */

const { getNavData } = require('../utils/slugify');

// Middleware to validate and retrieve navigation data
function validateNavigation(req, res, next) {
  const navId = req.query.nav || req.body.nav;
  
  if (navId) {
    const navData = getNavData(navId);
    
    if (navData) {
      // Attach navigation data to request
      req.navData = navData;
      console.log(`✅ Navigation validated for ID: ${navId}`);
    } else {
      console.log(`❌ Invalid or expired navigation ID: ${navId}`);
      // Don't fail the request, just log the issue
    }
  }
  
  next();
}

// Middleware to create navigation links in templates
function addNavHelpers(req, res, next) {
  // Add helper function to response locals for templates
  res.locals.createNavUrl = function(route, params = {}) {
    const { createNavUrl } = require('../utils/slugify');
    const userEmail = req.session?.user?.email || 'anonymous';
    return createNavUrl(route, userEmail, params);
  };
  
  // Add helper to generate clean URLs
  res.locals.cleanUrl = function(route, userInfo = {}) {
    const { generateFriendlyRoute } = require('../utils/slugify');
    return generateFriendlyRoute(route, userInfo);
  };
  
  next();
}

module.exports = {
  validateNavigation,
  addNavHelpers
};