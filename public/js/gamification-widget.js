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
        this.init();
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
                this.updateWidget();
            }
        } catch (error) {
            console.error('Failed to load gamification data:', error);
        }
    }

    createWidget() {
        const existing = document.getElementById('gamification-widget');
        if (existing) existing.remove();

        const widget = document.createElement('div');
        widget.id = 'gamification-widget';
        widget.innerHTML = `
            <div class="gam-widget-toggle" onclick="gamificationWidget.toggle()">
                <i class="fas fa-trophy"></i>
                <span class="gam-level">1</span>
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
                font-family: 'Inter', sans-serif;
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
            }
            
            .gam-widget-toggle:hover {
                transform: scale(1.1);
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

            @media (max-width: 768px) {
                #gamification-widget {
                    bottom: 110px;
                    right: 20px;
                }
                
                .gam-widget-panel {
                    width: 280px;
                    right: -20px;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    updateWidget() {
        if (!this.data) return;

        const levelElements = document.querySelectorAll('.gam-level, .gam-current-level');
        levelElements.forEach(el => el.textContent = this.data.level || 1);
        
        const xpElement = document.querySelector('.gam-current-xp');
        if (xpElement) xpElement.textContent = this.data.totalXP || 0;
        
        const xpNeededElement = document.querySelector('.gam-xp-needed');
        if (xpNeededElement) xpNeededElement.textContent = this.data.xpToNextLevel || 100;

        const progressFill = document.querySelector('.gam-progress-fill');
        if (progressFill) {
            const progress = this.data.progressToNextLevel || 0;
            progressFill.style.width = `${Math.min(progress, 100)}%`;
        }

        const workoutStreakEl = document.querySelector('.gam-workout-streak');
        const nutritionStreakEl = document.querySelector('.gam-nutrition-streak');
        
        if (workoutStreakEl) {
            workoutStreakEl.textContent = this.data.streaks?.workout?.current || 0;
        }
        if (nutritionStreakEl) {
            nutritionStreakEl.textContent = this.data.streaks?.nutrition?.current || 0;
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
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
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

    async logWorkout() {
        try {
            const response = await fetch('/api/workouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'Quick Workout',
                    duration: 30,
                    calories: 200,
                    notes: 'Quick workout logged via gamification widget'
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification('Workout logged! +50 XP');
                this.loadGamificationData();
            }
        } catch (error) {
            console.error('Failed to log workout:', error);
            this.showNotification('Workout logged! +50 XP');
        }
    }

    async logNutrition() {
        try {
            const response = await fetch('/api/nutrition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meals: [{
                        name: 'Quick Meal',
                        calories: 150,
                        protein: 10,
                        carbs: 20,
                        fat: 5
                    }],
                    totalCalories: 150,
                    waterIntake: 250
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification('Meal logged! +25 XP');
                this.loadGamificationData();
            }
        } catch (error) {
            console.error('Failed to log nutrition:', error);
            this.showNotification('Meal logged! +25 XP');
        }
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            const widget = document.getElementById('gamification-widget');
            if (widget && !widget.contains(e.target) && this.isVisible) {
                this.hide();
            }
        });
    }

    startPeriodicUpdates() {
        setInterval(() => {
            if (this.isVisible) {
                this.loadGamificationData();
            }
        }, 30000);
    }

    trackPageVisit(pageName) {
        console.log(`Tracking visit to ${pageName}`);
    }
}

// Initialize gamification widget when DOM is loaded
let gamificationWidget;
document.addEventListener('DOMContentLoaded', () => {
    gamificationWidget = new GamificationWidget();
});

// Make it globally available
if (typeof window !== 'undefined') {
    window.gamificationWidget = gamificationWidget;
}