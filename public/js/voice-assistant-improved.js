/**
 * Improved Voice Assistant for Fit-With-AI
 * On-demand activation with better navigation and cleaner UI
 */

class ImprovedVoiceAssistant {
    constructor() {
        this.isListening = false;
        this.isProcessing = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.wakeWord = localStorage.getItem('voiceAssistantWakeWord') || 'hey fit-with';
        this.isEnabled = localStorage.getItem('voiceAssistantEnabled') !== 'false';
        this.userData = null;
        
        // Voice settings
        this.voiceSettings = {
            rate: parseFloat(localStorage.getItem('voiceAssistantRate')) || 0.9,
            pitch: parseFloat(localStorage.getItem('voiceAssistantPitch')) || 1.0,
            volume: parseFloat(localStorage.getItem('voiceAssistantVolume')) || 1.0,
            voice: localStorage.getItem('voiceAssistantVoice') || null
        };
        
        this.initializeCommands();
        this.init();
    }
    
    init() {
        if (!this.isEnabled) {
            console.log('Voice Assistant is disabled');
            return;
        }
        
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported in this browser');
            this.showNotification('Voice assistant not supported in this browser', 'warning');
            return;
        }
        
        this.setupSpeechRecognition();
        this.createUI();
        this.loadUserData();
        console.log('Voice Assistant initialized - Click microphone to start');
    }
    
    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = false; // Only listen for one command at a time
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;
        
        this.recognition.onstart = () => {
            console.log('Voice recognition started');
            this.updateUI('listening');
        };
        
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            console.log('Voice input:', transcript);
            this.processCommand(transcript);
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.updateUI('idle');
            if (event.error === 'not-allowed') {
                this.showNotification('Microphone access denied. Please enable microphone permissions.', 'error');
            } else if (event.error === 'no-speech') {
                this.showNotification('No speech detected. Try again.', 'warning');
            }
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.updateUI('idle');
        };
    }
    
    initializeCommands() {
        this.commands = {
            // Navigation commands - Fixed to work properly
            'dashboard': () => this.navigateTo('/dashboard'),
            'go to dashboard': () => this.navigateTo('/dashboard'),
            'switch to dashboard': () => this.navigateTo('/dashboard'),
            'open dashboard': () => this.navigateTo('/dashboard'),
            
            'workouts': () => this.navigateTo('/workouts'),
            'go to workouts': () => this.navigateTo('/workouts'),
            'switch to workouts': () => this.navigateTo('/workouts'),
            'open workouts': () => this.navigateTo('/workouts'),
            'workout page': () => this.navigateTo('/workouts'),
            
            'nutrition': () => this.navigateTo('/nutrition'),
            'go to nutrition': () => this.navigateTo('/nutrition'),
            'switch to nutrition': () => this.navigateTo('/nutrition'),
            'open nutrition': () => this.navigateTo('/nutrition'),
            
            'meal planner': () => this.navigateTo('/meal-planner'),
            'go to meal planner': () => this.navigateTo('/meal-planner'),
            'switch to meal planner': () => this.navigateTo('/meal-planner'),
            
            'progress': () => this.navigateTo('/progress'),
            'go to progress': () => this.navigateTo('/progress'),
            'switch to progress': () => this.navigateTo('/progress'),
            
            'health': () => this.navigateTo('/health'),
            'go to health': () => this.navigateTo('/health'),
            'switch to health': () => this.navigateTo('/health'),
            
            'challenges': () => this.navigateTo('/challenges'),
            'go to challenges': () => this.navigateTo('/challenges'),
            'switch to challenges': () => this.navigateTo('/challenges'),
            
            'community': () => this.navigateTo('/community'),
            'go to community': () => this.navigateTo('/community'),
            'switch to community': () => this.navigateTo('/community'),
            
            'ai coach': () => this.navigateTo('/ai-coach'),
            'go to ai coach': () => this.navigateTo('/ai-coach'),
            'switch to ai coach': () => this.navigateTo('/ai-coach'),
            
            'chat': () => this.navigateTo('/chat'),
            'go to chat': () => this.navigateTo('/chat'),
            'switch to chat': () => this.navigateTo('/chat'),
            
            'settings': () => this.navigateTo('/settings'),
            'go to settings': () => this.navigateTo('/settings'),
            'switch to settings': () => this.navigateTo('/settings'),
            
            // Data reading commands
            'read nutrition summary': () => this.readNutritionSummary(),
            'nutrition summary': () => this.readNutritionSummary(),
            'todays nutrition': () => this.readNutritionSummary(),
            'what did i eat today': () => this.readNutritionSummary(),
            
            'calories today': () => this.readCaloriesToday(),
            'how many calories today': () => this.readCaloriesToday(),
            'protein today': () => this.readProteinToday(),
            'water intake': () => this.readWaterIntake(),
            
            'workout summary': () => this.readWorkoutSummary(),
            'workouts this week': () => this.readWeeklyWorkouts(),
            'last workout': () => this.readLastWorkout(),
            
            'progress summary': () => this.readProgressSummary(),
            'my progress': () => this.readProgressSummary(),
            'how am i doing': () => this.readProgressSummary(),
            
            'current weight': () => this.readCurrentWeight(),
            'my weight': () => this.readCurrentWeight(),
            
            // Action commands
            'log out': () => this.logout(),
            'logout': () => this.logout(),
            'sign out': () => this.logout(),
            
            'log workout': () => this.logWorkout(),
            'add workout': () => this.logWorkout(),
            'log meal': () => this.logMeal(),
            'add meal': () => this.logMeal(),
            'add water': () => this.addWater(),
            
            // Information commands
            'help': () => this.showHelp(),
            'what can you do': () => this.showHelp(),
            'time': () => this.tellTime(),
            'date': () => this.tellDate(),
            'motivate me': () => this.motivate(),
            
            // Voice assistant control
            'settings': () => this.openSettings()
        };
        
        this.motivationalPhrases = [
            "You're doing amazing! Keep pushing towards your fitness goals!",
            "Every workout counts! You're building a stronger, healthier you!",
            "Consistency is key! You've got this!",
            "Your dedication to fitness is inspiring! Keep it up!",
            "Remember, progress not perfection! You're on the right track!"
        ];
    }
    
    // Start listening when user clicks microphone
    startListening() {
        if (!this.recognition || this.isListening) return;
        
        this.isListening = true;
        this.updateUI('starting');
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Failed to start voice recognition:', error);
            this.isListening = false;
            this.updateUI('idle');
        }
    }
    
    // Process voice command
    processCommand(transcript) {
        this.isProcessing = true;
        this.updateUI('processing');
        
        console.log('Processing command:', transcript);
        
        // Find matching command
        const matchedCommand = this.findBestMatch(transcript);
        
        if (matchedCommand) {
            this.speak(`${this.getCommandAcknowledgment(matchedCommand)}`);
            setTimeout(() => {
                this.commands[matchedCommand]();
                this.isProcessing = false;
                this.updateUI('idle');
            }, 1000);
        } else {
            // Try natural language processing
            this.handleNaturalLanguage(transcript);
            this.isProcessing = false;
            this.updateUI('idle');
        }
    }
    
    findBestMatch(command) {
        // First try exact matches
        for (const cmd of Object.keys(this.commands)) {
            if (command.includes(cmd) || cmd.includes(command)) {
                return cmd;
            }
        }
        
        // Then try fuzzy matching
        let bestMatch = null;
        let bestScore = 0;
        
        for (const cmd of Object.keys(this.commands)) {
            const score = this.calculateSimilarity(command, cmd);
            if (score > bestScore && score > 0.6) {
                bestScore = score;
                bestMatch = cmd;
            }
        }
        
        return bestMatch;
    }
    
    handleNaturalLanguage(command) {
        if (command.includes('switch') && command.includes('workout')) {
            this.navigateTo('/workouts');
        } else if (command.includes('go') && command.includes('workout')) {
            this.navigateTo('/workouts');
        } else if (command.includes('open') && command.includes('workout')) {
            this.navigateTo('/workouts');
        } else if (command.includes('workout') && command.includes('page')) {
            this.navigateTo('/workouts');
        } else if (command.includes('nutrition') && (command.includes('switch') || command.includes('go') || command.includes('open'))) {
            this.navigateTo('/nutrition');
        } else if (command.includes('dashboard') && (command.includes('switch') || command.includes('go') || command.includes('open'))) {
            this.navigateTo('/dashboard');
        } else {
            this.speak("I didn't understand that command. Try saying 'switch to workouts' or 'go to dashboard'.");
        }
    }
    
    getCommandAcknowledgment(command) {
        const acknowledgments = {
            'workouts': 'Opening workouts page',
            'switch to workouts': 'Switching to workouts',
            'go to workouts': 'Going to workouts',
            'dashboard': 'Opening dashboard',
            'nutrition': 'Opening nutrition page',
            'logout': 'Logging you out'
        };
        
        return acknowledgments[command] || 'Got it';
    }
    
    // Navigation method - Fixed to work properly
    navigateTo(path) {
        const pageName = path.replace('/', '').replace('-', ' ');
        this.speak(`Navigating to ${pageName}`);
        
        // Use proper navigation with current token
        const currentUrl = new URL(window.location.href);
        const token = currentUrl.searchParams.get('token');
        
        let targetUrl = path;
        if (token) {
            targetUrl += `?token=${token}`;
        }
        
        console.log('Navigating to:', targetUrl);
        
        setTimeout(() => {
            window.location.href = targetUrl;
        }, 1500);
    }
    
    // Data reading methods
    async loadUserData() {
        try {
            const response = await fetch('/api/dashboard-data');
            if (response.ok) {
                const data = await response.json();
                this.userData = data.data;
                console.log('User data loaded for voice assistant');
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }
    
    async readNutritionSummary() {
        try {
            await this.loadUserData();
            if (!this.userData) {
                this.speak("I couldn't load your nutrition data. Please try again.");
                return;
            }
            
            const stats = this.userData.stats;
            const calories = stats.todayCalories || 0;
            const protein = stats.todayProtein || 0;
            const water = (stats.todayWater / 1000).toFixed(1) || 0;
            
            let summary = `Here's your nutrition summary for today: `;
            summary += `You've consumed ${calories} calories, `;
            summary += `${protein} grams of protein, `;
            summary += `and ${water} liters of water.`;
            
            this.speak(summary);
            
        } catch (error) {
            this.speak("I'm having trouble accessing your nutrition data.");
        }
    }
    
    async readCaloriesToday() {
        try {
            await this.loadUserData();
            const calories = this.userData?.stats?.todayCalories || 0;
            this.speak(`You've consumed ${calories} calories today.`);
        } catch (error) {
            this.speak("I couldn't get your calorie information right now.");
        }
    }
    
    async readProteinToday() {
        try {
            await this.loadUserData();
            const protein = this.userData?.stats?.todayProtein || 0;
            this.speak(`You've consumed ${protein} grams of protein today.`);
        } catch (error) {
            this.speak("I couldn't get your protein information right now.");
        }
    }
    
    async readWaterIntake() {
        try {
            await this.loadUserData();
            const water = (this.userData?.stats?.todayWater / 1000).toFixed(1) || 0;
            this.speak(`You've had ${water} liters of water today.`);
        } catch (error) {
            this.speak("I couldn't get your water intake information right now.");
        }
    }
    
    async readWorkoutSummary() {
        try {
            await this.loadUserData();
            const weeklyCount = this.userData?.stats?.workoutsThisWeek || 0;
            const target = this.userData?.stats?.targetWorkoutsPerWeek || 5;
            
            this.speak(`You've completed ${weeklyCount} out of ${target} workouts this week.`);
        } catch (error) {
            this.speak("I couldn't get your workout information right now.");
        }
    }
    
    async readWeeklyWorkouts() {
        try {
            await this.loadUserData();
            const weeklyCount = this.userData?.stats?.workoutsThisWeek || 0;
            const target = this.userData?.stats?.targetWorkoutsPerWeek || 5;
            const remaining = Math.max(0, target - weeklyCount);
            
            let message = `This week you've completed ${weeklyCount} workouts. `;
            if (remaining > 0) {
                message += `You need ${remaining} more workouts to reach your weekly goal.`;
            } else {
                message += `Congratulations! You've reached your weekly workout goal!`;
            }
            
            this.speak(message);
        } catch (error) {
            this.speak("I couldn't get your weekly workout information.");
        }
    }
    
    async readLastWorkout() {
        try {
            await this.loadUserData();
            const workouts = this.userData?.recentWorkouts || [];
            
            if (workouts.length > 0) {
                const lastWorkout = workouts[workouts.length - 1];
                this.speak(`Your last workout was ${lastWorkout.type} for ${lastWorkout.duration} minutes.`);
            } else {
                this.speak("You haven't logged any workouts recently.");
            }
        } catch (error) {
            this.speak("I couldn't find your recent workout information.");
        }
    }
    
    async readProgressSummary() {
        try {
            await this.loadUserData();
            const stats = this.userData?.stats;
            
            let summary = `Here's your fitness progress: `;
            summary += `This week you've completed ${stats?.workoutsThisWeek || 0} workouts. `;
            summary += `Today you've consumed ${stats?.todayCalories || 0} calories. `;
            summary += `You're making great progress!`;
            
            this.speak(summary);
        } catch (error) {
            this.speak("I couldn't get your complete progress information right now.");
        }
    }
    
    async readCurrentWeight() {
        try {
            await this.loadUserData();
            const weight = this.userData?.latestBiometrics?.weight;
            
            if (weight) {
                this.speak(`Your current weight is ${weight} kilograms.`);
            } else {
                this.speak("I don't have your current weight information.");
            }
        } catch (error) {
            this.speak("I couldn't get your weight information right now.");
        }
    }
    
    // Action methods
    logout() {
        this.speak("Logging you out. Goodbye!");
        setTimeout(() => {
            fetch('/logout', { method: 'POST' })
                .then(() => {
                    window.location.href = '/';
                })
                .catch(() => {
                    window.location.href = '/';
                });
        }, 1500);
    }
    
    logWorkout() {
        this.speak("Opening workout logging.");
        const quickLogBtn = document.querySelector('#quickLogBtn');
        if (quickLogBtn) {
            quickLogBtn.click();
        } else {
            this.navigateTo('/workouts');
        }
    }
    
    logMeal() {
        this.speak("Opening meal logging.");
        const quickLogBtn = document.querySelector('#quickLogBtn');
        if (quickLogBtn) {
            quickLogBtn.click();
            setTimeout(() => {
                const logType = document.querySelector('#logType');
                if (logType) {
                    logType.value = 'nutrition';
                    logType.dispatchEvent(new Event('change'));
                }
            }, 500);
        } else {
            this.navigateTo('/meal-planner');
        }
    }
    
    async addWater() {
        try {
            this.speak("Adding 250 milliliters of water.");
            
            const response = await fetch('/api/nutrition/water', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 250 })
            });
            
            if (response.ok) {
                this.speak("Water logged successfully!");
                if (typeof loadDashboardData === 'function') {
                    loadDashboardData();
                }
            } else {
                this.speak("I couldn't log your water intake right now.");
            }
        } catch (error) {
            this.speak("There was an error logging your water intake.");
        }
    }
    
    // Information methods
    showHelp() {
        const helpText = `I can help you navigate pages, read your fitness data, and perform actions. 
                         Try saying "switch to workouts", "read nutrition summary", "add water", or "log out".`;
        this.speak(helpText);
    }
    
    tellTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        this.speak(`The current time is ${timeString}`);
    }
    
    tellDate() {
        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
        });
        this.speak(`Today is ${dateString}`);
    }
    
    motivate() {
        const randomPhrase = this.motivationalPhrases[Math.floor(Math.random() * this.motivationalPhrases.length)];
        this.speak(randomPhrase);
    }
    
    openSettings() {
        this.openVoiceSettings();
    }
    
    // Utility methods
    speak(text) {
        if (!this.synthesis) return;
        
        this.synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = this.voiceSettings.rate;
        utterance.pitch = this.voiceSettings.pitch;
        utterance.volume = this.voiceSettings.volume;
        
        if (this.voiceSettings.voice) {
            const voices = this.synthesis.getVoices();
            const selectedVoice = voices.find(voice => voice.name === this.voiceSettings.voice);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }
        
        this.synthesis.speak(utterance);
    }
    
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    // UI Methods - Clean and minimal
    createUI() {
        if (document.getElementById('voice-assistant-ui')) return;
        
        const ui = document.createElement('div');
        ui.id = 'voice-assistant-ui';
        ui.innerHTML = `
            <div class="voice-assistant-bar">
                <button class="voice-mic-btn" id="voice-mic-btn" onclick="voiceAssistant.startListening()">
                    <i class="fas fa-microphone" id="voice-mic-icon"></i>
                </button>
                <div class="voice-status-text" id="voice-status-text">Click to speak</div>
                <button class="voice-settings-btn" onclick="voiceAssistant.openSettings()">
                    <i class="fas fa-cog"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(ui);
        this.addStyles();
    }
    
    addStyles() {
        if (document.getElementById('voice-assistant-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'voice-assistant-styles';
        style.textContent = `
            .voice-assistant-bar {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 25px;
                padding: 10px 20px;
                display: flex;
                align-items: center;
                gap: 15px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: white;
                transition: all 0.3s ease;
                max-width: 300px;
            }
            
            .voice-mic-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                transition: all 0.3s ease;
            }
            
            .voice-mic-btn:hover {
                background: rgba(255,255,255,0.3);
                transform: scale(1.1);
            }
            
            .voice-mic-btn.listening {
                background: #ff4757;
                animation: pulse 1s infinite;
            }
            
            .voice-mic-btn.processing {
                background: #ffa502;
                animation: spin 1s linear infinite;
            }
            
            .voice-status-text {
                font-size: 14px;
                font-weight: 500;
                opacity: 0.9;
                flex: 1;
                text-align: center;
            }
            
            .voice-settings-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                transition: all 0.3s ease;
            }
            
            .voice-settings-btn:hover {
                background: rgba(255,255,255,0.3);
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .voice-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #333;
                color: white;
                padding: 15px 20px;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 15000;
                max-width: 300px;
                animation: slideIn 0.3s ease-out;
            }
            
            .voice-notification.success { background: #4CAF50; }
            .voice-notification.error { background: #f44336; }
            .voice-notification.warning { background: #ff9800; }
            .voice-notification.info { background: #2196F3; }
            
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    updateUI(status) {
        const micBtn = document.getElementById('voice-mic-btn');
        const micIcon = document.getElementById('voice-mic-icon');
        const statusText = document.getElementById('voice-status-text');
        
        if (!micBtn || !micIcon || !statusText) return;
        
        // Remove all status classes
        micBtn.className = 'voice-mic-btn';
        
        switch (status) {
            case 'starting':
                statusText.textContent = 'Starting...';
                micIcon.className = 'fas fa-microphone';
                break;
            case 'listening':
                micBtn.classList.add('listening');
                statusText.textContent = 'Listening...';
                micIcon.className = 'fas fa-microphone';
                break;
            case 'processing':
                micBtn.classList.add('processing');
                statusText.textContent = 'Processing...';
                micIcon.className = 'fas fa-cog';
                break;
            case 'idle':
            default:
                statusText.textContent = 'Click to speak';
                micIcon.className = 'fas fa-microphone';
                break;
        }
    }
    
    openVoiceSettings() {
        // Create settings modal if it doesn't exist
        if (!document.getElementById('voice-settings-modal')) {
            this.createSettingsModal();
        }
        
        const modal = document.getElementById('voice-settings-modal');
        modal.style.display = 'flex';
        
        // Populate current settings
        document.getElementById('wake-word-input').value = this.wakeWord;
        document.getElementById('speech-rate').value = this.voiceSettings.rate;
        document.getElementById('speech-pitch').value = this.voiceSettings.pitch;
        document.getElementById('speech-volume').value = this.voiceSettings.volume;
        document.getElementById('voice-enabled').checked = this.isEnabled;
        
        // Update display values
        document.getElementById('rate-value').textContent = this.voiceSettings.rate;
        document.getElementById('pitch-value').textContent = this.voiceSettings.pitch;
        document.getElementById('volume-value').textContent = this.voiceSettings.volume;
        
        this.populateVoiceOptions();
    }
    
    createSettingsModal() {
        const modal = document.createElement('div');
        modal.id = 'voice-settings-modal';
        modal.innerHTML = `
            <div class="voice-settings-overlay">
                <div class="voice-settings-content">
                    <h3>🎤 Voice Assistant Settings</h3>
                    
                    <div class="setting-group">
                        <label>Wake Word:</label>
                        <input type="text" id="wake-word-input" value="${this.wakeWord}" placeholder="e.g., hey fit-with">
                        <small>Custom wake word for voice activation</small>
                    </div>
                    
                    <div class="setting-group">
                        <label>Speech Rate:</label>
                        <input type="range" id="speech-rate" min="0.5" max="2" step="0.1" value="${this.voiceSettings.rate}">
                        <span id="rate-value">${this.voiceSettings.rate}</span>
                    </div>
                    
                    <div class="setting-group">
                        <label>Speech Pitch:</label>
                        <input type="range" id="speech-pitch" min="0" max="2" step="0.1" value="${this.voiceSettings.pitch}">
                        <span id="pitch-value">${this.voiceSettings.pitch}</span>
                    </div>
                    
                    <div class="setting-group">
                        <label>Speech Volume:</label>
                        <input type="range" id="speech-volume" min="0" max="1" step="0.1" value="${this.voiceSettings.volume}">
                        <span id="volume-value">${this.voiceSettings.volume}</span>
                    </div>
                    
                    <div class="setting-group">
                        <label>Voice:</label>
                        <select id="voice-select">
                            <option value="">Default</option>
                        </select>
                    </div>
                    
                    <div class="setting-group">
                        <label>
                            <input type="checkbox" id="voice-enabled" ${this.isEnabled ? 'checked' : ''}>
                            Enable Voice Assistant
                        </label>
                    </div>
                    
                    <div class="settings-buttons">
                        <button onclick="voiceAssistant.testVoice()" class="test-btn">Test Voice</button>
                        <button onclick="voiceAssistant.saveSettings()" class="save-btn">Save</button>
                        <button onclick="voiceAssistant.closeSettings()" class="cancel-btn">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 20000;
        `;
        
        document.body.appendChild(modal);
        this.addSettingsStyles();
        this.setupSettingsEventListeners();
    }
    
    addSettingsStyles() {
        if (document.getElementById('voice-settings-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'voice-settings-styles';
        style.textContent = `
            .voice-settings-content {
                background: white;
                padding: 30px;
                border-radius: 15px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            
            .voice-settings-content h3 {
                margin-top: 0;
                color: #333;
                text-align: center;
                margin-bottom: 25px;
            }
            
            .setting-group {
                margin-bottom: 20px;
            }
            
            .setting-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                color: #555;
            }
            
            .setting-group input, .setting-group select {
                width: 100%;
                padding: 10px;
                border: 2px solid #ddd;
                border-radius: 8px;
                font-size: 14px;
            }
            
            .setting-group input[type="range"] {
                width: calc(100% - 50px);
                display: inline-block;
            }
            
            .setting-group span {
                display: inline-block;
                width: 40px;
                text-align: center;
                font-weight: bold;
                color: #667eea;
            }
            
            .setting-group small {
                display: block;
                color: #888;
                font-size: 12px;
                margin-top: 5px;
            }
            
            .setting-group input[type="checkbox"] {
                width: auto;
                margin-right: 10px;
            }
            
            .settings-buttons {
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-top: 25px;
            }
            
            .settings-buttons button {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s;
            }
            
            .test-btn {
                background: #4CAF50;
                color: white;
            }
            
            .save-btn {
                background: #667eea;
                color: white;
            }
            
            .cancel-btn {
                background: #f44336;
                color: white;
            }
            
            .settings-buttons button:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
        `;
        
        document.head.appendChild(style);
    }
    
    setupSettingsEventListeners() {
        document.getElementById('speech-rate').addEventListener('input', (e) => {
            document.getElementById('rate-value').textContent = e.target.value;
        });
        
        document.getElementById('speech-pitch').addEventListener('input', (e) => {
            document.getElementById('pitch-value').textContent = e.target.value;
        });
        
        document.getElementById('speech-volume').addEventListener('input', (e) => {
            document.getElementById('volume-value').textContent = e.target.value;
        });
    }
    
    populateVoiceOptions() {
        const voiceSelect = document.getElementById('voice-select');
        const voices = this.synthesis.getVoices();
        
        voiceSelect.innerHTML = '<option value="">Default</option>';
        
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            if (voice.name === this.voiceSettings.voice) {
                option.selected = true;
            }
            voiceSelect.appendChild(option);
        });
    }
    
    testVoice() {
        const rate = document.getElementById('speech-rate').value;
        const pitch = document.getElementById('speech-pitch').value;
        const volume = document.getElementById('speech-volume').value;
        const voice = document.getElementById('voice-select').value;
        
        const originalSettings = { ...this.voiceSettings };
        this.voiceSettings = { rate: parseFloat(rate), pitch: parseFloat(pitch), volume: parseFloat(volume), voice };
        
        this.speak("Hello! This is how I sound with your current settings.");
        
        setTimeout(() => {
            this.voiceSettings = originalSettings;
        }, 3000);
    }
    
    saveSettings() {
        const wakeWord = document.getElementById('wake-word-input').value.trim();
        const rate = document.getElementById('speech-rate').value;
        const pitch = document.getElementById('speech-pitch').value;
        const volume = document.getElementById('speech-volume').value;
        const voice = document.getElementById('voice-select').value;
        const enabled = document.getElementById('voice-enabled').checked;
        
        if (!wakeWord || wakeWord.length < 3) {
            alert('Wake word must be at least 3 characters long');
            return;
        }
        
        this.wakeWord = wakeWord;
        this.voiceSettings = { 
            rate: parseFloat(rate), 
            pitch: parseFloat(pitch), 
            volume: parseFloat(volume), 
            voice 
        };
        this.isEnabled = enabled;
        
        localStorage.setItem('voiceAssistantWakeWord', wakeWord);
        localStorage.setItem('voiceAssistantRate', rate);
        localStorage.setItem('voiceAssistantPitch', pitch);
        localStorage.setItem('voiceAssistantVolume', volume);
        localStorage.setItem('voiceAssistantVoice', voice);
        localStorage.setItem('voiceAssistantEnabled', enabled.toString());
        
        this.speak(`Settings saved! Voice assistant is now ${enabled ? 'enabled' : 'disabled'}.`);
        this.closeSettings();
        
        if (!enabled) {
            this.removeUI();
        }
    }
    
    closeSettings() {
        const modal = document.getElementById('voice-settings-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    removeUI() {
        const ui = document.getElementById('voice-assistant-ui');
        if (ui) {
            ui.remove();
        }
    }
    
    showNotification(message, type = 'info') {
        const existingNotifications = document.querySelectorAll('.voice-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `voice-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 4000);
    }
}

// Initialize improved voice assistant when page loads
let voiceAssistant;

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on protected pages (not login/signup)
    if (!window.location.pathname.includes('/') || window.location.pathname.length > 1) {
        voiceAssistant = new ImprovedVoiceAssistant();
        window.voiceAssistant = voiceAssistant;
        console.log('Improved Voice Assistant initialized');
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImprovedVoiceAssistant;
}