/**
 * Enhanced Voice AI Assistant for Fit-With-AI
 * Siri-like functionality with comprehensive fitness features
 */

class EnhancedVoiceAssistant {
    constructor() {
        this.isListening = false;
        this.isProcessingCommand = false;
        this.isAwake = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.wakeWord = localStorage.getItem('voiceAssistantWakeWord') || 'hey fit-with';
        this.isEnabled = localStorage.getItem('voiceAssistantEnabled') !== 'false';
        this.conversationContext = null;
        this.lastCommand = null;
        this.userData = null;
        
        // Voice settings
        this.voiceSettings = {
            rate: parseFloat(localStorage.getItem('voiceAssistantRate')) || 0.9,
            pitch: parseFloat(localStorage.getItem('voiceAssistantPitch')) || 1.0,
            volume: parseFloat(localStorage.getItem('voiceAssistantVolume')) || 1.0,
            voice: localStorage.getItem('voiceAssistantVoice') || null
        };
        
        // Initialize comprehensive command system
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
        this.startListening();
        this.showNotification(`Voice assistant activated! Say "${this.wakeWord}" to start`, 'success');
    }
    
    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 3;
        
        this.recognition.onstart = () => {
            console.log('Voice recognition started');
            this.updateVoiceIndicator('listening');
        };
        
        this.recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            
            console.log('Voice input:', transcript);
            this.processVoiceInput(transcript.toLowerCase().trim());
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                this.showNotification('Microphone access denied. Please enable microphone permissions.', 'error');
            } else if (event.error === 'network') {
                this.showNotification('Network error. Please check your connection.', 'error');
            }
        };
        
        this.recognition.onend = () => {
            if (this.isListening && this.isEnabled) {
                setTimeout(() => {
                    if (this.isListening) {
                        this.recognition.start();
                    }
                }, 1000);
            }
            this.updateVoiceIndicator('idle');
        };
    }
    
    initializeCommands() {
        this.commands = {
            // Navigation commands
            'dashboard': () => this.navigate('/dashboard'),
            'go to dashboard': () => this.navigate('/dashboard'),
            'show dashboard': () => this.navigate('/dashboard'),
            'workouts': () => this.navigate('/workouts'),
            'go to workouts': () => this.navigate('/workouts'),
            'show workouts': () => this.navigate('/workouts'),
            'nutrition': () => this.navigate('/nutrition'),
            'go to nutrition': () => this.navigate('/nutrition'),
            'show nutrition': () => this.navigate('/nutrition'),
            'meal planner': () => this.navigate('/meal-planner'),
            'go to meal planner': () => this.navigate('/meal-planner'),
            'progress': () => this.navigate('/progress'),
            'go to progress': () => this.navigate('/progress'),
            'show progress': () => this.navigate('/progress'),
            'health': () => this.navigate('/health'),
            'go to health': () => this.navigate('/health'),
            'challenges': () => this.navigate('/challenges'),
            'go to challenges': () => this.navigate('/challenges'),
            'community': () => this.navigate('/community'),
            'go to community': () => this.navigate('/community'),
            'ai coach': () => this.navigate('/ai-coach'),
            'go to ai coach': () => this.navigate('/ai-coach'),
            'chat': () => this.navigate('/chat'),
            'go to chat': () => this.navigate('/chat'),
            'settings': () => this.navigate('/settings'),
            'go to settings': () => this.navigate('/settings'),
            
            // Data reading commands
            'read nutrition summary': () => this.readNutritionSummary(),
            'read today nutrition': () => this.readNutritionSummary(),
            'read todays nutrition': () => this.readNutritionSummary(),
            'nutrition summary': () => this.readNutritionSummary(),
            'todays nutrition': () => this.readNutritionSummary(),
            'what did i eat today': () => this.readNutritionSummary(),
            'how many calories today': () => this.readCaloriesToday(),
            'calories today': () => this.readCaloriesToday(),
            'protein today': () => this.readProteinToday(),
            'water intake': () => this.readWaterIntake(),
            'how much water': () => this.readWaterIntake(),
            
            'read workout summary': () => this.readWorkoutSummary(),
            'workout summary': () => this.readWorkoutSummary(),
            'workouts this week': () => this.readWeeklyWorkouts(),
            'weekly workouts': () => this.readWeeklyWorkouts(),
            'last workout': () => this.readLastWorkout(),
            'recent workout': () => this.readLastWorkout(),
            
            'read progress': () => this.readProgressSummary(),
            'progress summary': () => this.readProgressSummary(),
            'my progress': () => this.readProgressSummary(),
            'how am i doing': () => this.readProgressSummary(),
            'fitness progress': () => this.readProgressSummary(),
            
            'read weight': () => this.readCurrentWeight(),
            'current weight': () => this.readCurrentWeight(),
            'my weight': () => this.readCurrentWeight(),
            'weight today': () => this.readCurrentWeight(),
            
            'read goals': () => this.readFitnessGoals(),
            'fitness goals': () => this.readFitnessGoals(),
            'my goals': () => this.readFitnessGoals(),
            
            'read stats': () => this.readDailyStats(),
            'daily stats': () => this.readDailyStats(),
            'todays stats': () => this.readDailyStats(),
            'show stats': () => this.readDailyStats(),
            
            // Action commands
            'log out': () => this.logout(),
            'logout': () => this.logout(),
            'sign out': () => this.logout(),
            'log workout': () => this.logWorkout(),
            'add workout': () => this.logWorkout(),
            'start workout': () => this.startWorkout(),
            'log meal': () => this.logMeal(),
            'add meal': () => this.logMeal(),
            'log food': () => this.logMeal(),
            'add food': () => this.logMeal(),
            'add water': () => this.addWater(),
            'log water': () => this.addWater(),
            'drink water': () => this.addWater(),
            
            // Information commands
            'help': () => this.showHelp(),
            'what can you do': () => this.showHelp(),
            'commands': () => this.showCommands(),
            'what time is it': () => this.tellTime(),
            'what is the time': () => this.tellTime(),
            'time': () => this.tellTime(),
            'what is the date': () => this.tellDate(),
            'what date is it': () => this.tellDate(),
            'date': () => this.tellDate(),
            'today': () => this.tellDate(),
            
            // Motivational commands
            'motivate me': () => this.motivate(),
            'give me motivation': () => this.motivate(),
            'encourage me': () => this.motivate(),
            'i need motivation': () => this.motivate(),
            'inspire me': () => this.motivate(),
            
            // Health commands
            'bmi': () => this.readBMI(),
            'body mass index': () => this.readBMI(),
            'my bmi': () => this.readBMI(),
            'health summary': () => this.readHealthSummary(),
            'biometrics': () => this.readBiometrics(),
            
            // Challenge commands
            'challenges': () => this.readChallenges(),
            'active challenges': () => this.readChallenges(),
            'my challenges': () => this.readChallenges(),
            
            // Voice assistant settings
            'stop listening': () => this.stopListening(),
            'disable voice': () => this.disable(),
            'mute': () => this.mute(),
            'unmute': () => this.unmute(),
            'change wake word': () => this.changeWakeWord(),
            'voice settings': () => this.openSettings()
        };
        
        this.motivationalPhrases = [
            "You're doing amazing! Keep pushing towards your fitness goals!",
            "Every workout counts! You're building a stronger, healthier you!",
            "Consistency is key! You've got this!",
            "Your dedication to fitness is inspiring! Keep it up!",
            "Remember, progress not perfection! You're on the right track!",
            "Your future self will thank you for the effort you're putting in today!",
            "Strong mind, strong body! You're capable of amazing things!",
            "Each day is a new opportunity to get closer to your goals!",
            "You're not just changing your body, you're changing your life!",
            "Every healthy choice you make is an investment in yourself!"
        ];
    }
    
    async loadUserData() {
        try {
            const response = await fetch('/api/dashboard-data');
            if (response.ok) {
                const data = await response.json();
                this.userData = data.data;
                console.log('User data loaded for voice assistant:', this.userData);
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }
    
    processVoiceInput(transcript) {
        // Check for wake word
        if (transcript.includes(this.wakeWord.toLowerCase())) {
            this.isAwake = true;
            this.updateVoiceIndicator('active');
            this.speak("Yes, how can I help you?");
            
            // Extract command after wake word
            const commandStart = transcript.indexOf(this.wakeWord.toLowerCase()) + this.wakeWord.length;
            const command = transcript.substring(commandStart).trim();
            
            if (command) {
                this.executeCommand(command);
            } else {
                // Wait for next command
                this.isProcessingCommand = true;
                setTimeout(() => {
                    this.isProcessingCommand = false;
                    this.isAwake = false;
                    this.updateVoiceIndicator('listening');
                }, 8000); // 8 seconds to give command
            }
        } else if (this.isAwake || this.isProcessingCommand) {
            // Process command if we're in command mode
            this.executeCommand(transcript);
            this.isProcessingCommand = false;
            this.isAwake = false;
            this.updateVoiceIndicator('listening');
        }
    }
    
    executeCommand(command) {
        console.log('Executing command:', command);
        this.lastCommand = command;
        
        // Find exact or partial matches
        const matchedCommand = this.findBestMatch(command);
        
        if (matchedCommand) {
            this.speak(`${this.getCommandAcknowledgment(matchedCommand)}`);
            setTimeout(() => {
                this.commands[matchedCommand]();
            }, 500);
        } else {
            // Try to handle natural language queries
            this.handleNaturalLanguage(command);
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
        // Handle natural language queries
        if (command.includes('how many') && command.includes('calorie')) {
            this.readCaloriesToday();
        } else if (command.includes('what did i') && (command.includes('eat') || command.includes('food'))) {
            this.readNutritionSummary();
        } else if (command.includes('how much') && command.includes('water')) {
            this.readWaterIntake();
        } else if (command.includes('weight') && (command.includes('current') || command.includes('today'))) {
            this.readCurrentWeight();
        } else if (command.includes('workout') && command.includes('week')) {
            this.readWeeklyWorkouts();
        } else if (command.includes('progress') || command.includes('doing')) {
            this.readProgressSummary();
        } else {
            this.speak("I didn't understand that command. Say 'help' to see what I can do, or try rephrasing your request.");
        }
    }
    
    getCommandAcknowledgment(command) {
        const acknowledgments = {
            'read nutrition summary': 'Reading your nutrition summary',
            'read workout summary': 'Getting your workout information',
            'read progress': 'Checking your progress',
            'logout': 'Logging you out',
            'dashboard': 'Opening dashboard',
            'workouts': 'Opening workouts',
            'nutrition': 'Opening nutrition',
            'help': 'Here\'s what I can help you with'
        };
        
        return acknowledgments[command] || 'Got it';
    }
    
    // Data reading methods
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
            const water = stats.todayWater || 0;
            const targetCalories = stats.targetCalories || 2000;
            const targetProtein = stats.targetProtein || 150;
            const targetWater = stats.targetWater || 2500;
            
            let summary = `Here's your nutrition summary for today: `;
            summary += `You've consumed ${calories} out of ${targetCalories} calories, `;
            summary += `${protein} grams out of ${targetProtein} grams of protein, `;
            summary += `and ${water} milliliters out of ${targetWater} milliliters of water. `;
            
            // Add progress assessment
            const calorieProgress = (calories / targetCalories) * 100;
            const proteinProgress = (protein / targetProtein) * 100;
            const waterProgress = (water / targetWater) * 100;
            
            if (calorieProgress < 50) {
                summary += `You're behind on your calorie goal. `;
            } else if (calorieProgress > 110) {
                summary += `You've exceeded your calorie goal. `;
            } else {
                summary += `You're on track with your calories. `;
            }
            
            if (proteinProgress < 70) {
                summary += `Consider adding more protein to reach your goal. `;
            }
            
            if (waterProgress < 60) {
                summary += `Don't forget to stay hydrated!`;
            }
            
            this.speak(summary);
            
        } catch (error) {
            console.error('Error reading nutrition summary:', error);
            this.speak("I'm having trouble accessing your nutrition data. Please try again later.");
        }
    }
    
    async readCaloriesToday() {
        try {
            await this.loadUserData();
            const calories = this.userData?.stats?.todayCalories || 0;
            const target = this.userData?.stats?.targetCalories || 2000;
            const remaining = target - calories;
            
            let message = `You've consumed ${calories} calories today. `;
            if (remaining > 0) {
                message += `You have ${remaining} calories remaining to reach your goal.`;
            } else {
                message += `You've reached your calorie goal for today!`;
            }
            
            this.speak(message);
        } catch (error) {
            this.speak("I couldn't get your calorie information right now.");
        }
    }
    
    async readProteinToday() {
        try {
            await this.loadUserData();
            const protein = this.userData?.stats?.todayProtein || 0;
            const target = this.userData?.stats?.targetProtein || 150;
            
            this.speak(`You've consumed ${protein} grams of protein today out of your ${target} gram goal.`);
        } catch (error) {
            this.speak("I couldn't get your protein information right now.");
        }
    }
    
    async readWaterIntake() {
        try {
            await this.loadUserData();
            const water = this.userData?.stats?.todayWater || 0;
            const target = this.userData?.stats?.targetWater || 2500;
            const waterInLiters = (water / 1000).toFixed(1);
            const targetInLiters = (target / 1000).toFixed(1);
            
            this.speak(`You've had ${waterInLiters} liters of water today out of your ${targetInLiters} liter goal.`);
        } catch (error) {
            this.speak("I couldn't get your water intake information right now.");
        }
    }
    
    async readWorkoutSummary() {
        try {
            await this.loadUserData();
            const workouts = this.userData?.recentWorkouts || [];
            const weeklyCount = this.userData?.stats?.workoutsThisWeek || 0;
            const target = this.userData?.stats?.targetWorkoutsPerWeek || 5;
            
            let summary = `You've completed ${weeklyCount} out of ${target} workouts this week. `;
            
            if (workouts.length > 0) {
                const lastWorkout = workouts[workouts.length - 1];
                summary += `Your most recent workout was ${lastWorkout.type} for ${lastWorkout.duration} minutes, burning approximately ${lastWorkout.calories} calories.`;
            } else {
                summary += `You haven't logged any workouts recently. Ready to start one?`;
            }
            
            this.speak(summary);
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
                const date = new Date(lastWorkout.date).toLocaleDateString();
                this.speak(`Your last workout was ${lastWorkout.type} on ${date}, lasting ${lastWorkout.duration} minutes and burning ${lastWorkout.calories} calories.`);
            } else {
                this.speak("You haven't logged any workouts recently. Would you like to start one now?");
            }
        } catch (error) {
            this.speak("I couldn't find your recent workout information.");
        }
    }
    
    async readProgressSummary() {
        try {
            await this.loadUserData();
            const stats = this.userData?.stats;
            const user = this.userData?.user;
            
            let summary = `Here's your fitness progress summary: `;
            summary += `This week you've completed ${stats?.workoutsThisWeek || 0} out of ${stats?.targetWorkoutsPerWeek || 5} workouts. `;
            summary += `Today you've consumed ${stats?.todayCalories || 0} calories and ${(stats?.todayWater / 1000 || 0).toFixed(1)} liters of water. `;
            
            if (this.userData?.latestBiometrics?.weight) {
                summary += `Your current weight is ${this.userData.latestBiometrics.weight} kilograms. `;
            }
            
            // Add motivational message based on progress
            const workoutProgress = (stats?.workoutsThisWeek || 0) / (stats?.targetWorkoutsPerWeek || 5);
            if (workoutProgress >= 0.8) {
                summary += `You're doing excellent with your workout consistency!`;
            } else if (workoutProgress >= 0.5) {
                summary += `You're making good progress. Keep it up!`;
            } else {
                summary += `There's room for improvement. You can do this!`;
            }
            
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
                this.speak("I don't have your current weight information. You can log it in the biometrics section.");
            }
        } catch (error) {
            this.speak("I couldn't get your weight information right now.");
        }
    }
    
    async readFitnessGoals() {
        try {
            await this.loadUserData();
            const goals = this.userData?.user?.fitnessGoals;
            
            if (goals) {
                let message = `Your fitness goals are: `;
                if (goals.primaryGoal) {
                    message += `Your primary goal is ${goals.primaryGoal}. `;
                }
                if (goals.targetWeight) {
                    message += `Your target weight is ${goals.targetWeight} kilograms. `;
                }
                if (goals.workoutFrequency) {
                    message += `You aim to workout ${goals.workoutFrequency} times per week.`;
                }
                
                this.speak(message);
            } else {
                this.speak("I don't have your fitness goals information. You can set them in your profile settings.");
            }
        } catch (error) {
            this.speak("I couldn't get your fitness goals right now.");
        }
    }
    
    async readDailyStats() {
        try {
            await this.loadUserData();
            const stats = this.userData?.stats;
            
            let summary = `Here are your daily statistics: `;
            summary += `Calories consumed: ${stats?.todayCalories || 0}. `;
            summary += `Protein: ${stats?.todayProtein || 0} grams. `;
            summary += `Water: ${(stats?.todayWater / 1000 || 0).toFixed(1)} liters. `;
            summary += `Workouts this week: ${stats?.workoutsThisWeek || 0}.`;
            
            this.speak(summary);
        } catch (error) {
            this.speak("I couldn't get your daily statistics right now.");
        }
    }
    
    async readBMI() {
        try {
            await this.loadUserData();
            const bmi = this.userData?.bmi;
            
            if (bmi) {
                let category = '';
                if (bmi < 18.5) category = 'underweight';
                else if (bmi < 25) category = 'normal weight';
                else if (bmi < 30) category = 'overweight';
                else category = 'obese';
                
                this.speak(`Your BMI is ${bmi.toFixed(1)}, which is in the ${category} category.`);
            } else {
                this.speak("I don't have your BMI information. Please update your height and weight in your profile.");
            }
        } catch (error) {
            this.speak("I couldn't calculate your BMI right now.");
        }
    }
    
    async readHealthSummary() {
        try {
            await this.loadUserData();
            const user = this.userData?.user;
            const biometrics = this.userData?.latestBiometrics;
            
            let summary = `Here's your health summary: `;
            
            if (biometrics?.weight) {
                summary += `Weight: ${biometrics.weight} kilograms. `;
            }
            
            if (this.userData?.bmi) {
                summary += `BMI: ${this.userData.bmi.toFixed(1)}. `;
            }
            
            if (biometrics?.bodyFat) {
                summary += `Body fat: ${biometrics.bodyFat} percent. `;
            }
            
            if (user?.healthInfo?.smokingStatus) {
                summary += `Smoking status: ${user.healthInfo.smokingStatus}. `;
            }
            
            this.speak(summary);
        } catch (error) {
            this.speak("I couldn't get your complete health information right now.");
        }
    }
    
    async readBiometrics() {
        try {
            await this.loadUserData();
            const biometrics = this.userData?.latestBiometrics;
            
            if (biometrics) {
                let summary = `Your latest biometric data: `;
                if (biometrics.weight) summary += `Weight: ${biometrics.weight} kilograms. `;
                if (biometrics.bodyFat) summary += `Body fat: ${biometrics.bodyFat} percent. `;
                if (biometrics.muscleMass) summary += `Muscle mass: ${biometrics.muscleMass} kilograms.`;
                
                this.speak(summary);
            } else {
                this.speak("I don't have your biometric data. You can log it in the biometrics section.");
            }
        } catch (error) {
            this.speak("I couldn't get your biometric information right now.");
        }
    }
    
    async readChallenges() {
        try {
            const response = await fetch('/api/challenges/active');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.challenges?.length > 0) {
                    this.speak(`You have ${data.challenges.length} active challenges. Would you like me to read them?`);
                } else {
                    this.speak("You don't have any active challenges. Visit the challenges page to join some!");
                }
            } else {
                this.speak("I couldn't get your challenge information right now.");
            }
        } catch (error) {
            this.speak("I couldn't access your challenges right now.");
        }
    }
    
    // Action methods
    navigate(path) {
        const pageName = path.replace('/', '').replace('-', ' ');
        this.speak(`Navigating to ${pageName}`);
        setTimeout(() => {
            window.location.href = path;
        }, 1000);
    }
    
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
        this.speak("Opening workout logging. You can add your workout details here.");
        // Try to open quick log modal if available
        const quickLogBtn = document.querySelector('[data-action="quick-log"]') || 
                           document.querySelector('#quickLogBtn') ||
                           document.querySelector('.quick-log-btn');
        
        if (quickLogBtn) {
            quickLogBtn.click();
            setTimeout(() => {
                const workoutOption = document.querySelector('[value="workout"]');
                if (workoutOption) workoutOption.selected = true;
            }, 500);
        } else {
            this.navigate('/workouts');
        }
    }
    
    startWorkout() {
        this.speak("Let's find a great workout for you!");
        this.navigate('/workouts');
    }
    
    logMeal() {
        this.speak("Opening meal logging. You can add your food here.");
        const quickLogBtn = document.querySelector('[data-action="quick-log"]') || 
                           document.querySelector('#quickLogBtn') ||
                           document.querySelector('.quick-log-btn');
        
        if (quickLogBtn) {
            quickLogBtn.click();
            setTimeout(() => {
                const mealOption = document.querySelector('[value="meal"]') || 
                                 document.querySelector('[value="nutrition"]');
                if (mealOption) mealOption.selected = true;
            }, 500);
        } else {
            this.navigate('/meal-planner');
        }
    }
    
    async addWater() {
        try {
            this.speak("Adding 250 milliliters of water to your daily intake.");
            
            const response = await fetch('/api/nutrition', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    waterIntake: 250,
                    meals: [],
                    totalCalories: 0,
                    totalProtein: 0,
                    totalCarbs: 0,
                    totalFat: 0
                })
            });
            
            if (response.ok) {
                this.speak("Water logged successfully! Stay hydrated!");
                // Refresh dashboard data if function exists
                if (typeof loadDashboardData === 'function') {
                    loadDashboardData();
                }
            } else {
                this.speak("I couldn't log your water intake right now. Please try again.");
            }
        } catch (error) {
            console.error('Error logging water:', error);
            this.speak("There was an error logging your water intake.");
        }
    }
    
    // Information methods
    showHelp() {
        const helpText = `I can help you with many things! I can read your nutrition summary, workout progress, daily stats, and current weight. 
                         I can navigate to different pages, log workouts and meals, add water, and even motivate you. 
                         Try saying things like "read nutrition summary", "how many calories today", "workouts this week", 
                         "go to dashboard", "log workout", or "motivate me". What would you like me to help you with?`;
        this.speak(helpText);
    }
    
    showCommands() {
        const commandCategories = [
            "Navigation: go to dashboard, workouts, nutrition, progress",
            "Data reading: read nutrition summary, calories today, workout summary",
            "Actions: log workout, add meal, add water, log out",
            "Information: help, time, date, motivate me"
        ];
        this.speak(`Here are some command categories: ${commandCategories.join('. ')}`);
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
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        this.speak(`Today is ${dateString}`);
    }
    
    motivate() {
        const randomPhrase = this.motivationalPhrases[Math.floor(Math.random() * this.motivationalPhrases.length)];
        this.speak(randomPhrase);
    }
    
    // Voice assistant control methods
    stopListening() {
        this.speak("Stopping voice recognition.");
        this.isListening = false;
        if (this.recognition) {
            this.recognition.stop();
        }
        this.updateVoiceIndicator('disabled');
    }
    
    disable() {
        this.speak("Disabling voice assistant.");
        this.isEnabled = false;
        localStorage.setItem('voiceAssistantEnabled', 'false');
        this.stopListening();
        this.removeVoiceIndicator();
    }
    
    mute() {
        this.synthesis.cancel();
        this.originalSpeak = this.speak;
        this.speak = () => {}; // Disable speech
        this.showNotification('Voice assistant muted', 'info');
    }
    
    unmute() {
        if (this.originalSpeak) {
            this.speak = this.originalSpeak; // Restore speech
            this.speak("Voice assistant unmuted");
        }
    }
    
    changeWakeWord() {
        this.speak("You can change the wake word in the voice settings. Opening settings now.");
        this.openSettings();
    }
    
    openSettings() {
        this.openVoiceSettings();
    }
    
    // Utility methods
    speak(text) {
        if (!this.synthesis) return;
        
        // Cancel any ongoing speech
        this.synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = this.voiceSettings.rate;
        utterance.pitch = this.voiceSettings.pitch;
        utterance.volume = this.voiceSettings.volume;
        
        // Set voice if specified
        if (this.voiceSettings.voice) {
            const voices = this.synthesis.getVoices();
            const selectedVoice = voices.find(voice => voice.name === this.voiceSettings.voice);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }
        
        utterance.onstart = () => {
            this.updateVoiceIndicator('speaking');
        };
        
        utterance.onend = () => {
            this.updateVoiceIndicator('listening');
        };
        
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
    
    startListening() {
        if (!this.recognition || !this.isEnabled) return;
        
        this.isListening = true;
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Failed to start voice recognition:', error);
        }
    }
    
    // UI Methods
    createUI() {
        if (document.getElementById('voice-assistant-ui')) return;
        
        const ui = document.createElement('div');
        ui.id = 'voice-assistant-ui';
        ui.innerHTML = `
            <div class="voice-assistant-container">
                <div class="voice-orb" id="voice-orb">
                    <div class="voice-icon">🎤</div>
                    <div class="voice-waves">
                        <div class="wave wave1"></div>
                        <div class="wave wave2"></div>
                        <div class="wave wave3"></div>
                    </div>
                </div>
                <div class="voice-status" id="voice-status">
                    <div class="status-text">Listening for "${this.wakeWord}"</div>
                    <div class="status-indicator"></div>
                </div>
                <div class="voice-controls">
                    <button class="voice-control-btn" onclick="voiceAssistant.toggleListening()" id="toggle-btn">
                        <i class="fas fa-pause"></i>
                    </button>
                    <button class="voice-control-btn" onclick="voiceAssistant.openSettings()">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
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
            .voice-assistant-container {
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 20px;
                padding: 20px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: white;
                min-width: 280px;
                transition: all 0.3s ease;
            }
            
            .voice-orb {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: rgba(255,255,255,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 15px;
                position: relative;
                transition: all 0.3s ease;
            }
            
            .voice-orb.listening {
                animation: pulse 2s infinite;
                background: rgba(76, 175, 80, 0.3);
            }
            
            .voice-orb.active {
                animation: glow 1s infinite;
                background: rgba(76, 175, 80, 0.5);
            }
            
            .voice-orb.speaking {
                animation: bounce 0.6s infinite;
                background: rgba(33, 150, 243, 0.5);
            }
            
            .voice-icon {
                font-size: 32px;
                z-index: 2;
            }
            
            .voice-waves {
                position: absolute;
                width: 100%;
                height: 100%;
                top: 0;
                left: 0;
            }
            
            .wave {
                position: absolute;
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                animation: wave 2s infinite;
            }
            
            .wave1 { animation-delay: 0s; }
            .wave2 { animation-delay: 0.5s; }
            .wave3 { animation-delay: 1s; }
            
            .voice-status {
                text-align: center;
                margin-bottom: 15px;
            }
            
            .status-text {
                font-size: 14px;
                opacity: 0.9;
                margin-bottom: 5px;
            }
            
            .status-indicator {
                width: 8px;
                height: 8px;
                background: #4CAF50;
                border-radius: 50%;
                margin: 0 auto;
                animation: blink 2s infinite;
            }
            
            .voice-controls {
                display: flex;
                justify-content: center;
                gap: 10px;
            }
            
            .voice-control-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 10px;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 16px;
            }
            
            .voice-control-btn:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-2px);
            }
            
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }
            
            @keyframes glow {
                0% { box-shadow: 0 0 10px rgba(76, 175, 80, 0.5); }
                50% { box-shadow: 0 0 25px rgba(76, 175, 80, 0.8); }
                100% { box-shadow: 0 0 10px rgba(76, 175, 80, 0.5); }
            }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }
            
            @keyframes wave {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(1.5); opacity: 0; }
            }
            
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
            
            .voice-notification {
                position: fixed;
                top: 120px;
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
    
    updateVoiceIndicator(status) {
        const orb = document.getElementById('voice-orb');
        const statusText = document.querySelector('.status-text');
        const statusIndicator = document.querySelector('.status-indicator');
        
        if (!orb || !statusText) return;
        
        // Remove all status classes
        orb.className = 'voice-orb';
        
        switch (status) {
            case 'listening':
                orb.classList.add('listening');
                statusText.textContent = `Listening for "${this.wakeWord}"`;
                statusIndicator.style.background = '#4CAF50';
                break;
            case 'active':
                orb.classList.add('active');
                statusText.textContent = 'Ready for command...';
                statusIndicator.style.background = '#4CAF50';
                break;
            case 'speaking':
                orb.classList.add('speaking');
                statusText.textContent = 'Speaking...';
                statusIndicator.style.background = '#2196F3';
                break;
            case 'disabled':
                statusText.textContent = 'Voice assistant disabled';
                statusIndicator.style.background = '#f44336';
                break;
            default:
                statusText.textContent = `Listening for "${this.wakeWord}"`;
                statusIndicator.style.background = '#4CAF50';
        }
    }
    
    removeVoiceIndicator() {
        const ui = document.getElementById('voice-assistant-ui');
        if (ui) {
            ui.remove();
        }
    }
    
    toggleListening() {
        if (this.isListening) {
            this.stopListening();
            document.querySelector('#toggle-btn i').className = 'fas fa-play';
        } else {
            this.startListening();
            document.querySelector('#toggle-btn i').className = 'fas fa-pause';
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
                        <input type="text" id="wake-word-input" value="${this.wakeWord}" placeholder="e.g., hey fit-with, hey babe">
                        <small>Say this phrase to activate the voice assistant</small>
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
        // Real-time updates for sliders
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
        
        // Clear existing options except default
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
        // Get current settings from modal
        const rate = document.getElementById('speech-rate').value;
        const pitch = document.getElementById('speech-pitch').value;
        const volume = document.getElementById('speech-volume').value;
        const voice = document.getElementById('voice-select').value;
        
        // Temporarily update settings for test
        const originalSettings = { ...this.voiceSettings };
        this.voiceSettings = { rate: parseFloat(rate), pitch: parseFloat(pitch), volume: parseFloat(volume), voice };
        
        this.speak("Hello! This is how I sound with your current settings. I'm ready to help you with your fitness journey!");
        
        // Restore original settings
        setTimeout(() => {
            this.voiceSettings = originalSettings;
        }, 5000);
    }
    
    saveSettings() {
        // Get values from modal
        const wakeWord = document.getElementById('wake-word-input').value.trim();
        const rate = document.getElementById('speech-rate').value;
        const pitch = document.getElementById('speech-pitch').value;
        const volume = document.getElementById('speech-volume').value;
        const voice = document.getElementById('voice-select').value;
        const enabled = document.getElementById('voice-enabled').checked;
        
        // Validate wake word
        if (!wakeWord || wakeWord.length < 3) {
            alert('Wake word must be at least 3 characters long');
            return;
        }
        
        // Update settings
        this.wakeWord = wakeWord;
        this.voiceSettings = { 
            rate: parseFloat(rate), 
            pitch: parseFloat(pitch), 
            volume: parseFloat(volume), 
            voice 
        };
        this.isEnabled = enabled;
        
        // Save to localStorage
        localStorage.setItem('voiceAssistantWakeWord', wakeWord);
        localStorage.setItem('voiceAssistantRate', rate);
        localStorage.setItem('voiceAssistantPitch', pitch);
        localStorage.setItem('voiceAssistantVolume', volume);
        localStorage.setItem('voiceAssistantVoice', voice);
        localStorage.setItem('voiceAssistantEnabled', enabled.toString());
        
        // Update UI
        this.updateVoiceIndicator('listening');
        document.querySelector('.status-text').textContent = `Listening for "${wakeWord}"`;
        
        // Restart if enabled, stop if disabled
        if (enabled && !this.isListening) {
            this.startListening();
        } else if (!enabled) {
            this.disable();
        }
        
        this.speak(`Settings saved! Wake word is now "${wakeWord}"`);
        this.closeSettings();
    }
    
    closeSettings() {
        const modal = document.getElementById('voice-settings-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.voice-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `voice-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 4000);
    }
    
    // Public methods for external control
    enable() {
        this.isEnabled = true;
        localStorage.setItem('voiceAssistantEnabled', 'true');
        this.init();
    }
    
    updateWakeWord(newWakeWord) {
        if (newWakeWord && newWakeWord.length >= 3) {
            this.wakeWord = newWakeWord;
            localStorage.setItem('voiceAssistantWakeWord', newWakeWord);
            this.updateVoiceIndicator('listening');
            this.speak(`Wake word updated to "${newWakeWord}"`);
        }
    }
    
    getStatus() {
        return {
            isEnabled: this.isEnabled,
            isListening: this.isListening,
            isAwake: this.isAwake,
            wakeWord: this.wakeWord,
            voiceSettings: this.voiceSettings
        };
    }
}

// Initialize enhanced voice assistant when page loads
let voiceAssistant;

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on protected pages (not login/signup)
    if (!window.location.pathname.includes('/') || window.location.pathname.length > 1) {
        voiceAssistant = new EnhancedVoiceAssistant();
        
        // Make it globally accessible
        window.voiceAssistant = voiceAssistant;
        
        console.log('Enhanced Voice Assistant initialized');
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedVoiceAssistant;
}