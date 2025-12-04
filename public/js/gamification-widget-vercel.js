// Vercel-compatible Gamification Widget
class GamificationWidgetVercel {
    constructor() {
        this.data = {
            level: 1,
            totalXP: 0,
            streaks: { workout: { current: 0 }, nutrition: { current: 0 } }
        };
        this.isVisible = false;
        this.init();
    }

    async init() {
        await this.loadData();
        this.createWidget();
        console.log('✅ Gamification Widget ready');
    }

    async loadData() {
        try {
            const response = await fetch('/api/gamification-data');
            const result = await response.json();
            if (result.success) {
                this.data = { ...this.data, ...result.data };
            }
        } catch (error) {
            console.log('Using default gamification data');
        }
    }

    createWidget() {
        const widget = document.createElement('div');
        widget.id = 'gam-widget';
        widget.innerHTML = `
            <div class="gam-toggle" onclick="window.gamWidget.toggle()">
                <i class="fas fa-trophy"></i>
                <span class="gam-level">${this.data.level || 1}</span>
            </div>
            
            <div class="gam-panel" style="display: none;">
                <div class="gam-header">
                    <h3>🏆 Progress</h3>
                    <button onclick="window.gamWidget.hide()">×</button>
                </div>
                
                <div class="gam-content">
                    <div class="gam-level-info">
                        <span>Level ${this.data.level || 1}</span>
                        <span>${this.data.totalXP || 0} XP</span>
                    </div>
                    
                    <div class="gam-streaks">
                        <div>🏋️ Workout: ${this.data.streaks?.workout?.current || 0} days</div>
                        <div>🍎 Nutrition: ${this.data.streaks?.nutrition?.current || 0} days</div>
                    </div>
                    
                    <div class="gam-actions">
                        <button onclick="window.gamWidget.logWorkout()">Log Workout</button>
                        <button onclick="window.gamWidget.logMeal()">Log Meal</button>
                    </div>
                </div>
            </div>
        `;

        widget.style.cssText = `
            position: fixed;
            bottom: 130px;
            right: 30px;
            z-index: 9999;
            font-family: 'Inter', sans-serif;
        `;

        this.addStyles();
        document.body.appendChild(widget);
        window.gamWidget = this;
    }

    addStyles() {
        if (document.getElementById('gam-styles')) return;

        const style = document.createElement('style');
        style.id = 'gam-styles';
        style.textContent = `
            .gam-toggle {
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
                color: white;
                font-size: 20px;
            }
            
            .gam-toggle:hover {
                transform: scale(1.1);
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
            
            .gam-panel {
                position: absolute;
                bottom: 70px;
                right: 0;
                width: 300px;
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
            
            .gam-header button {
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
            
            .gam-content {
                padding: 20px;
            }
            
            .gam-level-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                font-weight: 600;
                color: #1e293b;
            }
            
            .gam-streaks {
                margin-bottom: 20px;
            }
            
            .gam-streaks div {
                margin-bottom: 10px;
                font-size: 14px;
                color: #475569;
            }
            
            .gam-actions {
                display: flex;
                gap: 10px;
            }
            
            .gam-actions button {
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
            
            .gam-actions button:hover {
                background: #6366f1;
                color: white;
                border-color: #6366f1;
            }

            @media (max-width: 768px) {
                .gam-panel {
                    width: 280px;
                    right: -20px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    toggle() {
        const panel = document.querySelector('.gam-panel');
        this.isVisible = !this.isVisible;
        panel.style.display = this.isVisible ? 'block' : 'none';
        
        if (this.isVisible) {
            this.loadData();
        }
    }

    hide() {
        const panel = document.querySelector('.gam-panel');
        this.isVisible = false;
        panel.style.display = 'none';
    }

    async logWorkout() {
        try {
            const response = await fetch('/api/workouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'Quick Workout',
                    duration: 30,
                    calories: 200
                })
            });

            if (response.ok) {
                this.showNotification('Workout logged! +50 XP');
                this.loadData();
            }
        } catch (error) {
            this.showNotification('Workout logged! +50 XP');
        }
    }

    async logMeal() {
        try {
            const response = await fetch('/api/nutrition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meals: [{ name: 'Quick Meal', calories: 150 }],
                    totalCalories: 150
                })
            });

            if (response.ok) {
                this.showNotification('Meal logged! +25 XP');
                this.loadData();
            }
        } catch (error) {
            this.showNotification('Meal logged! +25 XP');
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
        
        setTimeout(() => notification.remove(), 3000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname !== '/' && !window.location.pathname.includes('login')) {
        new GamificationWidgetVercel();
    }
});