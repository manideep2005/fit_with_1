// Unified Gamification Widget for Fit-With-AI
class GamificationWidget {
    constructor() {
        this.data = {
            level: 1,
            totalXP: 0,
            xpToNextLevel: 100,
            progressToNextLevel: 0,
            streaks: { workout: { current: 0 }, nutrition: { current: 0 } },
            achievements: []
        };
        this.isVisible = false;
        this.xpTable = this.generateXPTable();
        this.init();
    }

    generateXPTable() {
        // Generate XP requirements for each level (exponential growth)
        const table = {};
        for (let level = 1; level <= 100; level++) {
            table[level] = Math.floor(100 * Math.pow(1.2, level - 1));
        }
        return table;
    }

    calculateLevel(totalXP) {
        let level = 1;
        let xpUsed = 0;
        
        for (let i = 1; i <= 100; i++) {
            if (xpUsed + this.xpTable[i] <= totalXP) {
                xpUsed += this.xpTable[i];
                level = i + 1;
            } else {
                break;
            }
        }
        
        const currentLevelXP = totalXP - xpUsed;
        const xpNeeded = this.xpTable[level] || this.xpTable[100];
        const progress = Math.min((currentLevelXP / xpNeeded) * 100, 100);
        
        return {
            level: Math.min(level, 100),
            currentLevelXP,
            xpToNextLevel: Math.max(xpNeeded - currentLevelXP, 0),
            progressToNextLevel: progress
        };
    }

    async init() {
        await this.loadGamificationData();
        this.createWidget();
        this.bindEvents();
        this.startPeriodicUpdates();
    }

    async loadGamificationData() {
        try {
            const response = await fetch('/api/gamification-data');
            const result = await response.json();
            
            if (result.success) {
                this.data = { ...this.data, ...result.data };
                
                // Calculate level from total XP
                const levelData = this.calculateLevel(this.data.totalXP || 0);
                this.data = { ...this.data, ...levelData };
                
                this.updateWidget();
            }
        } catch (error) {
            console.error('Failed to load gamification data:', error);
            // Use default data if API fails
            this.updateWidget();
        }
    }

    createWidget() {
        // Remove existing widget if present
        const existing = document.getElementById('gamification-widget');
        if (existing) existing.remove();

        const widget = document.createElement('div');
        widget.id = 'gamification-widget';
        widget.innerHTML = `
            <div class="gam-widget-toggle" onclick="gamificationWidget.toggle()">
                <i class="fas fa-trophy"></i>
                <span class="gam-level">1</span>
                <div class="gam-notification-badge" style="display: none;">!</div>
            </div>
            
            <div class="gam-widget-panel" style="display: none;">
                <div class="gam-header">
                    <h3>Your Progress</h3>
                    <button class="gam-close" onclick="gamificationWidget.hide()">×</button>
                </div>
                
                <div class="gam-level-section">
                    <div class="gam-level-info">
                        <span class="gam-level-text">Level <span class="gam-current-level">1</span></span>
                        <span class="gam-xp-text"><span class="gam-current-xp">0</span> XP</span>
                    </div>
                    <div class="gam-progress-bar">
                        <div class="gam-progress-fill" style="width: 0%"></div>
                    </div>
                    <div class="gam-next-level">Next: <span class="gam-xp-needed">100</span> XP</div>
                </div>
                
                <div class="gam-streaks">
                    <div class="gam-streak-item">
                        <i class="fas fa-dumbbell"></i>
                        <span>Workout: <strong class="gam-workout-streak">0</strong> days</span>
                    </div>
                    <div class="gam-streak-item">
                        <i class="fas fa-apple-alt"></i>
                        <span>Nutrition: <strong class="gam-nutrition-streak">0</strong> days</span>
                    </div>
                </div>
                
                <div class="gam-quick-actions">
                    <button class="gam-action-btn" onclick="gamificationWidget.logWorkout()">
                        <i class="fas fa-plus"></i> Log Workout
                    </button>
                    <button class="gam-action-btn" onclick="gamificationWidget.logNutrition()">
                        <i class="fas fa-utensils"></i> Log Meal
                    </button>
                </div>
                
                <div class="gam-recent-achievements" style="display: none;">
                    <h4>Recent Achievements</h4>
                    <div class="gam-achievements-list"></div>
                </div>
            </div>
        `;

        this.addStyles();
        document.body.appendChild(widget);
    }

    addStyles() {
        if (document.getElementById('gam-widget-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'gam-widget-styles';
        styles.textContent = `
            #gamification-widget {
                position: fixed;
                bottom: 130px;
                right: 30px;
                z-index: 9999;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }
            
            .gam-widget-toggle {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
                transition: all 0.3s ease;
                position: relative;
                border: none;
            }
            
            .gam-widget-toggle:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 25px rgba(99, 102, 241, 0.4);
            }
            
            .gam-widget-toggle i {
                color: white;
                font-size: 20px;
            }
            
            .gam-level {
                position: absolute;
                bottom: -5px;
                right: -5px;
                background: #10b981;
                color: white;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
                border: 2px solid white;
            }
            
            .gam-notification-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #ef4444;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }
            
            .gam-widget-panel {
                position: absolute;
                bottom: 70px;
                right: 0;
                width: 320px;
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                border: 1px solid #e2e8f0;
                overflow: hidden;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .gam-header {
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .gam-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }
            
            .gam-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s;
            }
            
            .gam-close:hover {
                background-color: rgba(255, 255, 255, 0.2);
            }
            
            .gam-level-section {
                padding: 20px;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .gam-level-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            
            .gam-level-text {
                font-size: 16px;
                font-weight: 600;
                color: #1f2937;
            }
            
            .gam-xp-text {
                font-size: 14px;
                color: #6b7280;
            }
            
            .gam-progress-bar {
                width: 100%;
                height: 8px;
                background: #e5e7eb;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .gam-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #10b981, #059669);
                transition: width 0.5s ease;
            }
            
            .gam-next-level {
                font-size: 12px;
                color: #6b7280;
                text-align: center;
            }
            
            .gam-streaks {
                padding: 20px;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .gam-streak-item {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
                font-size: 14px;
                color: #374151;
            }
            
            .gam-streak-item:last-child {
                margin-bottom: 0;
            }
            
            .gam-streak-item i {
                width: 20px;
                color: #6366f1;
            }
            
            .gam-quick-actions {
                padding: 20px;
                display: flex;
                gap: 12px;
            }
            
            .gam-action-btn {
                flex: 1;
                padding: 12px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                cursor: pointer;
                font-size: 12px;
                color: #374151;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }
            
            .gam-action-btn:hover {
                background: #6366f1;
                color: white;
                border-color: #6366f1;
            }
            
            .gam-recent-achievements {
                padding: 20px;
                border-top: 1px solid #e2e8f0;
            }
            
            .gam-recent-achievements h4 {
                margin: 0 0 12px 0;
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
            }
        `;
        
        document.head.appendChild(styles);
    }

    updateWidget() {
        const levelSpan = document.querySelector('.gam-level');
        const currentLevelSpan = document.querySelector('.gam-current-level');
        const currentXPSpan = document.querySelector('.gam-current-xp');
        const progressFill = document.querySelector('.gam-progress-fill');
        const xpNeededSpan = document.querySelector('.gam-xp-needed');
        const workoutStreakSpan = document.querySelector('.gam-workout-streak');
        const nutritionStreakSpan = document.querySelector('.gam-nutrition-streak');

        if (levelSpan) levelSpan.textContent = this.data.level;
        if (currentLevelSpan) currentLevelSpan.textContent = this.data.level;
        if (currentXPSpan) currentXPSpan.textContent = this.data.totalXP;
        if (progressFill) progressFill.style.width = `${this.data.progressToNextLevel}%`;
        if (xpNeededSpan) xpNeededSpan.textContent = this.data.xpToNextLevel;
        if (workoutStreakSpan) workoutStreakSpan.textContent = this.data.streaks.workout.current;
        if (nutritionStreakSpan) nutritionStreakSpan.textContent = this.data.streaks.nutrition.current;
    }

    toggle() {
        this.isVisible ? this.hide() : this.show();
    }

    show() {
        const panel = document.querySelector('.gam-widget-panel');
        if (panel) {
            panel.style.display = 'block';
            this.isVisible = true;
        }
    }

    hide() {
        const panel = document.querySelector('.gam-widget-panel');
        if (panel) {
            panel.style.display = 'none';
            this.isVisible = false;
        }
    }

    bindEvents() {
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            const widget = document.getElementById('gamification-widget');
            if (widget && !widget.contains(e.target) && this.isVisible) {
                this.hide();
            }
        });
    }

    startPeriodicUpdates() {
        // Update data every 30 seconds
        setInterval(() => {
            this.loadGamificationData();
        }, 30000);
    }

    async logWorkout() {
        try {
            const response = await fetch('/api/log-workout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'quick_log' })
            });
            
            if (response.ok) {
                this.showNotification('Workout logged! +25 XP');
                this.loadGamificationData();
            }
        } catch (error) {
            console.error('Failed to log workout:', error);
        }
    }

    async logNutrition() {
        try {
            const response = await fetch('/api/log-nutrition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'quick_log' })
            });
            
            if (response.ok) {
                this.showNotification('Meal logged! +15 XP');
                this.loadGamificationData();
            }
        } catch (error) {
            console.error('Failed to log nutrition:', error);
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize widget when DOM is ready
let gamificationWidget;
document.addEventListener('DOMContentLoaded', () => {
    gamificationWidget = new GamificationWidget();
});
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.3s ease;
            }
            
            .gam-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .gam-level-section {
                padding: 20px;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .gam-level-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            
            .gam-level-text {
                font-weight: 600;
                color: #1e293b;
            }
            
            .gam-xp-text {
                color: #6366f1;
                font-weight: 500;
            }
            
            .gam-progress-bar {
                height: 8px;
                background: #e2e8f0;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .gam-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #6366f1, #8b5cf6);
                transition: width 0.5s ease;
            }
            
            .gam-next-level {
                font-size: 12px;
                color: #64748b;
                text-align: center;
            }
            
            .gam-streaks {
                padding: 20px;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .gam-streak-item {
                display: flex;
                align-items: center;
                margin-bottom: 12px;
                font-size: 14px;
            }
            
            .gam-streak-item:last-child {
                margin-bottom: 0;
            }
            
            .gam-streak-item i {
                width: 20px;
                margin-right: 10px;
                color: #6366f1;
            }
            
            .gam-quick-actions {
                padding: 20px;
                display: flex;
                gap: 10px;
            }
            
            .gam-action-btn {
                flex: 1;
                padding: 10px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 12px;
                color: #475569;
            }
            
            .gam-action-btn:hover {
                background: #6366f1;
                color: white;
                border-color: #6366f1;
            }
            
            .gam-recent-achievements {
                padding: 20px;
                border-top: 1px solid #e2e8f0;
            }
            
            .gam-recent-achievements h4 {
                margin: 0 0 15px 0;
                font-size: 14px;
                color: #1e293b;
            }
            
            .gam-achievement-item {
                display: flex;
                align-items: center;
                padding: 8px;
                background: #f8fafc;
                border-radius: 8px;
                margin-bottom: 8px;
            }
            
            .gam-achievement-icon {
                font-size: 20px;
                margin-right: 10px;
            }
            
            .gam-achievement-text {
                flex: 1;
                font-size: 12px;
            }
            
            .gam-achievement-name {
                font-weight: 600;
                color: #1e293b;
            }
            
            .gam-achievement-desc {
                color: #64748b;
            }

            .gam-notification {
                position: fixed;
                bottom: 100px;
                left: 20px;
                background: white;
                border-radius: 12px;
                padding: 15px 20px;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                border-left: 4px solid #10b981;
                z-index: 10001;
                animation: slideInLeft 0.3s ease;
                max-width: 300px;
            }
            
            .gam-notification-success {
                border-left-color: #10b981;
            }
            
            .gam-notification-warning {
                border-left-color: #f59e0b;
            }
            
            .gam-notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .gam-notification i {
                color: #10b981;
                font-size: 18px;
            }
            
            @keyframes slideInLeft {
                from { transform: translateX(-100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            @media (max-width: 768px) {
                #gamification-widget {
                    bottom: 110px;
                    right: 20px;
                }
                
                .gam-widget-panel {
                    width: 280px;
                    right: -20px;
                }
                
                .gam-notification {
                    left: 15px;
                    max-width: 250px;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    updateWidget() {
        if (!this.data) return;

        // Update level and XP displays
        const levelElements = document.querySelectorAll('.gam-level, .gam-current-level');
        levelElements.forEach(el => el.textContent = this.data.level || 1);
        
        const xpElement = document.querySelector('.gam-current-xp');
        if (xpElement) xpElement.textContent = this.data.totalXP || 0;
        
        const xpNeededElement = document.querySelector('.gam-xp-needed');
        if (xpNeededElement) xpNeededElement.textContent = this.data.xpToNextLevel || 100;

        // Update progress bar
        const progressFill = document.querySelector('.gam-progress-fill');
        if (progressFill) {
            const progress = this.data.progressToNextLevel || 0;
            progressFill.style.width = `${Math.min(progress, 100)}%`;
        }

        // Update streaks
        const workoutStreakEl = document.querySelector('.gam-workout-streak');
        const nutritionStreakEl = document.querySelector('.gam-nutrition-streak');
        
        if (workoutStreakEl) {
            workoutStreakEl.textContent = this.data.streaks?.workout?.current || 0;
        }
        if (nutritionStreakEl) {
            nutritionStreakEl.textContent = this.data.streaks?.nutrition?.current || 0;
        }

        // Update achievements
        if (this.data.achievements && this.data.achievements.length > 0) {
            this.showRecentAchievements(this.data.achievements.slice(0, 3));
        }
    }

    showRecentAchievements(achievements) {
        const container = document.querySelector('.gam-recent-achievements');
        const list = document.querySelector('.gam-achievements-list');
        
        if (achievements.length > 0) {
            container.style.display = 'block';
            list.innerHTML = achievements.map(achievement => `
                <div class="gam-achievement-item">
                    <span class="gam-achievement-icon">${achievement.icon || '🏆'}</span>
                    <div class="gam-achievement-text">
                        <div class="gam-achievement-name">${achievement.name}</div>
                        <div class="gam-achievement-desc">${achievement.description}</div>
                    </div>
                </div>
            `).join('');
        } else {
            container.style.display = 'none';
        }
    }

    toggle() {
        const panel = document.querySelector('.gam-widget-panel');
        this.isVisible = !this.isVisible;
        panel.style.display = this.isVisible ? 'block' : 'none';
        
        if (this.isVisible) {
            this.loadGamificationData();
        }
    }

    show() {
        const panel = document.querySelector('.gam-widget-panel');
        this.isVisible = true;
        panel.style.display = 'block';
        this.loadGamificationData();
    }

    hide() {
        const panel = document.querySelector('.gam-widget-panel');
        this.isVisible = false;
        panel.style.display = 'none';
    }

    showNotification(message, type = 'success') {
        // Remove existing notifications
        document.querySelectorAll('.gam-notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `gam-notification gam-notification-${type}`;
        notification.innerHTML = `
            <div class="gam-notification-content">
                <i class="fas fa-trophy"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideInLeft 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    async logWorkout() {
        const workoutData = {
            type: 'Quick Workout',
            duration: 30,
            calories: 200,
            exercises: ['Push-ups', 'Squats', 'Planks'],
            notes: 'Quick workout logged via gamification widget'
        };

        try {
            const response = await fetch('/api/workouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workoutData)
            });

            const result = await response.json();
            if (result.success) {
                // Add XP for workout
                this.addXP(50, 'Workout completed');
                
                if (result.gamification) {
                    this.handleGamificationResults(result.gamification);
                }
            }
        } catch (error) {
            console.error('Failed to log workout:', error);
            // Still add XP even if API fails
            this.addXP(50, 'Workout completed');
        }
    }

    async logNutrition() {
        const nutritionData = {
            meals: [{
                name: 'Quick Meal',
                type: 'snacks',
                calories: 150,
                protein: 10,
                carbs: 20,
                fat: 5
            }],
            totalCalories: 150,
            totalProtein: 10,
            totalCarbs: 20,
            totalFat: 5,
            waterIntake: 250
        };

        try {
            const response = await fetch('/api/nutrition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nutritionData)
            });

            const result = await response.json();
            if (result.success) {
                // Add XP for nutrition
                this.addXP(25, 'Meal logged');
                
                if (result.gamification) {
                    this.handleGamificationResults(result.gamification);
                }
            }
        } catch (error) {
            console.error('Failed to log nutrition:', error);
            // Still add XP even if API fails
            this.addXP(25, 'Meal logged');
        }
    }

    addXP(amount, reason) {
        const oldLevel = this.data.level;
        this.data.totalXP += amount;
        
        // Recalculate level
        const levelData = this.calculateLevel(this.data.totalXP);
        this.data = { ...this.data, ...levelData };
        
        // Show XP notification
        this.showNotification(`+${amount} XP - ${reason}`);
        
        // Check for level up
        if (this.data.level > oldLevel) {
            setTimeout(() => {
                this.showNotification(`🎉 Level Up! You're now level ${this.data.level}!`, 'success');
            }, 1000);
        }
        
        // Update widget display
        this.updateWidget();
        
        // Show notification badge
        const badge = document.querySelector('.gam-notification-badge');
        if (badge) {
            badge.style.display = 'block';
            setTimeout(() => badge.style.display = 'none', 3000);
        }
    }

    handleGamificationResults(results) {
        if (results.levelUp) {
            this.showNotification(`🎉 Level Up! You're now level ${results.currentLevel}!`, 'success');
        }

        if (results.achievements && results.achievements.length > 0) {
            results.achievements.forEach((achievement, index) => {
                setTimeout(() => {
                    this.showNotification(`🏆 Achievement: ${achievement.name}!`, 'success');
                }, index * 1500);
            });
        }

        if (results.streakRewards && results.streakRewards.length > 0) {
            results.streakRewards.forEach((reward, index) => {
                setTimeout(() => {
                    this.showNotification(`🎁 Streak Reward: ${reward.name}!`, 'success');
                }, index * 1500);
            });
        }

        const badge = document.querySelector('.gam-notification-badge');
        if (badge) {
            badge.style.display = 'block';
            setTimeout(() => badge.style.display = 'none', 5000);
        }
    }

    startPeriodicUpdates() {
        setInterval(() => {
            if (this.isVisible) {
                this.loadGamificationData();
            }
        }, 30000);
    }

    bindEvents() {
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            const widget = document.getElementById('gamification-widget');
            if (widget && !widget.contains(e.target) && this.isVisible) {
                this.hide();
            }
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    // Integration methods
    async trackPageVisit(pageName) {
        try {
            await fetch('/api/gamification/track-visit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ page: pageName })
            });
        } catch (error) {
            console.error('Failed to track page visit:', error);
        }
    }

    async trackAction(action, data = {}) {
        try {
            await fetch('/api/gamification/track-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, data })
            });
        } catch (error) {
            console.error('Failed to track action:', error);
        }
    }
}

// Initialize gamification widget when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gamificationWidget = new GamificationWidget();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GamificationWidget;
}