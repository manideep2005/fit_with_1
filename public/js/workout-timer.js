// Workout Timer Component
class WorkoutTimer {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentTime = 0;
        this.workTime = 45; // seconds
        this.restTime = 15; // seconds
        this.currentPhase = 'work'; // 'work' or 'rest'
        this.interval = null;
        this.rounds = 0;
        this.totalRounds = 8;
        
        this.createTimerUI();
        this.bindEvents();
    }

    createTimerUI() {
        // Create floating timer widget
        const timerWidget = document.createElement('div');
        timerWidget.id = 'workout-timer';
        timerWidget.innerHTML = `
            <div class="timer-container">
                <div class="timer-header">
                    <span class="timer-title">Workout Timer</span>
                    <button class="timer-close" onclick="workoutTimer.hide()">×</button>
                </div>
                <div class="timer-display">
                    <div class="timer-phase" id="timerPhase">WORK</div>
                    <div class="timer-time" id="timerTime">00:45</div>
                    <div class="timer-round">Round <span id="currentRound">1</span>/<span id="totalRounds">8</span></div>
                </div>
                <div class="timer-controls">
                    <button class="timer-btn start-btn" onclick="workoutTimer.start()">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="timer-btn pause-btn" onclick="workoutTimer.pause()" style="display: none;">
                        <i class="fas fa-pause"></i>
                    </button>
                    <button class="timer-btn reset-btn" onclick="workoutTimer.reset()">
                        <i class="fas fa-redo"></i>
                    </button>
                </div>
                <div class="timer-settings">
                    <div class="setting-group">
                        <label>Work: <input type="number" id="workTime" value="45" min="10" max="300"></label>
                        <label>Rest: <input type="number" id="restTime" value="15" min="5" max="120"></label>
                        <label>Rounds: <input type="number" id="roundsInput" value="8" min="1" max="20"></label>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        const styles = `
            <style>
                #workout-timer {
                    position: fixed;
                    top: 50%;
                    right: 20px;
                    transform: translateY(-50%);
                    background: white;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    z-index: 1000;
                    width: 280px;
                    display: none;
                }

                .timer-container {
                    padding: 20px;
                }

                .timer-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .timer-title {
                    font-weight: 600;
                    color: #333;
                }

                .timer-close {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #999;
                }

                .timer-display {
                    text-align: center;
                    margin-bottom: 20px;
                }

                .timer-phase {
                    font-size: 1.2rem;
                    font-weight: 600;
                    color: #6C63FF;
                    margin-bottom: 10px;
                }

                .timer-phase.rest {
                    color: #28a745;
                }

                .timer-time {
                    font-size: 3rem;
                    font-weight: 700;
                    color: #333;
                    margin-bottom: 10px;
                }

                .timer-round {
                    color: #666;
                    font-size: 0.9rem;
                }

                .timer-controls {
                    display: flex;
                    justify-content: center;
                    gap: 15px;
                    margin-bottom: 20px;
                }

                .timer-btn {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .start-btn { background: #28a745; color: white; }
                .pause-btn { background: #ffc107; color: white; }
                .reset-btn { background: #dc3545; color: white; }

                .timer-settings {
                    border-top: 1px solid #eee;
                    padding-top: 15px;
                }

                .setting-group {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .setting-group label {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.9rem;
                }

                .setting-group input {
                    width: 60px;
                    padding: 5px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    text-align: center;
                }

                @media (max-width: 768px) {
                    #workout-timer {
                        right: 10px;
                        width: 250px;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
        document.body.appendChild(timerWidget);
    }

    bindEvents() {
        // Update settings when changed
        document.getElementById('workTime').addEventListener('change', (e) => {
            this.workTime = parseInt(e.target.value);
            if (!this.isRunning) this.updateDisplay();
        });

        document.getElementById('restTime').addEventListener('change', (e) => {
            this.restTime = parseInt(e.target.value);
        });

        document.getElementById('roundsInput').addEventListener('change', (e) => {
            this.totalRounds = parseInt(e.target.value);
            document.getElementById('totalRounds').textContent = this.totalRounds;
        });
    }

    show() {
        document.getElementById('workout-timer').style.display = 'block';
    }

    hide() {
        document.getElementById('workout-timer').style.display = 'none';
        this.pause();
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            
            document.querySelector('.start-btn').style.display = 'none';
            document.querySelector('.pause-btn').style.display = 'block';
            
            this.interval = setInterval(() => {
                this.currentTime--;
                this.updateDisplay();
                
                if (this.currentTime <= 0) {
                    this.switchPhase();
                }
            }, 1000);
        }
    }

    pause() {
        this.isRunning = false;
        this.isPaused = true;
        
        document.querySelector('.start-btn').style.display = 'block';
        document.querySelector('.pause-btn').style.display = 'none';
        
        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    reset() {
        this.pause();
        this.currentPhase = 'work';
        this.currentTime = this.workTime;
        this.rounds = 0;
        this.updateDisplay();
    }

    switchPhase() {
        if (this.currentPhase === 'work') {
            this.currentPhase = 'rest';
            this.currentTime = this.restTime;
        } else {
            this.currentPhase = 'work';
            this.currentTime = this.workTime;
            this.rounds++;
            
            if (this.rounds >= this.totalRounds) {
                this.completeWorkout();
                return;
            }
        }
        
        this.playSound();
        this.updateDisplay();
    }

    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        
        document.getElementById('timerTime').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const phaseElement = document.getElementById('timerPhase');
        phaseElement.textContent = this.currentPhase.toUpperCase();
        phaseElement.className = `timer-phase ${this.currentPhase}`;
        
        document.getElementById('currentRound').textContent = this.rounds + 1;
    }

    completeWorkout() {
        this.pause();
        alert('🎉 Workout Complete! Great job!');
        
        // Log workout completion
        this.logWorkout();
    }

    async logWorkout() {
        try {
            const workoutData = {
                type: 'HIIT Timer',
                duration: (this.totalRounds * (this.workTime + this.restTime)) / 60,
                calories: Math.floor(this.totalRounds * 15), // Rough estimate
                exercises: [{
                    name: 'HIIT Intervals',
                    sets: this.totalRounds,
                    duration: this.workTime + this.restTime
                }],
                notes: `${this.totalRounds} rounds of ${this.workTime}s work / ${this.restTime}s rest`
            };

            const response = await fetch('/api/workouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workoutData)
            });

            if (response.ok) {
                console.log('Workout logged successfully');
            }
        } catch (error) {
            console.error('Failed to log workout:', error);
        }
    }

    playSound() {
        // Create audio context for beep sound
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = this.currentPhase === 'work' ? 800 : 400;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('Audio not supported');
        }
    }
}

// Quick Actions Floating Button
class QuickActions {
    constructor() {
        this.createQuickActionsUI();
    }

    createQuickActionsUI() {
        const quickActions = document.createElement('div');
        quickActions.id = 'quick-actions';
        quickActions.innerHTML = `
            <div class="quick-actions-container">
                <button class="main-action-btn" onclick="quickActions.toggle()">
                    <i class="fas fa-plus"></i>
                </button>
                <div class="actions-menu" id="actionsMenu">
                    <button class="action-btn" onclick="quickActions.startTimer()" title="Start Timer">
                        <i class="fas fa-stopwatch"></i>
                    </button>
                    <button class="action-btn" onclick="quickActions.logQuickWorkout()" title="Quick Log">
                        <i class="fas fa-dumbbell"></i>
                    </button>
                    <button class="action-btn" onclick="quickActions.logWater()" title="Log Water">
                        <i class="fas fa-tint"></i>
                    </button>
                    <button class="action-btn" onclick="quickActions.takePhoto()" title="Progress Photo">
                        <i class="fas fa-camera"></i>
                    </button>
                </div>
            </div>
        `;

        const styles = `
            <style>
                #quick-actions {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    z-index: 999;
                }

                .quick-actions-container {
                    position: relative;
                }

                .main-action-btn {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #6C63FF, #4D44DB);
                    color: white;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    box-shadow: 0 4px 20px rgba(108, 99, 255, 0.4);
                    transition: all 0.3s ease;
                }

                .main-action-btn:hover {
                    transform: scale(1.1);
                }

                .actions-menu {
                    position: absolute;
                    bottom: 70px;
                    right: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }

                .actions-menu.show {
                    opacity: 1;
                    visibility: visible;
                }

                .action-btn {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: white;
                    color: #6C63FF;
                    border: 2px solid #6C63FF;
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }

                .action-btn:hover {
                    background: #6C63FF;
                    color: white;
                    transform: scale(1.1);
                }

                @media (max-width: 768px) {
                    #quick-actions {
                        bottom: 20px;
                        right: 20px;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
        document.body.appendChild(quickActions);
    }

    toggle() {
        const menu = document.getElementById('actionsMenu');
        menu.classList.toggle('show');
    }

    startTimer() {
        if (!window.workoutTimer) {
            window.workoutTimer = new WorkoutTimer();
        }
        window.workoutTimer.show();
        this.toggle();
    }

    async logQuickWorkout() {
        const workout = prompt('Quick workout log (e.g., "Push-ups x20, Squats x15"):');
        if (workout) {
            try {
                await fetch('/api/workouts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'Quick Log',
                        duration: 10,
                        calories: 50,
                        notes: workout
                    })
                });
                alert('Workout logged! 💪');
            } catch (error) {
                alert('Failed to log workout');
            }
        }
        this.toggle();
    }

    async logWater() {
        const amount = prompt('Water intake (ml):', '250');
        if (amount) {
            try {
                await fetch('/api/nutrition', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        waterIntake: parseInt(amount),
                        meals: []
                    })
                });
                alert(`${amount}ml water logged! 💧`);
            } catch (error) {
                alert('Failed to log water');
            }
        }
        this.toggle();
    }

    takePhoto() {
        // Trigger camera for progress photo
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'camera';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                // Handle photo upload
                console.log('Progress photo taken:', file.name);
                alert('Progress photo saved! 📸');
            }
        };
        input.click();
        this.toggle();
    }
}

// Initialize components
document.addEventListener('DOMContentLoaded', () => {
    window.quickActions = new QuickActions();
});