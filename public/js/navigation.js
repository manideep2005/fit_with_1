/**
 * Clean Navigation System
 * Handles navigation with short IDs instead of long tokens
 */

class NavigationManager {
  constructor() {
    this.currentNavId = null;
    this.init();
  }

  init() {
    // Get current navigation ID from URL or page data
    const urlParams = new URLSearchParams(window.location.search);
    this.currentNavId = urlParams.get('nav') || window.navId;
    
    // Clean up URL if it has navigation ID
    if (this.currentNavId && window.history && window.history.replaceState) {
      this.cleanUrl();
    }
    
    // Update all navigation links
    this.updateNavigationLinks();
  }

  // Remove navigation ID from URL for cleaner appearance
  cleanUrl() {
    const url = new URL(window.location);
    url.searchParams.delete('nav');
    
    // Only update if URL actually changed
    if (url.toString() !== window.location.toString()) {
      window.history.replaceState({}, document.title, url.toString());
    }
  }

  // Update navigation links to use clean URLs
  updateNavigationLinks() {
    const navLinks = document.querySelectorAll('a[href^="/"]');
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      
      // Skip if already has parameters or is external
      if (href.includes('?') || href.includes('#') || href.startsWith('http')) {
        return;
      }
      
      // Add navigation ID for internal links
      if (this.currentNavId) {
        const separator = href.includes('?') ? '&' : '?';
        link.setAttribute('href', `${href}${separator}nav=${this.currentNavId}`);
      }
    });
  }

  // Navigate to a route with clean URL
  navigateTo(route, params = {}) {
    let url = route;
    
    // Add navigation ID if available
    if (this.currentNavId) {
      params.nav = this.currentNavId;
    }
    
    // Add parameters
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    
    window.location.href = url;
  }

  // Get clean URL for display purposes
  getCleanUrl(route) {
    return route.split('?')[0]; // Remove query parameters
  }

  // Update page title with clean route name
  updatePageTitle(route) {
    const routeNames = {
      '/dashboard': 'Dashboard',
      '/workouts': 'Workouts',
      '/progress': 'Progress',
      '/meal-planner': 'Meal Planner',
      '/nutrition': 'Nutrition',
      '/nutriscan': 'NutriScan',
      '/challenges': 'Challenges',
      '/schedule': 'Schedule',
      '/community': 'Community',
      '/ai-coach': 'AI Coach',
      '/chat': 'Chat',
      '/settings': 'Settings',
      '/subscription': 'Subscription',
      '/gamification': 'Gamification',
      '/virtual-doctor': 'Virtual Doctor'
    };
    
    const cleanRoute = this.getCleanUrl(route);
    const pageName = routeNames[cleanRoute] || 'Fit-With-AI';
    document.title = `${pageName} - Fit-With-AI`;
  }
}

// Initialize navigation manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.navigationManager = new NavigationManager();
  
  // Update page title
  window.navigationManager.updatePageTitle(window.location.pathname);
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NavigationManager;
}