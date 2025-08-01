/**
 * Auto Voice Assistant Loader
 * Automatically loads the Siri-like voice assistant on all protected pages
 */

(function() {
    // Check if we're on a page that should have the voice assistant
    const currentPath = window.location.pathname;
    const excludedPaths = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];
    
    // Don't load on login/signup pages or if already loaded
    if (excludedPaths.some(path => currentPath === path || currentPath.includes(path)) || 
        document.getElementById('siri-mic-button')) {
        return;
    }
    
    // Load the Siri voice assistant script if not already present
    if (!document.querySelector('script[src="/js/voice-assistant-siri.js"]')) {
        const script = document.createElement('script');
        script.src = '/js/voice-assistant-siri.js';
        script.async = true;
        
        // Add to head
        document.head.appendChild(script);
        
        console.log('Auto Voice Assistant loaded for:', currentPath);
    }
})();