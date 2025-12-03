// Quick Action System
class QuickActions {
    constructor() {
        this.initializeQuickActions();
    }

    initializeQuickActions() {
        const quickActionsHTML = `
            <div class="quick-actions-panel">
                <h5><i class="fas fa-bolt"></i> Quick Actions</h5>
                <div class="quick-actions-grid">
                    <button class="quick-action-btn" onclick="quickActions.logWater()">
                        <i class="fas fa-tint"></i>
                        <span>+250ml Water</span>
                    </button>
                    <button class="quick-action-btn" onclick="quickActions.quickWorkout()">
                        <i class="fas fa-dumbbell"></i>
                        <span>5min Workout</span>
                    </button>
                    <button class="quick-action-btn" onclick="quickActions.logMeal()">
                        <i class="fas fa-utensils"></i>
                        <span>Log Meal</span>
                    </button>
                    <button class="quick-action-btn" onclick="quickActions.takeBreak()">
                        <i class="fas fa-pause"></i>
                        <span>Take Break</span>
                    </button>
                </div>
            </div>
        `;
        
        // Insert after dashboard header
        const dashboardHeader = document.querySelector('.dashboard-header');
        if (dashboardHeader) {
            dashboardHeader.insertAdjacentHTML('afterend', quickActionsHTML);
        }
    }

    async logWater() {
        try {
            const response = await fetch('/api/nutrition/log-water', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 250 })
            });
            
            const result = await response.json();
            if (result.success) {
                this.showToast('💧 Water logged! +250ml', 'success');
                this.updateWaterDisplay(result.data);
            }
        } catch (error) {
            this.showToast('Failed to log water', 'error');
        }
    }

    quickWorkout() {
        const workouts = [
            { name: '10 Push-ups', duration: 2 },
            { name: '30-sec Plank', duration: 1 },
            { name: '20 Jumping Jacks', duration: 1 },
            { name: '15 Squats', duration: 2 }
        ];
        
        const randomWorkout = workouts[Math.floor(Math.random() * workouts.length)];
        
        this.showWorkoutModal(randomWorkout);
    }

    showWorkoutModal(workout) {
        const modal = document.createElement('div');
        modal.className = 'quick-workout-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h4>Quick Workout Challenge!</h4>
                <div class="workout-challenge">
                    <i class="fas fa-dumbbell fa-3x"></i>
                    <h3>${workout.name}</h3>
                    <p>Estimated time: ${workout.duration} minutes</p>
                </div>
                <div class="modal-actions">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn btn-secondary">Skip</button>
                    <button onclick="quickActions.completeQuickWorkout('${workout.name}', ${workout.duration})" class="btn btn-primary">Done!</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async completeQuickWorkout(name, duration) {
        try {
            const response = await fetch('/api/workouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'Quick Exercise',
                    duration: duration,
                    calories: duration * 5,
                    exercises: [{ name: name }],
                    notes: 'Quick action workout'
                })
            });
            
            const result = await response.json();
            if (result.success) {
                this.showToast(`🎉 Great job! ${name} completed!`, 'success');
                document.querySelector('.quick-workout-modal')?.remove();
            }
        } catch (error) {
            this.showToast('Failed to log workout', 'error');
        }
    }

    logMeal() {
        const commonMeals = [
            { name: 'Apple', calories: 95 },
            { name: 'Banana', calories: 105 },
            { name: 'Greek Yogurt', calories: 130 },
            { name: 'Protein Bar', calories: 200 },
            { name: 'Green Salad', calories: 150 }
        ];
        
        const mealOptions = commonMeals.map(meal => 
            `<button onclick="quickActions.selectMeal('${meal.name}', ${meal.calories})" class="meal-option">
                ${meal.name} (${meal.calories} cal)
            </button>`
        ).join('');
        
        const modal = document.createElement('div');
        modal.className = 'quick-meal-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h4>Quick Meal Log</h4>
                <div class="meal-options">${mealOptions}</div>
                <button onclick="this.parentElement.parentElement.remove()" class="btn btn-secondary">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async selectMeal(name, calories) {
        try {
            const response = await fetch('/api/nutrition/quick-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ foodName: name, quantity: 1 })
            });
            
            const result = await response.json();
            if (result.success) {
                this.showToast(`🍎 ${name} logged!`, 'success');
                document.querySelector('.quick-meal-modal')?.remove();
            }
        } catch (error) {
            this.showToast('Failed to log meal', 'error');
        }
    }

    takeBreak() {
        const breakActivities = [
            'Take 5 deep breaths',
            'Stretch your neck and shoulders',
            'Look away from screen for 20 seconds',
            'Do 10 desk stretches',
            'Walk around for 2 minutes'
        ];
        
        const activity = breakActivities[Math.floor(Math.random() * breakActivities.length)];
        
        this.showToast(`🧘‍♀️ Break time: ${activity}`, 'info', 5000);
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.remove();
        }, duration);
    }

    updateWaterDisplay(data) {
        const waterElement = document.getElementById('todayWater');
        if (waterElement && data) {
            waterElement.textContent = `${data.totalWater}ml`;
        }
    }
}

// Initialize quick actions
const quickActions = new QuickActions();