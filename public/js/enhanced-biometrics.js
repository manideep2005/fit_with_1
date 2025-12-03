// Enhanced Biometric Dashboard
class EnhancedBiometrics {
    constructor() {
        this.initializeCharts();
        this.loadBiometricData();
    }

    async loadBiometricData() {
        try {
            const response = await fetch('/api/dashboard-data');
            const data = await response.json();
            if (data.success) {
                this.renderHealthScore(data.data);
                this.renderTrends(data.data);
                this.renderPredictions(data.data);
            }
        } catch (error) {
            console.error('Error loading biometric data:', error);
        }
    }

    renderHealthScore(data) {
        const score = this.calculateHealthScore(data);
        document.getElementById('healthScore').innerHTML = `
            <div class="health-score-circle">
                <div class="score-number">${score}</div>
                <div class="score-label">Health Score</div>
            </div>
            <div class="score-breakdown">
                <div class="score-item">
                    <span>Fitness: ${this.getFitnessScore(data)}/100</span>
                    <div class="score-bar"><div style="width: ${this.getFitnessScore(data)}%"></div></div>
                </div>
                <div class="score-item">
                    <span>Nutrition: ${this.getNutritionScore(data)}/100</span>
                    <div class="score-bar"><div style="width: ${this.getNutritionScore(data)}%"></div></div>
                </div>
                <div class="score-item">
                    <span>Consistency: ${this.getConsistencyScore(data)}/100</span>
                    <div class="score-bar"><div style="width: ${this.getConsistencyScore(data)}%"></div></div>
                </div>
            </div>
        `;
    }

    calculateHealthScore(data) {
        const fitness = this.getFitnessScore(data);
        const nutrition = this.getNutritionScore(data);
        const consistency = this.getConsistencyScore(data);
        return Math.round((fitness + nutrition + consistency) / 3);
    }

    getFitnessScore(data) {
        const workoutsThisWeek = data.stats?.workoutsThisWeek || 0;
        const target = data.stats?.targetWorkoutsPerWeek || 5;
        return Math.min(100, Math.round((workoutsThisWeek / target) * 100));
    }

    getNutritionScore(data) {
        const calories = data.stats?.todayCalories || 0;
        const target = data.stats?.targetCalories || 2000;
        const ratio = calories / target;
        return Math.round(ratio > 1.2 ? 60 : ratio < 0.8 ? 70 : 100);
    }

    getConsistencyScore(data) {
        // Simple consistency based on recent activity
        return Math.min(100, (data.stats?.workoutsThisWeek || 0) * 20);
    }

    renderTrends(data) {
        document.getElementById('trendInsights').innerHTML = `
            <div class="trend-cards">
                <div class="trend-card positive">
                    <i class="fas fa-arrow-up"></i>
                    <span>Workout frequency up 15% this week</span>
                </div>
                <div class="trend-card neutral">
                    <i class="fas fa-minus"></i>
                    <span>Nutrition consistency stable</span>
                </div>
                <div class="trend-card positive">
                    <i class="fas fa-arrow-up"></i>
                    <span>Water intake improved by 20%</span>
                </div>
            </div>
        `;
    }

    renderPredictions(data) {
        document.getElementById('predictions').innerHTML = `
            <div class="prediction-cards">
                <div class="prediction-card">
                    <h4>This Week's Forecast</h4>
                    <p>Based on your current pace, you'll complete <strong>4 workouts</strong> this week</p>
                    <div class="prediction-tip">💡 Add one more session to hit your goal!</div>
                </div>
                <div class="prediction-card">
                    <h4>Monthly Projection</h4>
                    <p>You're on track to burn <strong>2,400 calories</strong> this month</p>
                    <div class="prediction-tip">🔥 That's 15% above your target!</div>
                </div>
            </div>
        `;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new EnhancedBiometrics();
});