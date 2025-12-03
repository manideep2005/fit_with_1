// Session Conflict Detection and Management
class SessionConflictManager {
    constructor() {
        this.checkInterval = null;
        this.init();
    }

    init() {
        // Check for session conflicts on page load
        this.checkSessionConflict();
        
        // Set up periodic checking for session conflicts
        this.startPeriodicCheck();
        
        // Listen for visibility change to check when user returns to tab
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkSessionConflict();
            }
        });
    }

    async checkSessionConflict() {
        try {
            const response = await fetch('/api/sessions/conflict-status');
            const result = await response.json();
            
            if (result.success && result.hasConflict) {
                this.showConflictModal(result.conflict);
            }
        } catch (error) {
            console.error('Session conflict check failed:', error);
        }
    }

    showConflictModal(conflict) {
        // Remove any existing modal
        const existingModal = document.getElementById('sessionConflictModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'sessionConflictModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, rgba(220, 53, 69, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(220, 53, 69, 0.08) 100%);
            backdrop-filter: blur(20px);
            border: 2px solid rgba(220, 53, 69, 0.3);
            padding: 2.5rem;
            border-radius: 16px;
            max-width: 500px;
            width: 90%;
            color: white;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        `;

        const existingDevice = conflict.existingDevice;
        const currentDevice = conflict.currentDevice;

        content.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #FFC107; margin-bottom: 1rem;"></i>
                <h2 style="margin: 0 0 1rem 0; color: #FFC107;">Session Conflict Detected</h2>
                <p style="color: rgba(255,255,255,0.9); line-height: 1.6; margin-bottom: 1.5rem;">
                    You are already logged in on another device. For security reasons, only one active session is allowed per account.
                </p>
            </div>
            
            <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;">
                <h3 style="margin: 0 0 1rem 0; color: white;">Current Sessions:</h3>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 12px; background: rgba(40, 167, 69, 0.2); border-radius: 8px; border-left: 4px solid #28A745;">
                    <div style="text-align: left;">
                        <div style="font-weight: 600; color: #28A745;">
                            <i class="fas ${this.getDeviceIcon(existingDevice.type)}"></i> 
                            ${existingDevice.type.charAt(0).toUpperCase() + existingDevice.type.slice(1)} Device (Active)
                        </div>
                        <small style="color: rgba(255,255,255,0.8);">
                            ${existingDevice.browser} • Last active: ${new Date(existingDevice.lastActivity).toLocaleTimeString()}
                        </small>
                    </div>
                    <span style="background: #28A745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">ACTIVE</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255, 193, 7, 0.2); border-radius: 8px; border-left: 4px solid #FFC107;">
                    <div style="text-align: left;">
                        <div style="font-weight: 600; color: #FFC107;">
                            <i class="fas ${this.getDeviceIcon(currentDevice.type)}"></i> 
                            ${currentDevice.type.charAt(0).toUpperCase() + currentDevice.type.slice(1)} Device (This Device)
                        </div>
                        <small style="color: rgba(255,255,255,0.8);">
                            ${currentDevice.browser} • Attempting to login
                        </small>
                    </div>
                    <span style="background: #FFC107; color: #000; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">PENDING</span>
                </div>
            </div>
            
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="forceLoginBtn" style="
                    background: #DC3545;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    flex: 1;
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='#C82333'" onmouseout="this.style.background='#DC3545'">
                    <i class="fas fa-sign-in-alt"></i> Force Login Here
                </button>
                <button id="cancelLoginBtn" style="
                    background: transparent;
                    color: white;
                    border: 2px solid rgba(255,255,255,0.3);
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    flex: 1;
                    transition: all 0.3s ease;
                " onmouseover="this.style.borderColor='rgba(255,255,255,0.6)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.3)'">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
            
            <p style="color: rgba(255,255,255,0.6); font-size: 0.9rem; margin-top: 1.5rem; margin-bottom: 0;">
                <i class="fas fa-info-circle"></i> 
                Forcing login will log out the other device immediately.
            </p>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Add event listeners
        document.getElementById('forceLoginBtn').addEventListener('click', () => {
            this.resolveConflict('force_login');
        });

        document.getElementById('cancelLoginBtn').addEventListener('click', () => {
            this.resolveConflict('cancel');
        });

        // Prevent modal from closing by clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                // Don't close - force user to make a choice
                this.shakeModal(content);
            }
        });
    }

    async resolveConflict(action) {
        const modal = document.getElementById('sessionConflictModal');
        const forceBtn = document.getElementById('forceLoginBtn');
        const cancelBtn = document.getElementById('cancelLoginBtn');

        // Disable buttons and show loading
        forceBtn.disabled = true;
        cancelBtn.disabled = true;
        forceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        cancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            const response = await fetch('/api/sessions/resolve-conflict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });

            const result = await response.json();

            if (result.success) {
                if (action === 'force_login') {
                    this.showSuccessMessage('Session conflict resolved. Other device has been logged out.');
                    setTimeout(() => {
                        modal.remove();
                        window.location.reload();
                    }, 2000);
                } else {
                    this.showSuccessMessage('Login cancelled. Redirecting...');
                    setTimeout(() => {
                        window.location.href = result.redirectUrl || '/';
                    }, 1500);
                }
            } else {
                this.showErrorMessage('Failed to resolve conflict: ' + result.error);
                // Re-enable buttons
                forceBtn.disabled = false;
                cancelBtn.disabled = false;
                forceBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Force Login Here';
                cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
            }
        } catch (error) {
            console.error('Conflict resolution error:', error);
            this.showErrorMessage('Network error. Please try again.');
            // Re-enable buttons
            forceBtn.disabled = false;
            cancelBtn.disabled = false;
            forceBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Force Login Here';
            cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
        }
    }

    shakeModal(element) {
        element.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }

    getDeviceIcon(deviceType) {
        switch(deviceType) {
            case 'mobile': return 'fa-mobile-alt';
            case 'tablet': return 'fa-tablet-alt';
            case 'desktop': return 'fa-desktop';
            default: return 'fa-laptop';
        }
    }

    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }

    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const colors = {
            success: '#28A745',
            error: '#DC3545',
            info: '#17A2B8',
            warning: '#FFC107'
        };
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 15000;
            background: ${colors[type]};
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            max-width: 350px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-size: 14px;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.style.transform = 'translateX(0)', 100);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    startPeriodicCheck() {
        // Check every 30 seconds for session conflicts
        this.checkInterval = setInterval(() => {
            this.checkSessionConflict();
        }, 30000);
    }

    stopPeriodicCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

// Add shake animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Initialize session conflict manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.sessionConflictManager = new SessionConflictManager();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.sessionConflictManager) {
        window.sessionConflictManager.stopPeriodicCheck();
    }
});