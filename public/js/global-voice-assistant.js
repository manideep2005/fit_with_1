/**
 * Global Siri-like Voice Assistant Loader
 * Automatically loads the voice assistant on all protected pages
 */

(function() {
    // Check if we're on a page that should have the voice assistant
    const currentPath = window.location.pathname;
    const excludedPaths = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];
    
    // Don't load on login/signup pages
    if (excludedPaths.some(path => currentPath.includes(path))) {
        return;
    }
    
    // Load the Siri voice assistant script
    const script = document.createElement('script');
    script.src = '/js/voice-assistant-siri.js';
    script.async = true;
    
    // Add to head
    document.head.appendChild(script);
    
    console.log('Global Siri Voice Assistant loaded for:', currentPath);
})();