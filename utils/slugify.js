/**
 * URL Slugification Utility
 * Creates clean, SEO-friendly URLs and manages secure navigation tokens
 */

const crypto = require('crypto');

// Simple slugify function
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

// Generate short navigation ID
function generateNavId(userEmail, route) {
  const hash = crypto.createHash('md5')
    .update(`${userEmail}-${route}-${Date.now()}`)
    .digest('hex');
  return hash.substring(0, 8); // 8 character ID
}

// Create clean navigation URL
function createNavUrl(route, userEmail, additionalParams = {}) {
  const navId = generateNavId(userEmail, route);
  const baseUrl = route;
  
  // Add nav ID as query parameter
  const params = new URLSearchParams({
    nav: navId,
    ...additionalParams
  });
  
  return `${baseUrl}?${params.toString()}`;
}

// Store navigation data temporarily (in production, use Redis or database)
const navStore = new Map();

// Store navigation data
function storeNavData(navId, data) {
  navStore.set(navId, {
    ...data,
    timestamp: Date.now(),
    expires: Date.now() + (5 * 60 * 1000) // 5 minutes
  });
  
  // Clean expired entries
  cleanExpiredNavData();
}

// Retrieve navigation data
function getNavData(navId) {
  const data = navStore.get(navId);
  
  if (!data) return null;
  
  // Check if expired
  if (Date.now() > data.expires) {
    navStore.delete(navId);
    return null;
  }
  
  return data;
}

// Clean expired navigation data
function cleanExpiredNavData() {
  const now = Date.now();
  for (const [key, value] of navStore.entries()) {
    if (now > value.expires) {
      navStore.delete(key);
    }
  }
}

// Generate user-friendly route names
function generateFriendlyRoute(route, userInfo) {
  const routeMap = {
    '/dashboard': 'dashboard',
    '/workouts': 'workouts',
    '/progress': 'progress',
    '/meal-planner': 'meal-planner',
    '/nutrition': 'nutrition',
    '/nutriscan': 'nutriscan',
    '/challenges': 'challenges',
    '/schedule': 'schedule',
    '/community': 'community',
    '/ai-coach': 'ai-coach',
    '/chat': 'chat',
    '/settings': 'settings',
    '/subscription': 'subscription',
    '/gamification': 'gamification',
    '/virtual-doctor': 'virtual-doctor'
  };
  
  const friendlyRoute = routeMap[route] || route.replace('/', '');
  const userSlug = userInfo.firstName ? slugify(userInfo.firstName) : 'user';
  
  return `${userSlug}/${friendlyRoute}`;
}

module.exports = {
  slugify,
  generateNavId,
  createNavUrl,
  storeNavData,
  getNavData,
  cleanExpiredNavData,
  generateFriendlyRoute
};