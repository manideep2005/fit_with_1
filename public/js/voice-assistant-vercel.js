/**
 * Vercel-Optimized Voice Assistant for Fit-With-AI
 * Enhanced for serverless deployment with better error handling
 */

class VercelVoiceAssistant {
    constructor() {
        this.isListening = false;
        this.isProcessing = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isEnabled = localStorage.getItem('voiceAssistantEnabled') !== 'false';
        this.userData = null;
        this.currentTranscript = '';
        this.isModalOpen = false;
        this.isSupported = false;
        this.permissionGranted = false;
        
        // Vercel-specific settings
        this.isVercelEnvironment = this.detectVercelEnvironment();
        this.isHTTPS = window.location.protocol === 'https:';
        this.isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
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
    
    detectVercelEnvironment() {
        // Check for Vercel-specific indicators
        return !!(
            window.location.hostname.includes('vercel.app') ||
            window.location.hostname.includes('vercel.com') ||
            document.querySelector('meta[name="vercel-deployment-url"]') ||
            window.VERCEL_ENV
        );
    }
    
    async init() {
        console.log('🎤 Initializing Vercel Voice Assistant...');
        console.log('📍 Environment:', {
            isVercel: this.isVercelEnvironment,
            isHTTPS: this.isHTTPS,
            isLocalhost: this.isLocalhost,
            userAgent: navigator.userAgent.substring(0, 50)
        });
        
        if (!this.isEnabled) {
            console.log('❌ Voice Assistant is disabled by user');
            this.showEnvironmentStatus('disabled');
            return;
        }
        
        // Check browser support
        this.isSupported = await this.checkBrowserSupport();
        
        if (!this.isSupported) {
            console.log('❌ Voice Assistant not supported in this environment');
            this.showEnvironmentStatus('unsupported');
            return;
        }
        
        // Check HTTPS requirement
        if (!this.isHTTPS && !this.isLocalhost) {
            console.log('❌ Voice Assistant requires HTTPS in production');
            this.showEnvironmentStatus('https-required');
            return;
        }
        
        // Request microphone permission
        const permissionGranted = await this.requestMicrophonePermission();
        
        if (!permissionGranted) {
            console.log('❌ Microphone permission denied');
            this.showEnvironmentStatus('permission-denied');
            return;
        }
        
        this.setupSpeechRecognition();
        this.createUI();
        this.loadUserData();
        this.setupKeyboardShortcut();
        
        console.log('✅ Vercel Voice Assistant initialized successfully');
        this.showEnvironmentStatus('ready');
    }
    
    async checkBrowserSupport() {
        try {
            // Check for Speech Recognition API
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                console.log('❌ SpeechRecognition API not available');
                return false;
            }
            
            // Check for Speech Synthesis API
            if (!window.speechSynthesis) {
                console.log('❌ SpeechSynthesis API not available');
                return false;
            }
            
            // Test if we can create a recognition instance
            try {
                const testRecognition = new SpeechRecognition();
                testRecognition = null; // Clean up
                console.log('✅ Speech Recognition API available');
                return true;
            } catch (error) {
                console.log('❌ Failed to create SpeechRecognition instance:', error);
                return false;
            }
            
        } catch (error) {
            console.log('❌ Browser support check failed:', error);
            return false;
        }
    }
    
    async requestMicrophonePermission() {
        try {
            console.log('🎤 Requesting microphone permission...');
            
            // Try to get microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Stop the stream immediately - we just needed permission
            stream.getTracks().forEach(track => track.stop());
            
            console.log('✅ Microphone permission granted');
            this.permissionGranted = true;
            return true;
            
        } catch (error) {
            console.log('❌ Microphone permission denied:', error);
            
            // Handle specific error types
            if (error.name === 'NotAllowedError') {
                console.log('User denied microphone permission');
            } else if (error.name === 'NotFoundError') {
                console.log('No microphone found');
            } else if (error.name === 'NotSupportedError') {
                console.log('Microphone not supported');
            }
            
            this.permissionGranted = false;
            return false;
        }
    }
    
    setupSpeechRecognition() {
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            // Vercel-optimized settings
            this.recognition.continuous = false; // More reliable on serverless
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 1;
            
            // Add timeout for Vercel
            if (this.isVercelEnvironment) {
                this.recognition.continuous = false;
                // Set shorter timeout for serverless
                setTimeout(() => {
                    if (this.isListening) {
                        this.stopListening();
                    }
                }, 10000); // 10 second timeout
            }
            
            this.recognition.onstart = () => {
                console.log('🎤 Voice recognition started');
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
                    console.log('🗣️ Final transcript:', finalTranscript);
                    this.processCommand(finalTranscript.toLowerCase().trim());
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('❌ Speech recognition error:', event.error);
                
                // Enhanced error handling for Vercel
                switch (event.error) {
                    case 'not-allowed':
                        this.showSiriResponse("I need microphone permission. Please enable it and try again.");
                        this.showEnvironmentStatus('permission-denied');
                        break;
                    case 'no-speech':
                        this.showSiriResponse("I didn't hear anything. Try speaking again.");
                        break;
                    case 'audio-capture':
                        this.showSiriResponse("Microphone not available. Please check your device.");
                        break;
                    case 'network':
                        this.showSiriResponse("Network error. Please check your connection.");
                        break;
                    case 'service-not-allowed':
                        this.showSiriResponse("Speech service not available in this browser.");
                        break;
                    default:
                        this.showSiriResponse("Voice recognition error. Please try again.");
                }
                
                this.stopListening();
            };
            
            this.recognition.onend = () => {
                console.log('🎤 Voice recognition ended');
                if (this.isListening) {
                    this.stopListening();
                }
            };
            
            console.log('✅ Speech recognition configured for Vercel');
            
        } catch (error) {
            console.error('❌ Failed to setup speech recognition:', error);
            this.isSupported = false;
        }
    }
    
    showEnvironmentStatus(status) {
        const statusMessages = {
            'disabled': '🔇 Voice Assistant is disabled',
            'unsupported': '❌ Voice not supported in this browser',
            'https-required': '🔒 Voice requires HTTPS connection',
            'permission-denied': '🎤 Microphone permission needed',
            'ready': '✅ Voice Assistant ready',
            'error': '❌ Voice Assistant error'
        };
        
        const message = statusMessages[status] || 'Voice Assistant status unknown';
        console.log(message);
        
        // Show status in UI if available
        const statusElement = document.getElementById('voice-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `voice-status ${status}`;
        }
    }
    
    initializeCommands() {
        this.commands = {
            // Navigation commands
            'dashboard': () => this.navigateTo('/dashboard'),
            'go to dashboard': () => this.navigateTo('/dashboard'),
            'workouts': () => this.navigateTo('/workouts'),
            'go to workouts': () => this.navigateTo('/workouts'),
            'nutrition': () => this.navigateTo('/nutrition'),
            'go to nutrition': () => this.navigateTo('/nutrition'),
            'meal planner': () => this.navigateTo('/meal-planner'),
            'progress': () => this.navigateTo('/progress'),
            'health': () => this.navigateTo('/health'),
            'challenges': () => this.navigateTo('/challenges'),
            'community': () => this.navigateTo('/community'),
            'ai coach': () => this.navigateTo('/ai-coach'),
            'chat': () => this.navigateTo('/chat'),
            'settings': () => this.navigateTo('/settings'),
            
            // Data reading commands
            'nutrition summary': () => this.readNutritionSummary(),
            'calories today': () => this.readCaloriesToday(),
            'workout summary': () => this.readWorkoutSummary(),
            
            // Action commands
            'log out': () => this.logout(),
            'help': () => this.showHelp(),
            'time': () => this.tellTime(),
            'date': () => this.tellDate(),
            
            // Greetings
            'hello': () => this.greet(),
            'hi': () => this.greet()
        };
    }
    
    // Start listening with enhanced error handling
    async startListening() {
        if (!this.recognition || this.isListening) {
            console.log('❌ Cannot start listening - recognition not available or already listening');
            return;
        }
        
        if (!this.permissionGranted) {
            console.log('❌ Cannot start listening - no microphone permission');
            this.showSiriResponse("Please grant microphone permission first.");
            return;
        }
        
        this.isListening = true;
        this.currentTranscript = '';
        this.openSiriModal();
        
        try {
            console.log('🎤 Starting voice recognition...');
            this.recognition.start();
            
            // Add timeout for Vercel environment
            if (this.isVercelEnvironment) {
                setTimeout(() => {
                    if (this.isListening) {
                        console.log('⏰ Voice recognition timeout');
                        this.stopListening();
                    }
                }, 8000); // 8 second timeout for Vercel
            }
            
        } catch (error) {
            console.error('❌ Failed to start voice recognition:', error);
            this.isListening = false;
            this.closeSiriModal();
            this.showSiriResponse("Failed to start voice recognition. Please try again.");
        }
    }
    
    stopListening() {
        if (!this.isListening) return;
        
        console.log('🛑 Stopping voice recognition...');
        this.isListening = false;
        
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.log('Error stopping recognition:', error);
            }
        }
        
        setTimeout(() => {
            this.closeSiriModal();
        }, 2000);
    }
    
    // Enhanced command processing
    processCommand(transcript) {
        this.isProcessing = true;
        this.updateSiriUI('processing');
        
        console.log('🔄 Processing command:', transcript);
        
        // Find matching command
        const matchedCommand = this.findBestMatch(transcript);
        
        if (matchedCommand) {
            const acknowledgment = this.getCommandAcknowledgment(matchedCommand);
            this.showSiriResponse(acknowledgment);
            
            setTimeout(() => {
                try {
                    this.commands[matchedCommand]();
                } catch (error) {
                    console.error('❌ Command execution error:', error);
                    this.showSiriResponse("Sorry, I couldn't complete that action.");
                }
                this.isProcessing = false;
            }, 1000);
        } else {
            this.handleNaturalLanguage(transcript);
            this.isProcessing = false;
        }
    }
    
    findBestMatch(command) {
        // Exact matches first
        for (const cmd of Object.keys(this.commands)) {
            if (command === cmd || command.includes(cmd)) {
                return cmd;
            }
        }
        
        // Fuzzy matching
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
        if (command.includes('go') || command.includes('open') || command.includes('switch')) {
            if (command.includes('workout')) {
                this.showSiriResponse("Opening workouts page");
                this.navigateTo('/workouts');
            } else if (command.includes('nutrition')) {
                this.showSiriResponse("Opening nutrition page");
                this.navigateTo('/nutrition');
            } else if (command.includes('dashboard')) {
                this.showSiriResponse("Opening dashboard");
                this.navigateTo('/dashboard');
            } else {
                this.showSiriResponse("I'm not sure which page you want. Try being more specific.");
            }
        } else {
            this.showSiriResponse("I didn't understand that. Try saying 'help' to see what I can do.");
        }
    }
    
    getCommandAcknowledgment(command) {
        const acknowledgments = {
            'workouts': 'Opening workouts page',
            'dashboard': 'Opening dashboard',
            'nutrition': 'Opening nutrition page',
            'help': 'Here\'s what I can help you with'
        };
        
        return acknowledgments[command] || 'Got it';
    }
    
    // Navigation with token preservation
    navigateTo(path) {
        const currentUrl = new URL(window.location.href);
        const token = currentUrl.searchParams.get('token');
        
        let targetUrl = path;
        if (token) {
            targetUrl += `?token=${token}`;
        }
        
        console.log('🔄 Navigating to:', targetUrl);
        
        setTimeout(() => {
            window.location.href = targetUrl;
        }, 1500);
    }
    
    // Data reading methods (simplified for Vercel)
    async loadUserData() {
        try {
            const response = await fetch('/api/dashboard-data');
            if (response.ok) {
                const data = await response.json();
                this.userData = data.data;
                console.log('✅ User data loaded');
            }
        } catch (error) {
            console.error('❌ Failed to load user data:', error);
        }
    }
    
    async readNutritionSummary() {
        try {
            await this.loadUserData();
            if (!this.userData) {
                this.showSiriResponse("I couldn't load your nutrition data.");
                return;
            }
            
            const stats = this.userData.stats;
            const calories = stats.todayCalories || 0;
            const protein = stats.todayProtein || 0;
            
            this.showSiriResponse(`Today you've consumed ${calories} calories and ${protein} grams of protein.`);
            
        } catch (error) {
            this.showSiriResponse("I'm having trouble accessing your nutrition data.");
        }
    }
    
    async readCaloriesToday() {
        try {
            await this.loadUserData();
            const calories = this.userData?.stats?.todayCalories || 0;
            this.showSiriResponse(`You've consumed ${calories} calories today.`);
        } catch (error) {
            this.showSiriResponse("I couldn't get your calorie information.");
        }
    }
    
    async readWorkoutSummary() {
        try {
            await this.loadUserData();
            const weeklyCount = this.userData?.stats?.workoutsThisWeek || 0;
            this.showSiriResponse(`You've completed ${weeklyCount} workouts this week.`);
        } catch (error) {
            this.showSiriResponse("I couldn't get your workout information.");
        }
    }
    
    // Action methods
    logout() {
        this.showSiriResponse("Logging you out. Goodbye!");
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
    }
    
    showHelp() {
        const helpText = "I can help you navigate pages, read your fitness data, and answer questions. Try saying 'go to workouts' or 'nutrition summary'.";
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
    
    greet() {
        const greetings = [
            "Hello! How can I help you with your fitness journey?",
            "Hi there! What would you like me to help you with?",
            "Hey! I'm here to help. What do you need?"
        ];
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        this.showSiriResponse(randomGreeting);
    }
    
    // Enhanced speech synthesis for Vercel
    speak(text) {
        if (!this.synthesis) {
            console.log('❌ Speech synthesis not available');
            return;
        }
        
        try {
            this.synthesis.cancel(); // Cancel any ongoing speech
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = this.voiceSettings.rate;
            utterance.pitch = this.voiceSettings.pitch;
            utterance.volume = this.voiceSettings.volume;
            
            // Enhanced error handling
            utterance.onerror = (event) => {
                console.error('❌ Speech synthesis error:', event.error);
            };
            
            utterance.onend = () => {
                console.log('✅ Speech synthesis completed');
            };
            
            if (this.voiceSettings.voice) {
                const voices = this.synthesis.getVoices();
                const selectedVoice = voices.find(voice => voice.name === this.voiceSettings.voice);
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }
            }
            
            this.synthesis.speak(utterance);
            
        } catch (error) {
            console.error('❌ Failed to speak:', error);
        }
    }
    
    // Utility methods
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
    
    // UI Methods (same as original but with enhanced error handling)
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
            <div id="voice-status" class="voice-status"></div>
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
        
        // Add event listeners with error handling
        micButton.addEventListener('mousedown', () => {
            try {
                this.startListening();
            } catch (error) {
                console.error('❌ Error starting listening:', error);
            }
        });
        
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
            
            .voice-status {
                position: absolute;
                bottom: -25px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 10px;
                color: white;
                background: rgba(0, 0, 0, 0.7);
                padding: 2px 6px;
                border-radius: 10px;
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .voice-status.ready { opacity: 1; background: rgba(0, 200, 0, 0.8); }
            .voice-status.error { opacity: 1; background: rgba(200, 0, 0, 0.8); }
            .voice-status.permission-denied { opacity: 1; background: rgba(255, 165, 0, 0.8); }
            
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
            modal.style.display = 'none';
            this.isModalOpen = false;
            this.currentTranscript = '';
            this.updateTranscriptDisplay('');
            this.updateResponseDisplay('');
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

// Initialize Vercel-optimized voice assistant
let vercelVoiceAssistant;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize on all pages except login/signup
    if (!window.location.pathname.includes('login') && 
        !window.location.pathname.includes('signup') && 
        !window.location.pathname.includes('forgot-password') &&
        !window.location.pathname.includes('reset-password')) {
        
        console.log('🚀 Initializing Vercel Voice Assistant...');
        vercelVoiceAssistant = new VercelVoiceAssistant();
        window.vercelVoiceAssistant = vercelVoiceAssistant;
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VercelVoiceAssistant;
}