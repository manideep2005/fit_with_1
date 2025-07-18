// Push Notification System
class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.init();
    }

    async init() {
        if ('Notification' in window) {
            this.permission = await Notification.requestPermission();
        }
        
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
        }
        
        this.setupInAppNotifications();
    }

    async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration);
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    }

    setupInAppNotifications() {
        // Create notification container
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 350px;
        `;
        document.body.appendChild(container);
    }

    showNotification(title, options = {}) {
        // Browser notification
        if (this.permission === 'granted') {
            new Notification(title, {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                ...options
            });
        }

        // In-app notification
        this.showInAppNotification(title, options.body, options.type || 'info');
    }

    showInAppNotification(title, message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                ${message ? `<div class="notification-message">${message}</div>` : ''}
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        const styles = `
            <style>
                .notification {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    margin-bottom: 10px;
                    overflow: hidden;
                    animation: slideIn 0.3s ease;
                    border-left: 4px solid #6C63FF;
                }

                .notification-success { border-left-color: #28a745; }
                .notification-warning { border-left-color: #ffc107; }
                .notification-error { border-left-color: #dc3545; }

                .notification-content {
                    padding: 15px;
                    position: relative;
                }

                .notification-title {
                    font-weight: 600;
                    margin-bottom: 5px;
                    color: #333;
                }

                .notification-message {
                    color: #666;
                    font-size: 0.9rem;
                }

                .notification-close {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #999;
                }

                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
        `;

        if (!document.querySelector('#notification-styles')) {
            const styleElement = document.createElement('div');
            styleElement.id = 'notification-styles';
            styleElement.innerHTML = styles;
            document.head.appendChild(styleElement);
        }

        document.getElementById('notification-container').appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Workout reminders
    scheduleWorkoutReminder(time) {
        const now = new Date();
        const reminderTime = new Date();
        const [hours, minutes] = time.split(':');
        reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        if (reminderTime <= now) {
            reminderTime.setDate(reminderTime.getDate() + 1);
        }

        const timeUntilReminder = reminderTime.getTime() - now.getTime();

        setTimeout(() => {
            this.showNotification('Workout Reminder', {
                body: "Time for your workout! Let's get moving! 💪",
                type: 'info'
            });
        }, timeUntilReminder);
    }

    // Friend activity notifications
    notifyFriendActivity(friendName, activity) {
        this.showNotification(`${friendName} just completed a workout!`, {
            body: `${activity} - Give them some encouragement!`,
            type: 'success'
        });
    }

    // Achievement notifications
    notifyAchievement(achievement) {
        this.showNotification('Achievement Unlocked! 🏆', {
            body: achievement,
            type: 'success'
        });
    }

    // Goal milestone notifications
    notifyGoalProgress(goal, progress) {
        this.showNotification('Goal Progress Update', {
            body: `You're ${progress}% towards your ${goal} goal!`,
            type: 'info'
        });
    }
}

// Initialize notification manager
window.notificationManager = new NotificationManager();

// Export for use in other scripts
window.showNotification = (title, message, type) => {
    window.notificationManager.showInAppNotification(title, message, type);
};