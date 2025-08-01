/**
 * Siri-like Voice Assistant for Fit-With-AI
 * Works across entire website with Siri-style UI and preview
 */

class SiriVoiceAssistant {
    constructor() {
        this.isListening = false;
        this.isProcessing = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isEnabled = localStorage.getItem('voiceAssistantEnabled') !== 'false';
        this.userData = null;
        this.currentTranscript = '';
        this.isModalOpen = false;
        
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
            return;
        }
        
        this.setupSpeechRecognition();
        this.createUI();
        this.loadUserData();
        this.setupKeyboardShortcut();
        console.log('Siri-like Voice Assistant initialized - Press and hold Space or click microphone');
    }
    
    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;
        
        this.recognition.onstart = () => {
            console.log('Voice recognition started');
            this.updateSiriUI('listening');
        };
        
        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            this.currentTranscript = finalTranscript || interimTranscript;
            this.updateTranscriptDisplay(this.currentTranscript);
            
            if (finalTranscript) {
                this.processCommand(finalTranscript.toLowerCase().trim());
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                this.showSiriResponse("I need microphone permission to work. Please enable it in your browser settings.");
            } else if (event.error === 'no-speech') {
                this.showSiriResponse("I didn't hear anything. Try speaking again.");
            }
            this.stopListening();
        };
        
        this.recognition.onend = () => {
            if (this.isListening) {
                this.stopListening();
            }
        };
    }
    
    setupKeyboardShortcut() {
        let spacePressed = false;
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !spacePressed && !this.isInputFocused()) {
                e.preventDefault();
                spacePressed = true;
                this.startListening();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space' && spacePressed) {
                e.preventDefault();
                spacePressed = false;
                this.stopListening();
            }
        });
    }
    
    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' || 
            activeElement.contentEditable === 'true'
        );
    }
    
    initializeCommands() {
        this.commands = {
            // Navigation commands
            'dashboard': () => this.navigateTo('/dashboard'),
            'go to dashboard': () => this.navigateTo('/dashboard'),
            'switch to dashboard': () => this.navigateTo('/dashboard'),
            'open dashboard': () => this.navigateTo('/dashboard'),
            'take me to dashboard': () => this.navigateTo('/dashboard'),
            
            'workouts': () => this.navigateTo('/workouts'),
            'go to workouts': () => this.navigateTo('/workouts'),
            'switch to workouts': () => this.navigateTo('/workouts'),
            'open workouts': () => this.navigateTo('/workouts'),
            'workout page': () => this.navigateTo('/workouts'),
            'take me to workouts': () => this.navigateTo('/workouts'),
            'show me workouts': () => this.navigateTo('/workouts'),
            
            'nutrition': () => this.navigateTo('/nutrition'),
            'go to nutrition': () => this.navigateTo('/nutrition'),
            'switch to nutrition': () => this.navigateTo('/nutrition'),
            'open nutrition': () => this.navigateTo('/nutrition'),
            'nutrition page': () => this.navigateTo('/nutrition'),
            'take me to nutrition': () => this.navigateTo('/nutrition'),
            
            'meal planner': () => this.navigateTo('/meal-planner'),
            'go to meal planner': () => this.navigateTo('/meal-planner'),
            'switch to meal planner': () => this.navigateTo('/meal-planner'),
            'open meal planner': () => this.navigateTo('/meal-planner'),
            'meal planning': () => this.navigateTo('/meal-planner'),
            
            'progress': () => this.navigateTo('/progress'),
            'go to progress': () => this.navigateTo('/progress'),
            'switch to progress': () => this.navigateTo('/progress'),
            'show my progress': () => this.navigateTo('/progress'),
            'progress page': () => this.navigateTo('/progress'),
            
            'health': () => this.navigateTo('/health'),
            'go to health': () => this.navigateTo('/health'),
            'switch to health': () => this.navigateTo('/health'),
            'health page': () => this.navigateTo('/health'),
            'health metrics': () => this.navigateTo('/health'),
            
            'challenges': () => this.navigateTo('/challenges'),
            'go to challenges': () => this.navigateTo('/challenges'),
            'switch to challenges': () => this.navigateTo('/challenges'),
            'show challenges': () => this.navigateTo('/challenges'),
            
            'community': () => this.navigateTo('/community'),
            'go to community': () => this.navigateTo('/community'),
            'switch to community': () => this.navigateTo('/community'),
            'community page': () => this.navigateTo('/community'),
            
            'ai coach': () => this.navigateTo('/ai-coach'),
            'go to ai coach': () => this.navigateTo('/ai-coach'),
            'switch to ai coach': () => this.navigateTo('/ai-coach'),
            'open ai coach': () => this.navigateTo('/ai-coach'),
            
            'chat': () => this.navigateTo('/chat'),
            'go to chat': () => this.navigateTo('/chat'),
            'switch to chat': () => this.navigateTo('/chat'),
            'open chat': () => this.navigateTo('/chat'),
            
            'settings': () => this.navigateTo('/settings'),
            'go to settings': () => this.navigateTo('/settings'),
            'switch to settings': () => this.navigateTo('/settings'),
            'open settings': () => this.navigateTo('/settings'),
            
            'nutriscan': () => this.navigateTo('/nutriscan'),
            'go to nutriscan': () => this.navigateTo('/nutriscan'),
            'scan food': () => this.navigateTo('/nutriscan'),
            'food scanner': () => this.navigateTo('/nutriscan'),
            
            'biometrics': () => this.navigateTo('/biometrics'),
            'go to biometrics': () => this.navigateTo('/biometrics'),
            'body metrics': () => this.navigateTo('/biometrics'),
            
            'schedule': () => this.navigateTo('/schedule'),
            'go to schedule': () => this.navigateTo('/schedule'),
            'my schedule': () => this.navigateTo('/schedule'),
            
            // Data reading commands
            'read nutrition summary': () => this.readNutritionSummary(),
            'nutrition summary': () => this.readNutritionSummary(),
            'todays nutrition': () => this.readNutritionSummary(),
            'what did i eat today': () => this.readNutritionSummary(),
            'tell me about my nutrition': () => this.readNutritionSummary(),
            
            'calories today': () => this.readCaloriesToday(),
            'how many calories today': () => this.readCaloriesToday(),
            'how many calories have i consumed': () => this.readCaloriesToday(),
            'todays calories': () => this.readCaloriesToday(),
            
            'protein today': () => this.readProteinToday(),
            'how much protein today': () => this.readProteinToday(),
            'protein intake': () => this.readProteinToday(),
            
            'water intake': () => this.readWaterIntake(),
            'how much water today': () => this.readWaterIntake(),
            'water consumption': () => this.readWaterIntake(),
            
            'workout summary': () => this.readWorkoutSummary(),
            'workouts this week': () => this.readWeeklyWorkouts(),
            'weekly workouts': () => this.readWeeklyWorkouts(),
            'last workout': () => this.readLastWorkout(),
            'recent workout': () => this.readLastWorkout(),
            
            'progress summary': () => this.readProgressSummary(),
            'my progress': () => this.readProgressSummary(),
            'how am i doing': () => this.readProgressSummary(),
            'fitness progress': () => this.readProgressSummary(),
            
            'current weight': () => this.readCurrentWeight(),
            'my weight': () => this.readCurrentWeight(),
            'what is my weight': () => this.readCurrentWeight(),
            
            // Action commands
            'log out': () => this.logout(),
            'logout': () => this.logout(),
            'sign out': () => this.logout(),
            
            'log workout': () => this.logWorkout(),
            'add workout': () => this.logWorkout(),
            'record workout': () => this.logWorkout(),
            
            'log meal': () => this.logMeal(),
            'add meal': () => this.logMeal(),
            'record meal': () => this.logMeal(),
            
            'add water': () => this.addWater(),
            'log water': () => this.addWater(),
            'record water': () => this.addWater(),
            
            // Information commands
            'help': () => this.showHelp(),
            'what can you do': () => this.showHelp(),
            'commands': () => this.showHelp(),
            'time': () => this.tellTime(),
            'what time is it': () => this.tellTime(),
            'date': () => this.tellDate(),
            'what date is it': () => this.tellDate(),
            'motivate me': () => this.motivate(),
            'give me motivation': () => this.motivate(),
            
            // Greeting responses
            'hello': () => this.greet(),
            'hi': () => this.greet(),
            'hey': () => this.greet(),
            'good morning': () => this.greet(),
            'good afternoon': () => this.greet(),
            'good evening': () => this.greet()
        };
        
        this.motivationalPhrases = [
            "You're doing amazing! Keep pushing towards your fitness goals!",
            "Every workout counts! You're building a stronger, healthier you!",
            "Consistency is key! You've got this!",
            "Your dedication to fitness is inspiring! Keep it up!",
            "Remember, progress not perfection! You're on the right track!",
            "Your future self will thank you for the effort you're putting in today!",
            "Strong mind, strong body! You're capable of amazing things!"
        ];
    }
    
    // Start listening when user activates
    startListening() {
        if (!this.recognition || this.isListening) return;
        
        this.isListening = true;
        this.currentTranscript = '';
        this.openSiriModal();
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Failed to start voice recognition:', error);
            this.isListening = false;
            this.closeSiriModal();
        }
    }
    
    stopListening() {
        if (!this.isListening) return;
        
        this.isListening = false;
        if (this.recognition) {
            this.recognition.stop();
        }
        
        setTimeout(() => {
            this.closeSiriModal();
        }, 2000); // Keep modal open for 2 seconds to show response
    }
    
    // Process voice command
    processCommand(transcript) {
        this.isProcessing = true;
        this.updateSiriUI('processing');
        
        console.log('Processing command:', transcript);
        
        // Find matching command
        const matchedCommand = this.findBestMatch(transcript);
        
        if (matchedCommand) {
            const acknowledgment = this.getCommandAcknowledgment(matchedCommand);
            this.showSiriResponse(acknowledgment);
            
            setTimeout(() => {
                this.commands[matchedCommand]();
                this.isProcessing = false;
            }, 1000);
        } else {
            // Try natural language processing
            this.handleNaturalLanguage(transcript);
            this.isProcessing = false;
        }
    }
    
    findBestMatch(command) {
        // First try exact matches
        for (const cmd of Object.keys(this.commands)) {
            if (command === cmd || command.includes(cmd)) {
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
        if (command.includes('switch') || command.includes('go') || command.includes('open') || command.includes('take me')) {
            if (command.includes('workout')) {
                this.showSiriResponse("Opening workouts page");
                this.navigateTo('/workouts');
            } else if (command.includes('nutrition') || command.includes('food')) {
                this.showSiriResponse("Opening nutrition page");
                this.navigateTo('/nutrition');
            } else if (command.includes('dashboard') || command.includes('home')) {
                this.showSiriResponse("Opening dashboard");
                this.navigateTo('/dashboard');
            } else if (command.includes('progress')) {
                this.showSiriResponse("Opening progress page");
                this.navigateTo('/progress');
            } else if (command.includes('health')) {
                this.showSiriResponse("Opening health page");
                this.navigateTo('/health');
            } else {
                this.showSiriResponse("I'm not sure which page you want to open. Try being more specific.");
            }
        } else if (command.includes('how many') || command.includes('how much')) {
            if (command.includes('calorie')) {
                this.readCaloriesToday();
            } else if (command.includes('protein')) {
                this.readProteinToday();
            } else if (command.includes('water')) {
                this.readWaterIntake();
            } else {
                this.showSiriResponse("I can tell you about your calories, protein, or water intake. What would you like to know?");
            }
        } else {
            this.showSiriResponse("I didn't understand that. Try saying something like 'go to workouts' or 'read nutrition summary'.");
        }
    }
    
    getCommandAcknowledgment(command) {
        const acknowledgments = {
            'workouts': 'Opening workouts page',
            'switch to workouts': 'Switching to workouts',
            'go to workouts': 'Going to workouts',
            'dashboard': 'Opening dashboard',
            'nutrition': 'Opening nutrition page',
            'progress': 'Opening progress page',
            'health': 'Opening health page',
            'challenges': 'Opening challenges',
            'community': 'Opening community',
            'ai coach': 'Opening AI coach',
            'chat': 'Opening chat',
            'settings': 'Opening settings',
            'logout': 'Logging you out',
            'read nutrition summary': 'Here\'s your nutrition summary',
            'calories today': 'Here are your calories for today',
            'workout summary': 'Here\'s your workout summary',
            'help': 'Here\'s what I can help you with'
        };
        
        return acknowledgments[command] || 'Got it';
    }
    
    // Navigation method
    navigateTo(path) {
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
                this.showSiriResponse("I couldn't load your nutrition data. Please try again.");
                return;
            }
            
            const stats = this.userData.stats;
            const calories = stats.todayCalories || 0;
            const protein = stats.todayProtein || 0;
            const water = (stats.todayWater / 1000).toFixed(1) || 0;
            
            let summary = `Today you've consumed ${calories} calories, ${protein} grams of protein, and ${water} liters of water.`;
            
            if (calories < 1000) {
                summary += " You might want to eat more to meet your daily needs.";
            } else if (calories > 2500) {
                summary += " You're doing well with your calorie intake.";
            }
            
            this.showSiriResponse(summary);
            
        } catch (error) {
            this.showSiriResponse("I'm having trouble accessing your nutrition data.");
        }
    }
    
    async readCaloriesToday() {
        try {
            await this.loadUserData();
            const calories = this.userData?.stats?.todayCalories || 0;
            const target = this.userData?.stats?.targetCalories || 2000;
            const remaining = target - calories;
            
            let message = `You've consumed ${calories} calories today.`;
            if (remaining > 0) {
                message += ` You have ${remaining} calories remaining to reach your goal.`;
            } else {
                message += ` You've reached your calorie goal for today!`;
            }
            
            this.showSiriResponse(message);
        } catch (error) {
            this.showSiriResponse("I couldn't get your calorie information right now.");
        }
    }
    
    async readProteinToday() {
        try {
            await this.loadUserData();
            const protein = this.userData?.stats?.todayProtein || 0;
            const target = this.userData?.stats?.targetProtein || 150;
            
            this.showSiriResponse(`You've consumed ${protein} grams of protein today out of your ${target} gram goal.`);
        } catch (error) {
            this.showSiriResponse("I couldn't get your protein information right now.");
        }
    }
    
    async readWaterIntake() {
        try {
            await this.loadUserData();
            const water = (this.userData?.stats?.todayWater / 1000).toFixed(1) || 0;
            const target = (this.userData?.stats?.targetWater / 1000).toFixed(1) || 2.5;
            
            this.showSiriResponse(`You've had ${water} liters of water today out of your ${target} liter goal.`);
        } catch (error) {
            this.showSiriResponse("I couldn't get your water intake information right now.");
        }
    }
    
    async readWorkoutSummary() {
        try {
            await this.loadUserData();
            const weeklyCount = this.userData?.stats?.workoutsThisWeek || 0;
            const target = this.userData?.stats?.targetWorkoutsPerWeek || 5;
            
            this.showSiriResponse(`You've completed ${weeklyCount} out of ${target} workouts this week. Keep up the great work!`);
        } catch (error) {
            this.showSiriResponse("I couldn't get your workout information right now.");
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
            
            this.showSiriResponse(message);
        } catch (error) {
            this.showSiriResponse("I couldn't get your weekly workout information.");
        }
    }
    
    async readLastWorkout() {
        try {
            await this.loadUserData();
            const workouts = this.userData?.recentWorkouts || [];
            
            if (workouts.length > 0) {
                const lastWorkout = workouts[workouts.length - 1];
                this.showSiriResponse(`Your last workout was ${lastWorkout.type} for ${lastWorkout.duration} minutes, burning ${lastWorkout.calories} calories.`);
            } else {
                this.showSiriResponse("You haven't logged any workouts recently. Ready to start one?");
            }
        } catch (error) {
            this.showSiriResponse("I couldn't find your recent workout information.");
        }
    }
    
    async readProgressSummary() {
        try {
            await this.loadUserData();
            const stats = this.userData?.stats;
            
            let summary = `Here's your fitness progress: `;
            summary += `This week you've completed ${stats?.workoutsThisWeek || 0} workouts. `;
            summary += `Today you've consumed ${stats?.todayCalories || 0} calories. `;
            summary += `You're making great progress on your fitness journey!`;
            
            this.showSiriResponse(summary);
        } catch (error) {
            this.showSiriResponse("I couldn't get your complete progress information right now.");
        }
    }
    
    async readCurrentWeight() {
        try {
            await this.loadUserData();
            const weight = this.userData?.latestBiometrics?.weight;
            
            if (weight) {
                this.showSiriResponse(`Your current weight is ${weight} kilograms.`);
            } else {
                this.showSiriResponse("I don't have your current weight information. You can log it in the biometrics section.");
            }
        } catch (error) {
            this.showSiriResponse("I couldn't get your weight information right now.");
        }
    }
    
    // Action methods
    logout() {
        this.showSiriResponse("Logging you out. Goodbye!");
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
        this.showSiriResponse("Opening workout logging for you.");
        const quickLogBtn = document.querySelector('#quickLogBtn');
        if (quickLogBtn) {
            setTimeout(() => {
                quickLogBtn.click();
            }, 1000);
        } else {
            this.navigateTo('/workouts');
        }
    }
    
    logMeal() {
        this.showSiriResponse("Opening meal logging for you.");
        const quickLogBtn = document.querySelector('#quickLogBtn');
        if (quickLogBtn) {
            setTimeout(() => {
                quickLogBtn.click();
                setTimeout(() => {
                    const logType = document.querySelector('#logType');
                    if (logType) {
                        logType.value = 'nutrition';
                        logType.dispatchEvent(new Event('change'));
                    }
                }, 500);
            }, 1000);
        } else {
            this.navigateTo('/meal-planner');
        }
    }
    
    async addWater() {
        try {
            this.showSiriResponse("Adding 250 milliliters of water to your daily intake.");
            
            const response = await fetch('/api/nutrition/water', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 250 })
            });
            
            if (response.ok) {
                setTimeout(() => {
                    this.showSiriResponse("Water logged successfully! Stay hydrated!");
                }, 1000);
                
                if (typeof loadDashboardData === 'function') {
                    loadDashboardData();
                }
            } else {
                this.showSiriResponse("I couldn't log your water intake right now. Please try again.");
            }
        } catch (error) {
            this.showSiriResponse("There was an error logging your water intake.");
        }
    }
    
    // Information methods
    showHelp() {
        const helpText = `I can help you navigate pages like "go to workouts", read your fitness data like "nutrition summary", perform actions like "add water", and answer questions about time and date. What would you like me to help you with?`;
        this.showSiriResponse(helpText);
    }
    
    tellTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        this.showSiriResponse(`The current time is ${timeString}`);
    }
    
    tellDate() {
        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
        });
        this.showSiriResponse(`Today is ${dateString}`);
    }
    
    motivate() {
        const randomPhrase = this.motivationalPhrases[Math.floor(Math.random() * this.motivationalPhrases.length)];
        this.showSiriResponse(randomPhrase);
    }
    
    greet() {
        const greetings = [
            "Hello! How can I help you with your fitness journey today?",
            "Hi there! What would you like me to help you with?",
            "Hey! I'm here to help with your fitness goals. What do you need?",
            "Good to see you! How can I assist you today?"
        ];
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        this.showSiriResponse(randomGreeting);
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
    
    // Siri-like UI Methods
    createUI() {
        if (document.getElementById('siri-voice-assistant')) return;
        
        // Create floating microphone button
        const micButton = document.createElement('div');
        micButton.id = 'siri-mic-button';
        micButton.innerHTML = `
            <div class="siri-mic-icon">
                <i class="fas fa-microphone"></i>
            </div>
            <div class="siri-mic-hint">Hold Space or Click</div>
        `;
        
        // Create Siri modal
        const modal = document.createElement('div');
        modal.id = 'siri-modal';
        modal.innerHTML = `
            <div class="siri-modal-content">
                <div class="siri-animation">
                    <div class="siri-wave"></div>
                    <div class="siri-wave"></div>
                    <div class="siri-wave"></div>
                    <div class="siri-wave"></div>
                    <div class="siri-wave"></div>
                </div>
                <div class="siri-transcript" id="siri-transcript">Listening...</div>
                <div class="siri-response" id="siri-response"></div>
                <div class="siri-hint">Hold Space to speak or click the microphone</div>
            </div>
        `;
        
        document.body.appendChild(micButton);
        document.body.appendChild(modal);
        
        // Add event listeners
        micButton.addEventListener('mousedown', () => this.startListening());
        micButton.addEventListener('mouseup', () => this.stopListening());
        micButton.addEventListener('mouseleave', () => this.stopListening());
        
        // Touch events for mobile
        micButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startListening();
        });
        micButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopListening();
        });
        
        this.addSiriStyles();
    }
    
    addSiriStyles() {
        if (document.getElementById('siri-voice-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'siri-voice-styles';
        style.textContent = `
            #siri-mic-button {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #007AFF, #5856D6);
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(0, 122, 255, 0.3);
                z-index: 10000;
                transition: all 0.3s ease;
                user-select: none;
            }
            
            #siri-mic-button:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 25px rgba(0, 122, 255, 0.4);
            }
            
            #siri-mic-button:active {
                transform: scale(0.95);
            }
            
            .siri-mic-icon {
                color: white;
                font-size: 24px;
                margin-bottom: 2px;
            }
            
            .siri-mic-hint {
                color: white;
                font-size: 8px;
                font-weight: 500;
                text-align: center;
                opacity: 0.8;
                line-height: 1;
            }
            
            #siri-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(20px);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 20000;
                animation: fadeIn 0.3s ease-out;
            }
            
            .siri-modal-content {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                max-width: 500px;
                width: 90%;
                backdrop-filter: blur(20px);
            }
            
            .siri-animation {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 4px;
                margin-bottom: 30px;
                height: 60px;
            }
            
            .siri-wave {
                width: 4px;
                background: linear-gradient(to top, #007AFF, #5856D6);
                border-radius: 2px;
                animation: siriWave 1.5s ease-in-out infinite;
            }
            
            .siri-wave:nth-child(1) { animation-delay: 0s; height: 20px; }
            .siri-wave:nth-child(2) { animation-delay: 0.1s; height: 30px; }
            .siri-wave:nth-child(3) { animation-delay: 0.2s; height: 40px; }
            .siri-wave:nth-child(4) { animation-delay: 0.3s; height: 30px; }
            .siri-wave:nth-child(5) { animation-delay: 0.4s; height: 20px; }
            
            .siri-transcript {
                color: white;
                font-size: 18px;
                font-weight: 500;
                margin-bottom: 20px;
                min-height: 25px;
                opacity: 0.9;
            }
            
            .siri-response {
                color: #007AFF;
                font-size: 16px;
                font-weight: 400;
                margin-bottom: 20px;
                min-height: 20px;
                line-height: 1.4;
            }
            
            .siri-hint {
                color: rgba(255, 255, 255, 0.6);
                font-size: 14px;
                font-weight: 400;
            }
            
            @keyframes siriWave {
                0%, 100% { transform: scaleY(1); }
                50% { transform: scaleY(2); }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; transform: scale(1); }
                to { opacity: 0; transform: scale(0.9); }
            }
            
            .siri-modal-closing {
                animation: fadeOut 0.3s ease-in;
            }
            
            /* Responsive design */
            @media (max-width: 768px) {
                #siri-mic-button {
                    bottom: 20px;
                    right: 20px;
                    width: 50px;
                    height: 50px;
                }
                
                .siri-mic-icon {
                    font-size: 20px;
                }
                
                .siri-mic-hint {
                    font-size: 7px;
                }
                
                .siri-modal-content {
                    padding: 30px 20px;
                }
                
                .siri-transcript {
                    font-size: 16px;
                }
                
                .siri-response {
                    font-size: 14px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    openSiriModal() {
        const modal = document.getElementById('siri-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.isModalOpen = true;
            this.updateSiriUI('listening');
        }
    }
    
    closeSiriModal() {
        const modal = document.getElementById('siri-modal');
        if (modal && this.isModalOpen) {
            modal.classList.add('siri-modal-closing');
            setTimeout(() => {
                modal.style.display = 'none';
                modal.classList.remove('siri-modal-closing');
                this.isModalOpen = false;
                this.currentTranscript = '';
                this.updateTranscriptDisplay('');
                this.updateResponseDisplay('');
            }, 300);
        }
    }
    
    updateSiriUI(status) {
        const waves = document.querySelectorAll('.siri-wave');
        const transcript = document.getElementById('siri-transcript');
        
        if (status === 'listening') {
            waves.forEach(wave => {
                wave.style.animationPlayState = 'running';
            });
            if (transcript && !this.currentTranscript) {
                transcript.textContent = 'Listening...';
            }
        } else if (status === 'processing') {
            waves.forEach(wave => {
                wave.style.animationPlayState = 'running';
            });
            if (transcript) {
                transcript.textContent = 'Processing...';
            }
        } else {
            waves.forEach(wave => {
                wave.style.animationPlayState = 'paused';
            });
        }
    }
    
    updateTranscriptDisplay(text) {
        const transcript = document.getElementById('siri-transcript');
        if (transcript) {
            transcript.textContent = text || 'Listening...';
        }
    }
    
    updateResponseDisplay(text) {
        const response = document.getElementById('siri-response');
        if (response) {
            response.textContent = text;
        }
    }
    
    showSiriResponse(text) {
        this.updateResponseDisplay(text);
        this.speak(text);
    }
}

// Initialize Siri-like voice assistant when page loads
let siriVoiceAssistant;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize on all pages except login/signup
    if (!window.location.pathname.includes('login') && 
        !window.location.pathname.includes('signup') && 
        !window.location.pathname.includes('forgot-password') &&
        !window.location.pathname.includes('reset-password')) {
        
        siriVoiceAssistant = new SiriVoiceAssistant();
        window.siriVoiceAssistant = siriVoiceAssistant;
        console.log('Siri-like Voice Assistant initialized across the website');
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SiriVoiceAssistant;
}