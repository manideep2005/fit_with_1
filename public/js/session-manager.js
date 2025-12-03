// Session Manager - Frontend Component
class SessionManager {
    constructor() {
        this.sessions = [];
        this.init();
    }

    init() {
        this.loadSessions();
        this.setupEventListeners();
    }

    async loadSessions() {
        try {
            console.log('🔄 Loading sessions...');
            const response = await fetch('/api/sessions');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📊 Sessions response:', result);
            
            if (result.success) {
                this.sessions = result.sessions || [];
                this.renderSessions();
                console.log(`✅ Loaded ${this.sessions.length} sessions`);
            } else {
                console.error('❌ Sessions API error:', result.error);
                this.showError(result.error || 'Failed to load sessions');
            }
        } catch (error) {
            console.error('❌ Failed to load sessions:', error);
            this.showError('Failed to load sessions: ' + error.message);
        }
    }

    setupEventListeners() {
        // Refresh sessions button
        document.getElementById('refreshSessions')?.addEventListener('click', () => {
            this.loadSessions();
        });

        // Revoke all sessions button
        document.getElementById('revokeAllSessions')?.addEventListener('click', () => {
            this.revokeAllSessions();
        });

        // Logout from all devices button
        document.getElementById('logoutAllDevices')?.addEventListener('click', () => {
            this.logoutAllDevices();
        });
    }

    renderSessions() {
        const container = document.getElementById('sessionsContainer');
        if (!container) return;

        if (this.sessions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-desktop text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-500">No active sessions found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.sessions.map(session => `
            <div class="bg-white rounded-lg shadow-md p-6 mb-4 ${session.isCurrent ? 'border-2 border-blue-500' : ''}">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="text-3xl">
                            ${this.getDeviceIcon(session.deviceInfo.type)}
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-900">
                                ${session.deviceInfo.type.charAt(0).toUpperCase() + session.deviceInfo.type.slice(1)} Device
                                ${session.isCurrent ? '<span class="text-blue-600 text-sm">(Current)</span>' : ''}
                            </h3>
                            <p class="text-sm text-gray-600">
                                ${session.deviceInfo.browser} • ${session.deviceInfo.os}
                            </p>
                            <p class="text-xs text-gray-500">
                                Last active: ${new Date(session.lastActivity).toLocaleString()}
                            </p>
                            <p class="text-xs text-gray-500">
                                Location: ${session.deviceInfo.location}
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        ${session.isCurrent ? 
                            '<span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Active</span>' :
                            `<button onclick="sessionManager.revokeSession('${session.sessionId}')" 
                                class="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-full text-sm font-medium transition-colors">
                                Revoke
                            </button>`
                        }
                    </div>
                </div>
            </div>
        `).join('');
    }

    getDeviceIcon(deviceType) {
        const icons = {
            mobile: '📱',
            tablet: '📱',
            desktop: '🖥️',
            unknown: '💻'
        };
        return icons[deviceType] || icons.unknown;
    }

    async revokeSession(sessionId) {
        if (!confirm('Are you sure you want to revoke this session? The user will be logged out from that device.')) {
            return;
        }

        try {
            const response = await fetch('/api/sessions/revoke', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showToast('Session revoked successfully', 'success');
                this.loadSessions(); // Refresh the list
            } else {
                this.showToast(result.error || 'Failed to revoke session', 'error');
            }
        } catch (error) {
            console.error('Revoke session error:', error);
            this.showToast('Failed to revoke session', 'error');
        }
    }

    async revokeAllSessions() {
        if (!confirm('Are you sure you want to revoke all other sessions? This will log you out from all other devices.')) {
            return;
        }

        try {
            const response = await fetch('/api/sessions/revoke-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();
            
            if (result.success) {
                this.showToast(result.message, 'success');
                this.loadSessions(); // Refresh the list
            } else {
                this.showToast(result.error || 'Failed to revoke sessions', 'error');
            }
        } catch (error) {
            console.error('Revoke all sessions error:', error);
            this.showToast('Failed to revoke sessions', 'error');
        }
    }

    async logoutAllDevices() {
        if (!confirm('Are you sure you want to logout from ALL devices including this one? You will need to login again.')) {
            return;
        }

        try {
            const response = await fetch('/api/sessions/logout-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();
            
            if (result.success) {
                this.showToast('Logged out from all devices', 'success');
                setTimeout(() => {
                    window.location.href = result.redirectUrl || '/';
                }, 2000);
            } else {
                this.showToast(result.error || 'Failed to logout', 'error');
            }
        } catch (error) {
            console.error('Logout all devices error:', error);
            this.showToast('Failed to logout from all devices', 'error');
        }
    }

    showError(message) {
        const container = document.getElementById('sessionsContainer');
        if (container) {
            container.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-3"></i>
                    <h3 class="text-red-800 font-semibold mb-2">Failed to Load Sessions</h3>
                    <p class="text-red-600 mb-4">${message}</p>
                    <button onclick="sessionManager.loadSessions()" 
                        class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors">
                        <i class="fas fa-redo mr-2"></i>Retry
                    </button>
                </div>
            `;
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500',
            warning: 'bg-yellow-500'
        };
        
        toast.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.remove('translate-x-full'), 100);
        
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
}

// Initialize session manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('sessionsContainer')) {
        window.sessionManager = new SessionManager();
    }
});