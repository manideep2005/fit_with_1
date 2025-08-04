/**
 * Enhanced Fit-With-AI Voice Assistant
 * Comprehensive voice commands tailored for fitness and health management
 */

class FitWithAIVoiceAssistant {
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
            console.log('Fit-With-AI Voice Assistant is disabled');
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
        console.log('Fit-With-AI Voice Assistant initialized - Press and hold Space or click microphone');
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
            'home': () => this.navigateTo('/dashboard'),
            'take me home': () => this.navigateTo('/dashboard'),
            'main page': () => this.navigateTo('/dashboard'),
            
            'workouts': () => this.navigateTo('/workouts'),
            'go to workouts': () => this.navigateTo('/workouts'),
            'workout page': () => this.navigateTo('/workouts'),
            'exercise page': () => this.navigateTo('/workouts'),
            'training': () => this.navigateTo('/workouts'),
            'fitness': () => this.navigateTo('/workouts'),
            
            'nutrition': () => this.navigateTo('/nutrition'),
            'go to nutrition': () => this.navigateTo('/nutrition'),
            'food tracking': () => this.navigateTo('/nutrition'),
            'diet': () => this.navigateTo('/nutrition'),
            'calories': () => this.navigateTo('/nutrition'),
            
            'meal planner': () => this.navigateTo('/meal-planner'),
            'meal planning': () => this.navigateTo('/meal-planner'),
            'plan meals': () => this.navigateTo('/meal-planner'),
            'food planner': () => this.navigateTo('/meal-planner'),
            
            'progress': () => this.navigateTo('/progress'),
            'my progress': () => this.navigateTo('/progress'),
            'progress tracking': () => this.navigateTo('/progress'),
            'fitness progress': () => this.navigateTo('/progress'),
            'stats': () => this.navigateTo('/progress'),
            
            'health': () => this.navigateTo('/health'),
            'health metrics': () => this.navigateTo('/health'),
            'vital signs': () => this.navigateTo('/health'),
            'health data': () => this.navigateTo('/health'),
            
            'challenges': () => this.navigateTo('/challenges'),
            'fitness challenges': () => this.navigateTo('/challenges'),
            'competitions': () => this.navigateTo('/challenges'),
            'goals': () => this.navigateTo('/challenges'),
            
            'community': () => this.navigateTo('/community'),
            'social': () => this.navigateTo('/community'),
            'friends': () => this.navigateTo('/community'),
            'groups': () => this.navigateTo('/community'),
            
            'ai coach': () => this.navigateTo('/ai-coach'),
            'coach': () => this.navigateTo('/ai-coach'),
            'personal trainer': () => this.navigateTo('/ai-coach'),
            'ai trainer': () => this.navigateTo('/ai-coach'),
            
            'chat': () => this.navigateTo('/chat'),
            'messages': () => this.navigateTo('/chat'),
            'conversations': () => this.navigateTo('/chat'),
            
            'settings': () => this.navigateTo('/settings'),
            'preferences': () => this.navigateTo('/settings'),
            'account settings': () => this.navigateTo('/settings'),
            
            'nutriscan': () => this.navigateTo('/nutriscan'),
            'scan food': () => this.navigateTo('/nutriscan'),
            'food scanner': () => this.navigateTo('/nutriscan'),
            'barcode scanner': () => this.navigateTo('/nutriscan'),
            
            'biometrics': () => this.navigateTo('/biometrics'),
            'body metrics': () => this.navigateTo('/biometrics'),
            'measurements': () => this.navigateTo('/biometrics'),
            'body composition': () => this.navigateTo('/biometrics'),
            
            'schedule': () => this.navigateTo('/schedule'),
            'calendar': () => this.navigateTo('/schedule'),
            'workout schedule': () => this.navigateTo('/schedule'),
            'my schedule': () => this.navigateTo('/schedule'),
            
            // Fitness-specific data reading commands
            'read nutrition summary': () => this.readNutritionSummary(),
            'nutrition summary': () => this.readNutritionSummary(),
            'todays nutrition': () => this.readNutritionSummary(),
            'what did i eat today': () => this.readNutritionSummary(),
            'food intake': () => this.readNutritionSummary(),
            
            'calories today': () => this.readCaloriesToday(),
            'how many calories': () => this.readCaloriesToday(),
            'calorie count': () => this.readCaloriesToday(),
            'daily calories': () => this.readCaloriesToday(),
            
            'protein today': () => this.readProteinToday(),
            'protein intake': () => this.readProteinToday(),
            'how much protein': () => this.readProteinToday(),
            'daily protein': () => this.readProteinToday(),
            
            'water intake': () => this.readWaterIntake(),
            'hydration': () => this.readWaterIntake(),
            'water consumption': () => this.readWaterIntake(),
            'how much water': () => this.readWaterIntake(),
            
            'workout summary': () => this.readWorkoutSummary(),
            'exercise summary': () => this.readWorkoutSummary(),
            'training summary': () => this.readWorkoutSummary(),
            'fitness summary': () => this.readWorkoutSummary(),
            
            'workouts this week': () => this.readWeeklyWorkouts(),
            'weekly workouts': () => this.readWeeklyWorkouts(),
            'weekly training': () => this.readWeeklyWorkouts(),
            'exercise this week': () => this.readWeeklyWorkouts(),
            
            'last workout': () => this.readLastWorkout(),
            'recent workout': () => this.readLastWorkout(),
            'previous workout': () => this.readLastWorkout(),
            'latest exercise': () => this.readLastWorkout(),
            
            'current weight': () => this.readCurrentWeight(),
            'my weight': () => this.readCurrentWeight(),
            'body weight': () => this.readCurrentWeight(),
            'weight status': () => this.readCurrentWeight(),
            
            'bmi': () => this.readBMI(),
            'body mass index': () => this.readBMI(),
            'my bmi': () => this.readBMI(),
            
            'heart rate': () => this.readHeartRate(),
            'pulse': () => this.readHeartRate(),
            'resting heart rate': () => this.readHeartRate(),
            
            'sleep data': () => this.readSleepData(),
            'sleep quality': () => this.readSleepData(),
            'how did i sleep': () => this.readSleepData(),
            'sleep hours': () => this.readSleepData(),
            
            'steps today': () => this.readStepsToday(),
            'step count': () => this.readStepsToday(),
            'daily steps': () => this.readStepsToday(),
            'how many steps': () => this.readStepsToday(),
            
            // Action commands
            'log workout': () => this.logWorkout(),
            'add workout': () => this.logWorkout(),
            'record exercise': () => this.logWorkout(),
            'track workout': () => this.logWorkout(),
            
            'log meal': () => this.logMeal(),
            'add food': () => this.logMeal(),
            'record meal': () => this.logMeal(),
            'track food': () => this.logMeal(),
            
            'add water': () => this.addWater(),
            'log water': () => this.addWater(),
            'drink water': () => this.addWater(),
            'hydrate': () => this.addWater(),
            
            'weigh in': () => this.logWeight(),
            'log weight': () => this.logWeight(),
            'record weight': () => this.logWeight(),
            'update weight': () => this.logWeight(),
            
            'start workout': () => this.startWorkout(),
            'begin exercise': () => this.startWorkout(),
            'workout now': () => this.startWorkout(),
            'exercise now': () => this.startWorkout(),
            
            'create challenge': () => this.createChallenge(),
            'new challenge': () => this.createChallenge(),
            'start challenge': () => this.createChallenge(),
            
            'join challenge': () => this.joinChallenge(),
            'participate in challenge': () => this.joinChallenge(),
            
            'scan barcode': () => this.scanBarcode(),
            'scan food': () => this.scanBarcode(),
            'use scanner': () => this.scanBarcode(),
            
            // Information and motivation commands
            'help': () => this.showHelp(),
            'what can you do': () => this.showHelp(),
            'commands': () => this.showHelp(),
            'voice commands': () => this.showHelp(),
            
            'motivate me': () => this.motivate(),
            'motivation': () => this.motivate(),
            'inspire me': () => this.motivate(),
            'encourage me': () => this.motivate(),
            
            'fitness tip': () => this.giveFitnessTip(),
            'health tip': () => this.giveHealthTip(),
            'nutrition tip': () => this.giveNutritionTip(),
            'workout tip': () => this.giveWorkoutTip(),
            
            'time': () => this.tellTime(),
            'what time is it': () => this.tellTime(),
            'current time': () => this.tellTime(),
            
            'date': () => this.tellDate(),
            'what date is it': () => this.tellDate(),
            'today date': () => this.tellDate(),
            
            'weather': () => this.getWeather(),
            'todays weather': () => this.getWeather(),
            'weather forecast': () => this.getWeather(),
            
            // Greeting responses
            'hello': () => this.greet(),
            'hi': () => this.greet(),
            'hey': () => this.greet(),
            'good morning': () => this.greetMorning(),
            'good afternoon': () => this.greetAfternoon(),
            'good evening': () => this.greetEvening(),
            
            // System commands
            'logout': () => this.logout(),
            'log out': () => this.logout(),
            'sign out': () => this.logout(),
            'exit': () => this.logout(),
            
            'refresh page': () => this.refreshPage(),
            'reload page': () => this.refreshPage(),
            'refresh': () => this.refreshPage(),
            
            'go back': () => this.goBack(),
            'back': () => this.goBack(),
            'previous page': () => this.goBack()
        };
        
        // Motivational phrases specific to fitness
        this.motivationalPhrases = [
            "You're crushing your fitness goals! Every rep counts!",
            "Your dedication to health is inspiring! Keep pushing forward!",
            "Strong body, strong mind! You've got the power within you!",
            "Progress, not perfection! You're building a healthier you every day!",
            "Your future self will thank you for the effort you're putting in today!",
            "Consistency is the key to success! You're on the right track!",
            "Every workout is a victory! Celebrate your commitment to health!",
            "You're not just building muscle, you're building character!",
            "The hardest part is showing up, and you're already here!",
            "Your body can do it. It's your mind you need to convince!"
        ];
        
        // Fitness tips
        this.fitnessTips = [
            "Remember to warm up before exercising to prevent injuries and improve performance.",
            "Stay hydrated! Aim for at least 8 glasses of water throughout the day.",
            "Progressive overload is key - gradually increase weight, reps, or intensity.",
            "Don't skip rest days - your muscles grow during recovery, not just during workouts.",
            "Focus on compound movements like squats, deadlifts, and push-ups for maximum efficiency.",
            "Listen to your body - pain is different from muscle fatigue.",
            "Consistency beats intensity - it's better to exercise regularly than sporadically.",
            "Mix up your routine every 4-6 weeks to prevent plateaus and boredom."
        ];
        
        // Health tips
        this.healthTips = [
            "Aim for 7-9 hours of quality sleep each night for optimal recovery.",
            "Include protein in every meal to support muscle maintenance and growth.",
            "Take the stairs when possible - small changes add up to big results.",
            "Practice deep breathing exercises to reduce stress and improve focus.",
            "Eat a rainbow of fruits and vegetables for diverse nutrients.",
            "Stand up and move for 2 minutes every hour if you have a desk job.",
            "Regular health check-ups can catch issues early and keep you on track.",
            "Limit processed foods and focus on whole, nutrient-dense options."
        ];
        
        // Nutrition tips
        this.nutritionTips = [
            "Eat protein within 30 minutes after your workout for optimal muscle recovery.",
            "Fill half your plate with vegetables at each meal for maximum nutrients.",
            "Don't skip breakfast - it kickstarts your metabolism for the day.",
            "Choose complex carbs over simple sugars for sustained energy.",
            "Healthy fats like avocados and nuts support hormone production.",
            "Meal prep on weekends to stay on track during busy weekdays.",
            "Read nutrition labels - ingredients are listed by quantity.",
            "Portion control is key - use smaller plates to naturally eat less."
        ];
        
        // Workout tips
        this.workoutTips = [
            "Focus on form over weight - proper technique prevents injuries.",
            "Include both cardio and strength training for complete fitness.",
            "Track your workouts to monitor progress and stay motivated.",
            "Try high-intensity interval training (HIIT) for efficient fat burning.",
            "Don't neglect flexibility - stretch after every workout.",
            "Vary your rep ranges: 1-5 for strength, 6-12 for muscle, 12+ for endurance.",
            "Use the mind-muscle connection - focus on the muscles you're working.",
            "Plan your workouts in advance to stay consistent and focused."
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
        }, 2000);
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
        // Enhanced natural language processing for fitness commands
        if (command.includes('how many') || command.includes('how much')) {
            if (command.includes('calorie') || command.includes('kcal')) {
                this.readCaloriesToday();
            } else if (command.includes('protein')) {
                this.readProteinToday();
            } else if (command.includes('water') || command.includes('hydrat')) {
                this.readWaterIntake();
            } else if (command.includes('step')) {
                this.readStepsToday();
            } else if (command.includes('weight')) {
                this.readCurrentWeight();
            } else {
                this.showSiriResponse("I can tell you about your calories, protein, water intake, steps, or weight. What would you like to know?");
            }
        } else if (command.includes('go to') || command.includes('open') || command.includes('show me')) {
            if (command.includes('workout') || command.includes('exercise') || command.includes('training')) {
                this.showSiriResponse("Opening workouts page");
                this.navigateTo('/workouts');
            } else if (command.includes('nutrition') || command.includes('food') || command.includes('meal')) {
                this.showSiriResponse("Opening nutrition page");
                this.navigateTo('/nutrition');
            } else if (command.includes('progress') || command.includes('stats')) {
                this.showSiriResponse("Opening progress page");
                this.navigateTo('/progress');
            } else if (command.includes('health')) {
                this.showSiriResponse("Opening health page");
                this.navigateTo('/health');
            } else if (command.includes('challenge')) {
                this.showSiriResponse("Opening challenges page");
                this.navigateTo('/challenges');
            } else if (command.includes('community') || command.includes('social')) {
                this.showSiriResponse("Opening community page");
                this.navigateTo('/community');
            } else {
                this.showSiriResponse("I'm not sure which page you want to open. Try being more specific.");
            }
        } else if (command.includes('start') || command.includes('begin')) {
            if (command.includes('workout') || command.includes('exercise')) {
                this.startWorkout();
            } else if (command.includes('challenge')) {
                this.createChallenge();
            } else {
                this.showSiriResponse("What would you like to start? A workout or a challenge?");
            }
        } else if (command.includes('log') || command.includes('add') || command.includes('record')) {
            if (command.includes('workout') || command.includes('exercise')) {
                this.logWorkout();
            } else if (command.includes('meal') || command.includes('food')) {
                this.logMeal();
            } else if (command.includes('water')) {
                this.addWater();
            } else if (command.includes('weight')) {
                this.logWeight();
            } else {
                this.showSiriResponse("What would you like to log? A workout, meal, water, or weight?");
            }
        } else {
            this.showSiriResponse("I didn't understand that. Try saying something like 'go to workouts', 'read nutrition summary', or 'motivate me'. Say 'help' to see all available commands.");
        }
    }
    
    getCommandAcknowledgment(command) {
        const acknowledgments = {
            'workouts': 'Opening your workout page',
            'dashboard': 'Taking you to the dashboard',
            'nutrition': 'Opening nutrition tracking',
            'progress': 'Showing your progress',
            'health': 'Opening health metrics',
            'challenges': 'Loading your challenges',
            'community': 'Opening the community',
            'ai coach': 'Connecting you with your AI coach',
            'meal planner': 'Opening meal planner',
            'nutriscan': 'Opening food scanner',
            'biometrics': 'Loading body metrics',
            'schedule': 'Opening your schedule',
            'chat': 'Opening messages',
            'settings': 'Opening settings',
            'logout': 'Logging you out',
            'read nutrition summary': 'Here\'s your nutrition summary',
            'calories today': 'Checking your calorie intake',
            'protein today': 'Checking your protein intake',
            'water intake': 'Checking your hydration',
            'workout summary': 'Here\'s your workout summary',
            'motivate me': 'Here\'s some motivation for you',
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
            
            if (calories < 1200) {
                summary += " You might want to eat more to meet your daily energy needs.";
            } else if (calories > 2500) {
                summary += " You're doing well with your calorie intake today.";
            }
            
            this.showSiriResponse(summary);
            
        } catch (error) {
            this.showSiriResponse("I'm having trouble accessing your nutrition data right now.");
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
                message += ` You have ${remaining} calories remaining to reach your goal of ${target}.`;
            } else {
                message += ` You've reached your calorie goal for today! Great job!`;
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
            const remaining = target - protein;
            
            let message = `You've consumed ${protein} grams of protein today.`;
            if (remaining > 0) {
                message += ` You need ${remaining} more grams to reach your goal of ${target}.`;
            } else {
                message += ` Excellent! You've met your protein goal!`;
            }
            
            this.showSiriResponse(message);
        } catch (error) {
            this.showSiriResponse("I couldn't get your protein information right now.");
        }
    }
    
    async readWaterIntake() {
        try {
            await this.loadUserData();
            const water = (this.userData?.stats?.todayWater / 1000).toFixed(1) || 0;
            const target = (this.userData?.stats?.targetWater / 1000).toFixed(1) || 2.5;
            
            let message = `You've had ${water} liters of water today out of your ${target} liter goal.`;
            if (water < target) {
                const remaining = (target - water).toFixed(1);
                message += ` Keep hydrating! You need ${remaining} more liters.`;
            } else {
                message += ` Great hydration today!`;
            }
            
            this.showSiriResponse(message);
        } catch (error) {
            this.showSiriResponse("I couldn't get your water intake information right now.");
        }
    }
    
    async readWorkoutSummary() {
        try {
            await this.loadUserData();
            const weeklyCount = this.userData?.stats?.workoutsThisWeek || 0;
            const target = this.userData?.stats?.targetWorkoutsPerWeek || 5;
            const todayWorkouts = this.userData?.stats?.workoutsToday || 0;
            
            let message = `This week you've completed ${weeklyCount} out of ${target} workouts.`;
            if (todayWorkouts > 0) {
                message += ` You've already worked out ${todayWorkouts} time${todayWorkouts > 1 ? 's' : ''} today!`;
            }
            message += " Keep up the excellent work!";
            
            this.showSiriResponse(message);
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
                message += `You need ${remaining} more workout${remaining > 1 ? 's' : ''} to reach your weekly goal. You can do it!`;
            } else {
                message += `Congratulations! You've reached your weekly workout goal! You're a fitness champion!`;
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
                this.showSiriResponse(`Your last workout was ${lastWorkout.type} for ${lastWorkout.duration} minutes, burning ${lastWorkout.calories} calories. Great job!`);
            } else {
                this.showSiriResponse("You haven't logged any workouts recently. Ready to start your fitness journey?");
            }
        } catch (error) {
            this.showSiriResponse("I couldn't find your recent workout information.");
        }
    }
    
    async readCurrentWeight() {
        try {
            await this.loadUserData();
            const weight = this.userData?.latestBiometrics?.weight;
            
            if (weight) {
                this.showSiriResponse(`Your current weight is ${weight} kilograms. Keep tracking your progress!`);
            } else {
                this.showSiriResponse("I don't have your current weight information. You can log it in the biometrics section.");
            }
        } catch (error) {
            this.showSiriResponse("I couldn't get your weight information right now.");
        }
    }
    
    async readBMI() {
        try {
            await this.loadUserData();
            const bmi = this.userData?.latestBiometrics?.bmi;
            
            if (bmi) {
                let category = '';
                if (bmi < 18.5) category = 'underweight';
                else if (bmi < 25) category = 'normal weight';
                else if (bmi < 30) category = 'overweight';
                else category = 'obese';
                
                this.showSiriResponse(`Your current BMI is ${bmi.toFixed(1)}, which is in the ${category} category.`);
            } else {
                this.showSiriResponse("I don't have your BMI information. Please update your height and weight in biometrics.");
            }
        } catch (error) {
            this.showSiriResponse("I couldn't calculate your BMI right now.");
        }
    }
    
    async readHeartRate() {
        try {
            await this.loadUserData();
            const heartRate = this.userData?.latestBiometrics?.heartRate;
            
            if (heartRate) {
                this.showSiriResponse(`Your last recorded heart rate was ${heartRate} beats per minute.`);
            } else {
                this.showSiriResponse("I don't have your heart rate data. You can log it in the health metrics section.");
            }
        } catch (error) {
            this.showSiriResponse("I couldn't get your heart rate information right now.");
        }
    }
    
    async readSleepData() {
        try {
            await this.loadUserData();
            const sleep = this.userData?.latestBiometrics?.sleep;
            
            if (sleep) {
                this.showSiriResponse(`Last night you slept for ${sleep.hours} hours with a quality score of ${sleep.quality}/10.`);
            } else {
                this.showSiriResponse("I don't have your sleep data. You can track it in the health metrics section.");
            }
        } catch (error) {
            this.showSiriResponse("I couldn't get your sleep information right now.");
        }
    }
    
    async readStepsToday() {
        try {
            await this.loadUserData();
            const steps = this.userData?.stats?.stepsToday || 0;
            const target = this.userData?.stats?.targetSteps || 10000;
            
            let message = `You've taken ${steps} steps today.`;
            if (steps < target) {
                const remaining = target - steps;
                message += ` You need ${remaining} more steps to reach your goal of ${target}.`;
            } else {
                message += ` Fantastic! You've reached your step goal!`;
            }
            
            this.showSiriResponse(message);
        } catch (error) {
            this.showSiriResponse("I couldn't get your step count right now.");
        }
    }
    
    // Action methods
    logWorkout() {
        this.showSiriResponse("Opening workout logging for you. Let's track that exercise!");
        const quickLogBtn = document.querySelector('#quickLogBtn, .log-workout-btn, [data-action=\"log-workout\"]');
        if (quickLogBtn) {
            setTimeout(() => {
                quickLogBtn.click();
            }, 1000);
        } else {
            this.navigateTo('/workouts');
        }
    }
    
    logMeal() {
        this.showSiriResponse("Opening meal logging for you. Let's track that nutrition!");
        const quickLogBtn = document.querySelector('#quickLogBtn, .log-meal-btn, [data-action=\"log-meal\"]');
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
            this.showSiriResponse("Adding 250 milliliters of water to your daily intake. Stay hydrated!");
            
            const response = await fetch('/api/nutrition/water', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 250 })
            });
            
            if (response.ok) {
                setTimeout(() => {
                    this.showSiriResponse("Water logged successfully! Great job staying hydrated!");
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
    
    logWeight() {
        this.showSiriResponse("Opening weight logging for you. Let's track your progress!");
        this.navigateTo('/biometrics');
    }
    
    startWorkout() {
        this.showSiriResponse("Let's get moving! Opening your workout options.");
        const startWorkoutBtn = document.querySelector('.start-workout-btn, [data-action=\"start-workout\"]');
        if (startWorkoutBtn) {
            setTimeout(() => {
                startWorkoutBtn.click();
            }, 1000);
        } else {
            this.navigateTo('/workouts');
        }
    }
    
    createChallenge() {
        this.showSiriResponse("Ready to challenge yourself? Opening challenge creation.");
        this.navigateTo('/challenges');
    }
    
    joinChallenge() {
        this.showSiriResponse("Let's find a challenge for you to join!");
        this.navigateTo('/challenges');
    }
    
    scanBarcode() {
        this.showSiriResponse("Opening the food scanner for you.");
        this.navigateTo('/nutriscan');
    }
    
    logout() {
        this.showSiriResponse("Logging you out. Thanks for using Fit-With-AI!");
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
    
    refreshPage() {
        this.showSiriResponse("Refreshing the page for you.");
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
    
    goBack() {
        this.showSiriResponse("Going back to the previous page.");
        setTimeout(() => {
            window.history.back();
        }, 1000);
    }
    
    // Information methods
    showHelp() {
        const helpText = `I'm your Fit-With-AI voice assistant! I can help you navigate pages like "go to workouts", read your fitness data like "nutrition summary", perform actions like "add water" or "log workout", give you motivation and tips, and answer questions about time and weather. Try saying "motivate me", "fitness tip", or "start workout". What would you like me to help you with?`;
        this.showSiriResponse(helpText);
    }
    
    motivate() {
        const randomPhrase = this.motivationalPhrases[Math.floor(Math.random() * this.motivationalPhrases.length)];
        this.showSiriResponse(randomPhrase);
    }
    
    giveFitnessTip() {
        const randomTip = this.fitnessTips[Math.floor(Math.random() * this.fitnessTips.length)];
        this.showSiriResponse(`Here's a fitness tip: ${randomTip}`);
    }
    
    giveHealthTip() {
        const randomTip = this.healthTips[Math.floor(Math.random() * this.healthTips.length)];
        this.showSiriResponse(`Here's a health tip: ${randomTip}`);
    }
    
    giveNutritionTip() {
        const randomTip = this.nutritionTips[Math.floor(Math.random() * this.nutritionTips.length)];
        this.showSiriResponse(`Here's a nutrition tip: ${randomTip}`);
    }
    
    giveWorkoutTip() {
        const randomTip = this.workoutTips[Math.floor(Math.random() * this.workoutTips.length)];
        this.showSiriResponse(`Here's a workout tip: ${randomTip}`);
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
    
    getWeather() {
        // This would typically connect to a weather API
        this.showSiriResponse("I don't have access to weather data right now, but it's always a great day for a workout!");
    }
    
    greet() {
        const greetings = [
            "Hello! Ready to crush your fitness goals today?",
            "Hi there! How can I help you on your fitness journey?",
            "Hey! I'm here to support your health and wellness. What do you need?",
            "Good to see you! Let's make today a great day for your fitness!"
        ];
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        this.showSiriResponse(randomGreeting);
    }
    
    greetMorning() {
        const morningGreetings = [
            "Good morning! Ready to start your day with some energy and movement?",
            "Morning! Let's make today amazing for your health and fitness!",
            "Good morning, fitness champion! What's on your workout agenda today?"
        ];
        const randomGreeting = morningGreetings[Math.floor(Math.random() * morningGreetings.length)];
        this.showSiriResponse(randomGreeting);
    }
    
    greetAfternoon() {
        const afternoonGreetings = [
            "Good afternoon! How's your fitness day going so far?",
            "Afternoon! Perfect time for a workout or healthy snack!",
            "Good afternoon! Let's keep that energy up for the rest of the day!"
        ];
        const randomGreeting = afternoonGreetings[Math.floor(Math.random() * afternoonGreetings.length)];
        this.showSiriResponse(randomGreeting);
    }
    
    greetEvening() {
        const eveningGreetings = [
            "Good evening! How did your fitness goals go today?",
            "Evening! Time to wind down and plan tomorrow's healthy choices!",
            "Good evening! Don't forget to track your progress from today!"
        ];
        const randomGreeting = eveningGreetings[Math.floor(Math.random() * eveningGreetings.length)];
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
        if (document.getElementById('fitwithai-voice-assistant')) return;
        
        // Create floating microphone button
        const micButton = document.createElement('div');
        micButton.id = 'fitwithai-mic-button';
        micButton.innerHTML = `
            <div class="fitwithai-mic-icon">
                <i class="fas fa-microphone"></i>
            </div>
            <div class="fitwithai-mic-hint">Fit-With-AI Voice</div>
        `;
        
        // Create Siri modal
        const modal = document.createElement('div');
        modal.id = 'fitwithai-modal';
        modal.innerHTML = `
            <div class="fitwithai-modal-content">
                <div class="fitwithai-animation">
                    <div class="fitwithai-wave"></div>
                    <div class="fitwithai-wave"></div>
                    <div class="fitwithai-wave"></div>
                    <div class="fitwithai-wave"></div>
                    <div class="fitwithai-wave"></div>
                </div>
                <div class="fitwithai-transcript" id="fitwithai-transcript">Listening...</div>
                <div class="fitwithai-response" id="fitwithai-response"></div>
                <div class="fitwithai-hint">Hold Space to speak or click the microphone</div>
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
        if (document.getElementById('fitwithai-voice-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'fitwithai-voice-styles';
        style.textContent = `
            #fitwithai-mic-button {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 70px;
                height: 70px;
                background: linear-gradient(135deg, #6C63FF, #4D44DB);
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(108, 99, 255, 0.4);
                z-index: 10000;
                transition: all 0.3s ease;
                user-select: none;
            }
            
            #fitwithai-mic-button:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 25px rgba(108, 99, 255, 0.5);
            }
            
            #fitwithai-mic-button:active {
                transform: scale(0.95);
            }
            
            .fitwithai-mic-icon {
                color: white;
                font-size: 26px;
                margin-bottom: 2px;
            }
            
            .fitwithai-mic-hint {
                color: white;
                font-size: 9px;
                font-weight: 600;
                text-align: center;
                opacity: 0.9;
                line-height: 1;
            }
            
            #fitwithai-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(20px);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 20000;
                animation: fadeIn 0.3s ease-out;
            }
            
            .fitwithai-modal-content {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                max-width: 500px;
                width: 90%;
                backdrop-filter: blur(20px);
            }
            
            .fitwithai-animation {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 4px;
                margin-bottom: 30px;
                height: 60px;
            }
            
            .fitwithai-wave {
                width: 4px;
                background: linear-gradient(to top, #6C63FF, #4D44DB);
                border-radius: 2px;
                animation: fitwithaiWave 1.5s ease-in-out infinite;
            }
            
            .fitwithai-wave:nth-child(1) { animation-delay: 0s; height: 20px; }
            .fitwithai-wave:nth-child(2) { animation-delay: 0.1s; height: 30px; }
            .fitwithai-wave:nth-child(3) { animation-delay: 0.2s; height: 40px; }
            .fitwithai-wave:nth-child(4) { animation-delay: 0.3s; height: 30px; }
            .fitwithai-wave:nth-child(5) { animation-delay: 0.4s; height: 20px; }
            
            .fitwithai-transcript {
                color: white;
                font-size: 18px;
                font-weight: 500;
                margin-bottom: 20px;
                min-height: 25px;
                opacity: 0.9;
            }
            
            .fitwithai-response {
                color: #6C63FF;
                font-size: 16px;
                font-weight: 400;
                margin-bottom: 20px;
                min-height: 20px;
                line-height: 1.4;
            }
            
            .fitwithai-hint {
                color: rgba(255, 255, 255, 0.6);
                font-size: 14px;
                font-weight: 400;
            }
            
            @keyframes fitwithaiWave {
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
            
            .fitwithai-modal-closing {
                animation: fadeOut 0.3s ease-in;
            }
            
            /* Responsive design */
            @media (max-width: 768px) {
                #fitwithai-mic-button {
                    bottom: 20px;
                    right: 20px;
                    width: 60px;
                    height: 60px;
                }
                
                .fitwithai-mic-icon {
                    font-size: 22px;
                }
                
                .fitwithai-mic-hint {
                    font-size: 8px;
                }
                
                .fitwithai-modal-content {
                    padding: 30px 20px;
                }
                
                .fitwithai-transcript {
                    font-size: 16px;
                }
                
                .fitwithai-response {
                    font-size: 14px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    openSiriModal() {
        const modal = document.getElementById('fitwithai-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.isModalOpen = true;
            this.updateSiriUI('listening');
        }
    }
    
    closeSiriModal() {
        const modal = document.getElementById('fitwithai-modal');
        if (modal && this.isModalOpen) {
            modal.classList.add('fitwithai-modal-closing');
            setTimeout(() => {
                modal.style.display = 'none';
                modal.classList.remove('fitwithai-modal-closing');
                this.isModalOpen = false;
                this.currentTranscript = '';
                this.updateTranscriptDisplay('');
                this.updateResponseDisplay('');
            }, 300);
        }
    }
    
    updateSiriUI(status) {
        const waves = document.querySelectorAll('.fitwithai-wave');
        const transcript = document.getElementById('fitwithai-transcript');
        
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
        const transcript = document.getElementById('fitwithai-transcript');
        if (transcript) {
            transcript.textContent = text || 'Listening...';
        }
    }
    
    updateResponseDisplay(text) {
        const response = document.getElementById('fitwithai-response');
        if (response) {
            response.textContent = text;
        }
    }
    
    showSiriResponse(text) {
        this.updateResponseDisplay(text);
        this.speak(text);
    }
}

// Initialize Fit-With-AI Voice Assistant when page loads
let fitWithAIVoiceAssistant;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize on all pages except login/signup/landing
    if (!window.location.pathname.includes('login') && 
        !window.location.pathname.includes('signup') && 
        !window.location.pathname.includes('forgot-password') &&
        !window.location.pathname.includes('reset-password') &&
        window.location.pathname !== '/') {
        
        fitWithAIVoiceAssistant = new FitWithAIVoiceAssistant();
        window.fitWithAIVoiceAssistant = fitWithAIVoiceAssistant;
        console.log('Fit-With-AI Voice Assistant initialized with enhanced fitness commands');
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FitWithAIVoiceAssistant;
}