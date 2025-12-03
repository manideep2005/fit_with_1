/**
 * Enhanced Features Frontend Integration
 * JavaScript for the 6 key enhanced features
 */

class EnhancedFeaturesManager {
    constructor() {
        this.aiFormChecker = new AIFormChecker();
        this.smartNotifications = new SmartNotifications();
        this.socialChallenges = new SocialChallenges();
        this.progressPredictions = new ProgressPredictions();
        this.voiceCommands = new VoiceCommands();
        this.buddyFinder = new BuddyFinder();
        
        this.init();
    }

    init() {
        console.log('🚀 Enhanced Features Manager initialized');
        this.setupEventListeners();
        this.loadUserPreferences();
    }

    setupEventListeners() {
        // Global event listeners for enhanced features
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeFeatures();
        });
    }

    async initializeFeatures() {
        try {
            // Initialize all features
            await Promise.all([
                this.aiFormChecker.initialize(),
                this.smartNotifications.initialize(),
                this.socialChallenges.initialize(),
                this.progressPredictions.initialize(),
                this.voiceCommands.initialize(),
                this.buddyFinder.initialize()
            ]);
            
            console.log('✅ All enhanced features initialized');
        } catch (error) {
            console.error('❌ Feature initialization error:', error);
        }
    }

    loadUserPreferences() {
        // Load user preferences for enhanced features
        const preferences = localStorage.getItem('enhancedFeaturesPrefs');
        if (preferences) {
            const prefs = JSON.parse(preferences);
            this.applyPreferences(prefs);
        }
    }

    applyPreferences(prefs) {
        // Apply user preferences to each feature
        Object.keys(prefs).forEach(feature => {
            if (this[feature] && this[feature].applyPreferences) {
                this[feature].applyPreferences(prefs[feature]);
            }
        });
    }
}

// 1. AI Form Checker Class
class AIFormChecker {
    constructor() {
        this.isActive = false;
        this.currentSession = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.stream = null;
    }

    async initialize() {
        console.log('🎯 Initializing AI Form Checker...');
        
        try {
            const response = await fetch('/api/enhanced/form-checker/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            console.log('AI Form Checker status:', result);
            
            return result;
        } catch (error) {
            console.error('AI Form Checker init error:', error);
            return { success: false, error: error.message };
        }
    }

    async startFormAnalysis(exerciseType) {
        try {
            // Setup camera
            await this.setupCamera();
            
            const response = await fetch('/api/enhanced/form-checker/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exerciseType })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentSession = result.sessionId;
                this.isActive = true;
                this.startFrameAnalysis();
                
                this.showFormFeedback({
                    title: `${result.exercise} Form Analysis Started`,
                    message: 'Position yourself in front of the camera and begin your exercise.',
                    type: 'info'
                });
            }
            
            return result;
        } catch (error) {
            console.error('Start form analysis error:', error);
            return { success: false, error: error.message };
        }
    }

    async setupCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
            });
            
            this.videoElement = document.getElementById('formAnalysisVideo') || this.createVideoElement();
            this.videoElement.srcObject = this.stream;
            
            this.canvasElement = document.getElementById('formAnalysisCanvas') || this.createCanvasElement();
            
            return true;
        } catch (error) {
            console.error('Camera setup error:', error);
            throw new Error('Camera access required for form analysis');
        }
    }

    createVideoElement() {
        const video = document.createElement('video');
        video.id = 'formAnalysisVideo';
        video.autoplay = true;
        video.muted = true;
        video.style.display = 'none';
        document.body.appendChild(video);
        return video;
    }

    createCanvasElement() {
        const canvas = document.createElement('canvas');
        canvas.id = 'formAnalysisCanvas';
        canvas.width = 640;
        canvas.height = 480;
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
        return canvas;
    }

    startFrameAnalysis() {
        if (!this.isActive) return;
        
        const analyzeFrame = async () => {
            if (!this.isActive || !this.currentSession) return;
            
            try {
                const frameData = this.captureFrame();
                
                const response = await fetch('/api/enhanced/form-checker/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: this.currentSession,
                        frameData: frameData
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.processFormFeedback(result.analysis);
                }
                
                // Continue analysis
                setTimeout(analyzeFrame, 500); // Analyze every 500ms
            } catch (error) {
                console.error('Frame analysis error:', error);
            }
        };
        
        analyzeFrame();
    }

    captureFrame() {
        if (!this.videoElement || !this.canvasElement) return null;
        
        const ctx = this.canvasElement.getContext('2d');
        ctx.drawImage(this.videoElement, 0, 0, 640, 480);
        
        return this.canvasElement.toDataURL('image/jpeg', 0.8);
    }

    processFormFeedback(analysis) {
        // Update UI with form feedback
        this.updateFormScore(analysis.formScore, analysis.formGrade);
        
        if (analysis.corrections && analysis.corrections.length > 0) {
            this.showFormCorrections(analysis.corrections);
        }
        
        if (analysis.repCompleted) {
            this.showRepCompletion(analysis.repCount);
        }
        
        if (analysis.encouragement) {
            this.showEncouragement(analysis.encouragement);
        }
    }

    updateFormScore(score, grade) {
        const scoreElement = document.getElementById('formScore');
        if (scoreElement) {
            scoreElement.textContent = `${score}% (${grade})`;
            scoreElement.className = `form-score grade-${grade.toLowerCase()}`;
        }
    }

    showFormCorrections(corrections) {
        const correctionsContainer = document.getElementById('formCorrections');
        if (!correctionsContainer) return;
        
        correctionsContainer.innerHTML = '';
        
        corrections.forEach(correction => {
            const correctionElement = document.createElement('div');
            correctionElement.className = `correction severity-${correction.severity}`;
            correctionElement.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span>${correction.message}</span>
            `;
            correctionsContainer.appendChild(correctionElement);
        });
    }

    showRepCompletion(repCount) {
        this.showFormFeedback({
            title: 'Rep Completed!',
            message: `Great job! That's ${repCount} reps.`,
            type: 'success',
            duration: 2000
        });
    }

    showEncouragement(message) {
        const encouragementElement = document.getElementById('encouragementMessage');
        if (encouragementElement) {
            encouragementElement.textContent = message;
            encouragementElement.style.display = 'block';
            
            setTimeout(() => {
                encouragementElement.style.display = 'none';
            }, 3000);
        }
    }

    showFormFeedback({ title, message, type, duration = 5000 }) {
        // Create or update feedback notification
        let feedbackElement = document.getElementById('formFeedback');
        
        if (!feedbackElement) {
            feedbackElement = document.createElement('div');
            feedbackElement.id = 'formFeedback';
            feedbackElement.className = 'form-feedback';
            document.body.appendChild(feedbackElement);
        }
        
        feedbackElement.className = `form-feedback ${type}`;
        feedbackElement.innerHTML = `
            <div class="feedback-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;
        
        feedbackElement.style.display = 'block';
        
        setTimeout(() => {
            feedbackElement.style.display = 'none';
        }, duration);
    }

    async endFormAnalysis() {
        try {
            if (!this.currentSession) return;
            
            this.isActive = false;
            
            const response = await fetch('/api/enhanced/form-checker/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: this.currentSession })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSessionSummary(result.summary);
            }
            
            // Cleanup
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            
            this.currentSession = null;
            
            return result;
        } catch (error) {
            console.error('End form analysis error:', error);
            return { success: false, error: error.message };
        }
    }

    showSessionSummary(summary) {
        const modal = document.createElement('div');
        modal.className = 'form-summary-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Workout Form Summary</h3>
                <div class="summary-stats">
                    <div class="stat">
                        <span class="label">Exercise:</span>
                        <span class="value">${summary.exercise}</span>
                    </div>
                    <div class="stat">
                        <span class="label">Duration:</span>
                        <span class="value">${summary.duration} seconds</span>
                    </div>
                    <div class="stat">
                        <span class="label">Reps:</span>
                        <span class="value">${summary.repCount}</span>
                    </div>
                    <div class="stat">
                        <span class="label">Average Form Score:</span>
                        <span class="value">${summary.avgFormScore}% (${summary.formGrade})</span>
                    </div>
                </div>
                
                ${summary.improvements.length > 0 ? `
                    <div class="improvements">
                        <h4>Areas for Improvement:</h4>
                        <ul>
                            ${summary.improvements.map(improvement => `<li>${improvement}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${summary.nextSteps.length > 0 ? `
                    <div class="next-steps">
                        <h4>Next Steps:</h4>
                        <ul>
                            ${summary.nextSteps.map(step => `<li>${step}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <button onclick="this.parentElement.parentElement.remove()" class="btn btn-primary">
                    Close
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
}

// 2. Smart Notifications Class
class SmartNotifications {
    constructor() {
        this.isRegistered = false;
        this.preferences = {};
        this.notificationHistory = [];
    }

    async initialize() {
        console.log('🔔 Initializing Smart Notifications...');
        
        try {
            // Request notification permission
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                console.log('Notification permission:', permission);
            }
            
            // Register for smart notifications
            await this.register();
            
            return { success: true };
        } catch (error) {
            console.error('Smart Notifications init error:', error);
            return { success: false, error: error.message };
        }
    }

    async register(preferences = {}) {
        try {
            const response = await fetch('/api/enhanced/smart-notifications/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(preferences)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.isRegistered = true;
                this.preferences = preferences;
            }
            
            return result;
        } catch (error) {
            console.error('Smart notifications register error:', error);
            return { success: false, error: error.message };
        }
    }

    async sendNotification(type, data) {
        try {
            const response = await fetch('/api/enhanced/smart-notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, data })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Send notification error:', error);
            return { success: false, error: error.message };
        }
    }

    async updatePreferences(newPreferences) {
        try {
            const response = await fetch('/api/enhanced/smart-notifications/preferences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPreferences)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.preferences = { ...this.preferences, ...newPreferences };
            }
            
            return result;
        } catch (error) {
            console.error('Update preferences error:', error);
            return { success: false, error: error.message };
        }
    }

    async getHistory(limit = 20) {
        try {
            const response = await fetch(`/api/enhanced/smart-notifications/history?limit=${limit}`);
            const result = await response.json();
            
            if (result.success) {
                this.notificationHistory = result.history;
            }
            
            return result;
        } catch (error) {
            console.error('Get notification history error:', error);
            return { success: false, error: error.message };
        }
    }

    showBrowserNotification(title, body, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                ...options
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            return notification;
        }
    }
}

// 3. Social Challenges Class
class SocialChallenges {
    constructor() {
        this.activeChallenges = [];
        this.userStats = {};
    }

    async initialize() {
        console.log('🏆 Initializing Social Challenges...');
        
        try {
            await this.loadActiveChallenges();
            await this.loadUserStats();
            
            return { success: true };
        } catch (error) {
            console.error('Social Challenges init error:', error);
            return { success: false, error: error.message };
        }
    }

    async createChallenge(challengeData) {
        try {
            const response = await fetch('/api/enhanced/social-challenges/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(challengeData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Create challenge error:', error);
            return { success: false, error: error.message };
        }
    }

    async joinChallenge(challengeId, teamId = null) {
        try {
            const response = await fetch(`/api/enhanced/social-challenges/${challengeId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId })
            });
            
            const result = await response.json();
            
            if (result.success) {
                await this.loadActiveChallenges(); // Refresh challenges
            }
            
            return result;
        } catch (error) {
            console.error('Join challenge error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateProgress(challengeId, metrics) {
        try {
            const response = await fetch(`/api/enhanced/social-challenges/${challengeId}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metrics)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Update progress error:', error);
            return { success: false, error: error.message };
        }
    }

    async loadActiveChallenges(filters = {}) {
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const response = await fetch(`/api/enhanced/social-challenges/active?${queryParams}`);
            const result = await response.json();
            
            if (result.success) {
                this.activeChallenges = result.challenges;
            }
            
            return result;
        } catch (error) {
            console.error('Load active challenges error:', error);
            return { success: false, error: error.message };
        }
    }

    async getLeaderboard(challengeId, limit = 50) {
        try {
            const response = await fetch(`/api/enhanced/social-challenges/${challengeId}/leaderboard?limit=${limit}`);
            return await response.json();
        } catch (error) {
            console.error('Get leaderboard error:', error);
            return { success: false, error: error.message };
        }
    }

    async loadUserStats() {
        try {
            const response = await fetch('/api/enhanced/social-challenges/stats');
            const result = await response.json();
            
            if (result.success) {
                this.userStats = result.stats;
            }
            
            return result;
        } catch (error) {
            console.error('Load user stats error:', error);
            return { success: false, error: error.message };
        }
    }

    displayChallenges(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = this.activeChallenges.map(challenge => `
            <div class="challenge-card" data-challenge-id="${challenge.id}">
                <div class="challenge-header">
                    <h3>${challenge.name}</h3>
                    <span class="challenge-type">${challenge.type}</span>
                </div>
                <p class="challenge-description">${challenge.description}</p>
                <div class="challenge-stats">
                    <span class="participants">${challenge.participantCount} participants</span>
                    <span class="duration">${this.formatDuration(challenge.endDate - challenge.startDate)}</span>
                </div>
                <div class="challenge-actions">
                    <button onclick="socialChallenges.joinChallenge('${challenge.id}')" class="btn btn-primary">
                        Join Challenge
                    </button>
                    <button onclick="socialChallenges.viewDetails('${challenge.id}')" class="btn btn-secondary">
                        View Details
                    </button>
                </div>
            </div>
        `).join('');
    }

    formatDuration(milliseconds) {
        const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
        return `${days} days`;
    }

    viewDetails(challengeId) {
        // Implementation for viewing challenge details
        console.log('Viewing challenge details:', challengeId);
    }
}

// 4. Progress Predictions Class
class ProgressPredictions {
    constructor() {
        this.predictions = {};
        this.isLoading = false;
    }

    async initialize() {
        console.log('📈 Initializing Progress Predictions...');
        return { success: true };
    }

    async getWeightLossPrediction(userProfile, goalData) {
        try {
            this.isLoading = true;
            
            const response = await fetch('/api/enhanced/predictions/weight-loss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userProfile, goalData })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.predictions.weightLoss = result.prediction;
            }
            
            this.isLoading = false;
            return result;
        } catch (error) {
            this.isLoading = false;
            console.error('Weight loss prediction error:', error);
            return { success: false, error: error.message };
        }
    }

    async getPerformancePrediction(userProfile, workoutHistory) {
        try {
            this.isLoading = true;
            
            const response = await fetch('/api/enhanced/predictions/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userProfile, workoutHistory })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.predictions.performance = result.prediction;
            }
            
            this.isLoading = false;
            return result;
        } catch (error) {
            this.isLoading = false;
            console.error('Performance prediction error:', error);
            return { success: false, error: error.message };
        }
    }

    async getComprehensivePredictions(userProfile, fitnessData) {
        try {
            this.isLoading = true;
            
            const response = await fetch('/api/enhanced/predictions/comprehensive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userProfile, fitnessData })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.predictions = { ...this.predictions, ...result.predictions };
            }
            
            this.isLoading = false;
            return result;
        } catch (error) {
            this.isLoading = false;
            console.error('Comprehensive predictions error:', error);
            return { success: false, error: error.message };
        }
    }

    displayPredictions(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (this.isLoading) {
            container.innerHTML = '<div class="loading">Generating predictions...</div>';
            return;
        }
        
        let html = '<div class="predictions-container">';
        
        if (this.predictions.weightLoss) {
            html += this.renderWeightLossPrediction(this.predictions.weightLoss);
        }
        
        if (this.predictions.performance) {
            html += this.renderPerformancePrediction(this.predictions.performance);
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    renderWeightLossPrediction(prediction) {
        return `
            <div class="prediction-card weight-loss">
                <h3>Weight Loss Prediction</h3>
                <div class="prediction-stats">
                    <div class="stat">
                        <span class="label">Current Weight:</span>
                        <span class="value">${prediction.currentWeight} kg</span>
                    </div>
                    <div class="stat">
                        <span class="label">Predicted Final Weight:</span>
                        <span class="value">${prediction.predictedFinalWeight} kg</span>
                    </div>
                    <div class="stat">
                        <span class="label">Total Loss:</span>
                        <span class="value">${prediction.totalWeightLoss} kg</span>
                    </div>
                    <div class="stat">
                        <span class="label">Weekly Loss:</span>
                        <span class="value">${prediction.weeklyWeightLoss} kg/week</span>
                    </div>
                    <div class="stat">
                        <span class="label">Confidence:</span>
                        <span class="value">${Math.round(prediction.confidence * 100)}%</span>
                    </div>
                </div>
                
                ${prediction.milestones ? `
                    <div class="milestones">
                        <h4>Milestones:</h4>
                        <ul>
                            ${prediction.milestones.map(milestone => `
                                <li>Week ${milestone.week}: ${milestone.weight} kg (${milestone.progress}%)</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${prediction.recommendations ? `
                    <div class="recommendations">
                        <h4>Recommendations:</h4>
                        <ul>
                            ${prediction.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderPerformancePrediction(prediction) {
        return `
            <div class="prediction-card performance">
                <h3>Performance Prediction</h3>
                <div class="prediction-stats">
                    <div class="stat">
                        <span class="label">Current Level:</span>
                        <span class="value">${prediction.currentPerformanceLevel}</span>
                    </div>
                    <div class="stat">
                        <span class="label">Predicted Improvement:</span>
                        <span class="value">+${prediction.improvementPercentage}%</span>
                    </div>
                    <div class="stat">
                        <span class="label">Timeline:</span>
                        <span class="value">${prediction.timelineWeeks} weeks</span>
                    </div>
                    <div class="stat">
                        <span class="label">Confidence:</span>
                        <span class="value">${Math.round(prediction.confidence * 100)}%</span>
                    </div>
                </div>
                
                ${prediction.milestones ? `
                    <div class="milestones">
                        <h4>Performance Milestones:</h4>
                        <ul>
                            ${prediction.milestones.map(milestone => `
                                <li>Week ${milestone.week}: Level ${milestone.performanceLevel} (+${milestone.improvement})</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

// 5. Voice Commands Class
class VoiceCommands {
    constructor() {
        this.isActive = false;
        this.currentSession = null;
        this.recognition = null;
        this.isListening = false;
    }

    async initialize() {
        console.log('🎤 Initializing Voice Commands...');
        
        try {
            // Check for speech recognition support
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();
                
                this.recognition.continuous = true;
                this.recognition.interimResults = false;
                this.recognition.lang = 'en-US';
                
                this.setupRecognitionEvents();
                
                console.log('✅ Speech recognition initialized');
                return { success: true };
            } else {
                console.log('⚠️ Speech recognition not supported');
                return { success: false, error: 'Speech recognition not supported' };
            }
        } catch (error) {
            console.error('Voice Commands init error:', error);
            return { success: false, error: error.message };
        }
    }

    setupRecognitionEvents() {
        this.recognition.onresult = (event) => {
            const lastResult = event.results[event.results.length - 1];
            if (lastResult.isFinal) {
                const transcript = lastResult[0].transcript.trim();
                this.processVoiceCommand(transcript);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
        };

        this.recognition.onend = () => {
            if (this.isActive && this.isListening) {
                // Restart recognition if still active
                setTimeout(() => {
                    if (this.isActive) {
                        this.recognition.start();
                    }
                }, 100);
            }
        };
    }

    async startVoiceSession(workoutType = 'general') {
        try {
            const response = await fetch('/api/enhanced/voice/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workoutType })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentSession = result.sessionId;
                this.isActive = true;
                this.startListening();
                
                this.showVoiceStatus('Voice commands activated. Say "help" for available commands.');
            }
            
            return result;
        } catch (error) {
            console.error('Start voice session error:', error);
            return { success: false, error: error.message };
        }
    }

    startListening() {
        if (this.recognition && !this.isListening) {
            this.isListening = true;
            this.recognition.start();
            this.updateVoiceIndicator(true);
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.isListening = false;
            this.recognition.stop();
            this.updateVoiceIndicator(false);
        }
    }

    async processVoiceCommand(transcript) {
        try {
            console.log('🎤 Voice command:', transcript);
            
            const response = await fetch('/api/enhanced/voice/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audioData: null, // Using transcript instead
                    sessionId: this.currentSession,
                    transcript: transcript
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.handleVoiceResponse(result.response);
            }
            
            return result;
        } catch (error) {
            console.error('Process voice command error:', error);
            return { success: false, error: error.message };
        }
    }

    handleVoiceResponse(response) {
        // Display text response
        this.showVoiceResponse(response.text);
        
        // Handle specific actions
        if (response.action) {
            this.handleVoiceAction(response.action, response);
        }
        
        // Speak response if available
        if (response.audio) {
            this.playAudioResponse(response.audio);
        } else {
            this.speakText(response.text);
        }
    }

    handleVoiceAction(action, response) {
        switch (action) {
            case 'start_exercise':
                this.showExerciseStart(response.exercise);
                break;
            case 'pause_workout':
                this.showWorkoutPaused();
                break;
            case 'resume_workout':
                this.showWorkoutResumed();
                break;
            case 'next_exercise':
                this.showNextExercise(response.exercise);
                break;
            case 'count_rep':
                this.showRepCount(response.repCount);
                break;
            case 'start_timer':
                this.startTimer(response.duration);
                break;
            case 'log_water':
                this.showWaterLogged(response.amount);
                break;
            case 'motivation':
                this.showMotivation();
                break;
        }
    }

    showVoiceStatus(message) {
        const statusElement = document.getElementById('voiceStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.style.display = 'block';
        }
    }

    showVoiceResponse(text) {
        const responseElement = document.getElementById('voiceResponse');
        if (responseElement) {
            responseElement.textContent = text;
            responseElement.style.display = 'block';
            
            setTimeout(() => {
                responseElement.style.display = 'none';
            }, 5000);
        }
    }

    updateVoiceIndicator(isListening) {
        const indicator = document.getElementById('voiceIndicator');
        if (indicator) {
            indicator.className = isListening ? 'voice-indicator listening' : 'voice-indicator';
        }
    }

    speakText(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            speechSynthesis.speak(utterance);
        }
    }

    playAudioResponse(audioData) {
        // Play audio response from server
        const audio = new Audio();
        audio.src = `data:audio/mp3;base64,${audioData}`;
        audio.play().catch(error => {
            console.error('Audio playback error:', error);
        });
    }

    showExerciseStart(exercise) {
        console.log(`🏋️ Starting exercise: ${exercise}`);
    }

    showWorkoutPaused() {
        console.log('⏸️ Workout paused');
    }

    showWorkoutResumed() {
        console.log('▶️ Workout resumed');
    }

    showNextExercise(exercise) {
        console.log(`➡️ Next exercise: ${exercise}`);
    }

    showRepCount(count) {
        console.log(`🔢 Rep count: ${count}`);
    }

    startTimer(duration) {
        console.log(`⏱️ Timer started: ${duration} seconds`);
        // Implementation for visual timer
    }

    showWaterLogged(amount) {
        console.log(`💧 Water logged: ${amount}ml`);
    }

    showMotivation() {
        console.log('💪 Motivation boost!');
    }

    async endVoiceSession() {
        try {
            this.isActive = false;
            this.stopListening();
            
            const response = await fetch('/api/enhanced/voice/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSessionSummary(result.summary);
            }
            
            this.currentSession = null;
            
            return result;
        } catch (error) {
            console.error('End voice session error:', error);
            return { success: false, error: error.message };
        }
    }

    showSessionSummary(summary) {
        console.log('🎤 Voice session summary:', summary);
    }
}

// 6. Buddy Finder Class
class BuddyFinder {
    constructor() {
        this.userProfile = null;
        this.matches = [];
        this.nearbyBuddies = [];
    }

    async initialize() {
        console.log('👥 Initializing Buddy Finder...');
        return { success: true };
    }

    async createProfile(profileData) {
        try {
            const response = await fetch('/api/enhanced/buddy-finder/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.userProfile = result.profile;
            }
            
            return result;
        } catch (error) {
            console.error('Create buddy profile error:', error);
            return { success: false, error: error.message };
        }
    }

    async searchBuddies(searchCriteria = {}) {
        try {
            const response = await fetch('/api/enhanced/buddy-finder/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchCriteria)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.matches = result.matches;
            }
            
            return result;
        } catch (error) {
            console.error('Search buddies error:', error);
            return { success: false, error: error.message };
        }
    }

    async findNearbyBuddies(coordinates, radius = 5) {
        try {
            const response = await fetch('/api/enhanced/buddy-finder/nearby', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coordinates, radius })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.nearbyBuddies = result.nearbyBuddies;
            }
            
            return result;
        } catch (error) {
            console.error('Find nearby buddies error:', error);
            return { success: false, error: error.message };
        }
    }

    async sendMeetupRequest(toUserId, requestData) {
        try {
            const response = await fetch('/api/enhanced/buddy-finder/meetup/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toUserId, requestData })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Send meetup request error:', error);
            return { success: false, error: error.message };
        }
    }

    async getMatches(limit = 10) {
        try {
            const response = await fetch(`/api/enhanced/buddy-finder/matches?limit=${limit}`);
            const result = await response.json();
            
            if (result.success) {
                this.matches = result.matches;
            }
            
            return result;
        } catch (error) {
            console.error('Get matches error:', error);
            return { success: false, error: error.message };
        }
    }

    displayMatches(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = this.matches.map(match => `
            <div class="buddy-card" data-user-id="${match.profile.userId}">
                <div class="buddy-photo">
                    <img src="${match.profile.profilePhoto || '/images/default-avatar.png'}" alt="${match.profile.displayName}">
                    ${match.profile.verified ? '<span class="verified-badge">✓</span>' : ''}
                </div>
                <div class="buddy-info">
                    <h3>${match.profile.displayName}</h3>
                    <p class="buddy-location">${match.profile.city}, ${match.profile.state}</p>
                    <p class="buddy-fitness">${match.profile.fitnessLevel} • ${match.profile.activities.join(', ')}</p>
                    <div class="compatibility-score">
                        <span class="score">${Math.round(match.compatibilityScore * 100)}% match</span>
                        <div class="distance">${match.distance}km away</div>
                    </div>
                    <div class="match-reasons">
                        ${match.matchReasons.map(reason => `<span class="reason-tag">${reason}</span>`).join('')}
                    </div>
                </div>
                <div class="buddy-actions">
                    <button onclick="buddyFinder.sendMeetupRequest('${match.profile.userId}', {})" class="btn btn-primary">
                        Send Request
                    </button>
                    <button onclick="buddyFinder.viewProfile('${match.profile.userId}')" class="btn btn-secondary">
                        View Profile
                    </button>
                </div>
            </div>
        `).join('');
    }

    viewProfile(userId) {
        // Implementation for viewing buddy profile
        console.log('Viewing buddy profile:', userId);
    }

    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    position => {
                        resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        });
                    },
                    error => reject(error)
                );
            } else {
                reject(new Error('Geolocation not supported'));
            }
        });
    }
}

// Initialize Enhanced Features Manager
const enhancedFeaturesManager = new EnhancedFeaturesManager();

// Export classes for global access
window.aiFormChecker = enhancedFeaturesManager.aiFormChecker;
window.smartNotifications = enhancedFeaturesManager.smartNotifications;
window.socialChallenges = enhancedFeaturesManager.socialChallenges;
window.progressPredictions = enhancedFeaturesManager.progressPredictions;
window.voiceCommands = enhancedFeaturesManager.voiceCommands;
window.buddyFinder = enhancedFeaturesManager.buddyFinder;