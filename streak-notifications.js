// Streak notification system with celebratory toasts

// Add streak notification function to nutrition page
function showStreakNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'streak-notification';
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-size: 2rem; animation: bounce 0.6s ease-in-out infinite alternate;">🔥</div>
            <div>
                <div style="font-weight: 600; font-size: 1.1rem;">Streak Milestone!</div>
                <div style="font-size: 0.9rem; opacity: 0.9;">${message}</div>
            </div>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.8);
        padding: 20px 25px; border-radius: 15px; color: white; z-index: 10001;
        background: linear-gradient(135deg, #FF6B6B, #FF8E53);
        box-shadow: 0 10px 30px rgba(255, 107, 107, 0.3);
        border: 2px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    
    // Add bounce animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes bounce {
            from { transform: translateY(0px); }
            to { transform: translateY(-10px); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.style.transform = 'translate(-50%, -50%) scale(0.8)';
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 400);
    }, 4000);
}

// Update quick log function to show streak notifications
async function quickLogWithStreak(foodName) {
    try {
        const response = await fetch('/api/nutrition/quick-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ foodName: foodName, quantity: 1 })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`${foodName} logged successfully!`, 'success');
            
            // Show streak milestone notification if achieved
            if (data.streakMilestone) {
                setTimeout(() => {
                    showStreakNotification(data.streakMilestone.message);
                }, 1000);
            }
            
            // Refresh all nutrition data
            loadNutritionData();
            loadTodaysMeals();
            loadAIInsights();
        } else {
            showNotification(data.error || 'Failed to log food', 'error');
        }
    } catch (error) {
        console.error('Quick log error:', error);
        showNotification('Failed to log food - please try again', 'error');
    }
}

// Update water logging to show streak notifications
async function addWaterWithStreak(amount) {
    try {
        const response = await fetch('/api/nutrition/log-water', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update display with real data from backend
            currentWaterIntake = data.data.totalWater;
            waterGoal = data.data.waterGoal;
            updateWaterDisplay();
            
            // Show success notification
            showNotification(data.message + ' 💧', 'success');
            
            // Check if goal reached
            if (data.data.percentage >= 100) {
                showNotification('🎉 Daily water goal achieved!', 'success');
            }
            
            // Show streak milestone notification if achieved
            if (data.streakMilestone) {
                setTimeout(() => {
                    showStreakNotification(data.streakMilestone.message);
                }, 1500);
            }
            
            // Refresh nutrition data
            loadNutritionData();
        } else {
            showNotification('Failed to log water: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error logging water:', error);
        showNotification('Failed to log water intake', 'error');
    }
}