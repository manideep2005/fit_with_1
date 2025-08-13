// Global Logout Toast Handler
// This script provides a modern toast-based logout confirmation system

(function() {
    'use strict';
    
    // Create and inject the logout toast HTML
    function createLogoutToast() {
        // Check if toast already exists
        if (document.getElementById('logoutToast')) {
            return;
        }
        
        const toastHTML = `
            <!-- Logout Toast Container -->
            <div id="logoutToast" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 25px 30px; border-radius: 16px; z-index: 10000; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); min-width: 320px; text-align: center;">
                <div style="color: white; font-size: 1.2rem; font-weight: 600; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <i class="fas fa-sign-out-alt" style="color: #ff6b6b;"></i>
                    Are you sure you want to logout?
                </div>
                <div style="color: rgba(255,255,255,0.7); font-size: 0.9rem; margin-bottom: 20px;">You'll need to sign in again to access your account</div>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="cancelLogoutBtn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-family: 'Poppins', sans-serif; font-weight: 500; transition: all 0.3s ease;">Cancel</button>
                    <button id="confirmLogoutBtn" style="background: linear-gradient(135deg, #ff6b6b, #ee5a52); border: none; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-family: 'Poppins', sans-serif; font-weight: 500; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);">Yes, Logout</button>
                </div>
            </div>
            
            <!-- Toast Overlay -->
            <div id="toastOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; backdrop-filter: blur(3px);"></div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', toastHTML);
        
        // Add event listeners
        setupEventListeners();
    }
    
    // Setup event listeners for the toast
    function setupEventListeners() {
        const cancelBtn = document.getElementById('cancelLogoutBtn');
        const confirmBtn = document.getElementById('confirmLogoutBtn');
        const overlay = document.getElementById('toastOverlay');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', hideLogoutToast);
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                window.location.href = '/logout';
            });
        }
        
        if (overlay) {
            overlay.addEventListener('click', hideLogoutToast);
        }
        
        // Close toast with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const toast = document.getElementById('logoutToast');
                if (toast && toast.style.display === 'block') {
                    hideLogoutToast();
                }
            }
        });
    }
    
    // Show the logout toast
    function showLogoutToast() {
        const toast = document.getElementById('logoutToast');
        const overlay = document.getElementById('toastOverlay');
        
        if (toast && overlay) {
            toast.style.display = 'block';
            overlay.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Add animation
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, -50%) scale(0.9)';
            
            setTimeout(() => {
                toast.style.transition = 'all 0.3s ease';
                toast.style.opacity = '1';
                toast.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 10);
        }
    }
    
    // Hide the logout toast
    function hideLogoutToast() {
        const toast = document.getElementById('logoutToast');
        const overlay = document.getElementById('toastOverlay');
        
        if (toast && overlay) {
            toast.style.transition = 'all 0.3s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, -50%) scale(0.9)';
            
            setTimeout(() => {
                toast.style.display = 'none';
                overlay.style.display = 'none';
                document.body.style.overflow = 'auto';
            }, 300);
        }
    }
    
    // Initialize when DOM is ready
    function init() {
        createLogoutToast();
        
        // Replace all existing logout links
        const logoutLinks = document.querySelectorAll('a[href="/logout"], a[onclick*="confirmLogout"]');
        logoutLinks.forEach(link => {
            link.href = '#';
            link.onclick = function(e) {
                e.preventDefault();
                showLogoutToast();
                return false;
            };
        });
    }
    
    // Make functions globally available
    window.showLogoutToast = showLogoutToast;
    window.hideLogoutToast = hideLogoutToast;
    window.cancelLogout = hideLogoutToast; // Alias for backward compatibility
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();