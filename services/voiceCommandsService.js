/**
 * Voice Commands Service
 * Hands-free workout experience with speech recognition and voice responses
 */

const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');

class VoiceCommandsService {
    constructor() {
        this.speechClient = null;
        this.ttsClient = null;
        this.activeSession = null;
        this.commandPatterns = this.initializeCommandPatterns();
        this.voiceProfiles = new Map();
        this.workoutCommands = this.initializeWorkoutCommands();
        this.initializeGoogleSpeechAPI();
    }

    async initializeGoogleSpeechAPI() {
        try {
            if (process.env.GOOGLE_SPEECH_API_KEY) {
                this.speechClient = new speech.SpeechClient({
                    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
                });
                
                this.ttsClient = new textToSpeech.TextToSpeechClient({
                    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
                });
                
                console.log('✅ Google Speech APIs initialized');
            }
        } catch (error) {
            console.error('❌ Speech API init failed:', error.message);
        }
    }

    initializeCommandPatterns() {
        return {
            // Workout control commands
            start: [
                /^(start|begin|let's go|let's start)/i,
                /^(start workout|begin workout|start training)/i
            ],
            pause: [
                /^(pause|hold on|wait|stop)/i,
                /^(take a break|pause workout)/i
            ],
            resume: [
                /^(resume|continue|keep going|let's continue)/i,
                /^(resume workout|continue workout)/i
            ],
            next: [
                /^(next|next exercise|move on|skip)/i,
                /^(what's next|next one)/i
            ],
            repeat: [
                /^(repeat|again|one more time|do it again)/i,
                /^(repeat exercise|do that again)/i
            ],
            
            // Timer commands
            timer: [
                /^(set timer|timer for|start timer)/i,
                /^(countdown|count down|time me)/i
            ],
            
            // Rep counting
            count: [
                /^(count|counting|rep|reps)/i,
                /^(how many|count reps|rep count)/i
            ],
            
            // Information requests
            status: [
                /^(status|how am i doing|progress|where am i)/i,
                /^(workout status|current status)/i
            ],
            help: [
                /^(help|what can you do|commands|voice commands)/i,
                /^(how to|what to say)/i
            ],
            
            // Nutrition logging
            water: [
                /^(log water|drank water|water intake|had water)/i,
                /^(add water|record water)/i
            ],
            food: [
                /^(log food|ate|had|consumed)/i,
                /^(add food|record meal|log meal)/i
            ],
            
            // Motivation and encouragement
            motivation: [
                /^(motivate me|encourage me|pump me up)/i,
                /^(i need motivation|feeling tired|want to quit)/i
            ],
            
            // Workout feedback
            easy: [
                /^(too easy|easy|not challenging|increase)/i,
                /^(make it harder|more difficult)/i
            ],
            hard: [
                /^(too hard|difficult|challenging|decrease)/i,
                /^(make it easier|too much)/i
            ],
            
            // Form feedback
            form: [
                /^(check form|how's my form|form check)/i,
                /^(am i doing this right|correct form)/i
            ]
        };
    }

    initializeWorkoutCommands() {
        return {
            exercises: {
                pushups: ['push ups', 'pushups', 'push-ups'],
                squats: ['squats', 'squat'],
                plank: ['plank', 'planks'],
                lunges: ['lunges', 'lunge'],
                burpees: ['burpees', 'burpee'],
                jumping_jacks: ['jumping jacks', 'jumping jack', 'jacks'],
                mountain_climbers: ['mountain climbers', 'mountain climber'],
                sit_ups: ['sit ups', 'situps', 'sit-ups', 'crunches']
            },
            
            durations: {
                '30 seconds': ['thirty seconds', '30 seconds', 'half minute'],
                '1 minute': ['one minute', '1 minute', 'sixty seconds'],
                '2 minutes': ['two minutes', '2 minutes'],
                '5 minutes': ['five minutes', '5 minutes']
            },
            
            intensities: {
                low: ['easy', 'light', 'gentle', 'slow'],
                medium: ['moderate', 'normal', 'regular'],
                high: ['hard', 'intense', 'fast', 'difficult']
            }
        };
    }

    async startVoiceSession(userId, workoutType = 'general') {
        try {
            const sessionId = this.generateSessionId();
            
            this.activeSession = {
                id: sessionId,
                userId: userId,
                workoutType: workoutType,
                startTime: Date.now(),
                currentExercise: null,
                repCount: 0,
                setCount: 0,
                totalExercises: 0,
                isActive: true,
                isPaused: false,
                voiceEnabled: true,
                commands: [],
                responses: []
            };

            // Create voice profile if doesn't exist
            if (!this.voiceProfiles.has(userId)) {
                this.voiceProfiles.set(userId, {
                    preferredVoice: 'female',
                    speechRate: 1.0,
                    language: 'en-US',
                    motivationLevel: 'high'
                });
            }

            const welcomeMessage = this.generateWelcomeMessage(workoutType);
            await this.speakResponse(welcomeMessage);

            return {
                success: true,
                sessionId: sessionId,
                message: 'Voice session started',
                availableCommands: this.getAvailableCommands(),
                welcomeMessage: welcomeMessage
            };

        } catch (error) {
            console.error('Start voice session error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async processVoiceCommand(audioData, sessionId) {
        try {
            if (!this.activeSession || this.activeSession.id !== sessionId) {
                throw new Error('No active voice session');
            }

            let transcription;
            
            if (this.speechClient && audioData) {
                transcription = await this.transcribeAudio(audioData);
            } else {
                // Simulate voice command for demo
                transcription = this.simulateVoiceCommand();
            }

            const command = this.parseCommand(transcription);
            const response = await this.executeCommand(command);

            // Log command and response
            this.activeSession.commands.push({
                transcription: transcription,
                command: command,
                timestamp: Date.now()
            });

            this.activeSession.responses.push({
                text: response.text,
                audio: response.audio,
                timestamp: Date.now()
            });

            return {
                success: true,
                transcription: transcription,
                command: command,
                response: response,
                sessionStatus: this.getSessionStatus()
            };

        } catch (error) {
            console.error('Process voice command error:', error);
            return {
                success: false,
                error: error.message,
                fallback: "I didn't catch that. Try saying 'help' for available commands."
            };
        }
    }

    async transcribeAudio(audioData) {
        try {
            const request = {
                audio: {
                    content: audioData
                },
                config: {
                    encoding: 'WEBM_OPUS',
                    sampleRateHertz: 48000,
                    languageCode: 'en-US',
                    enableAutomaticPunctuation: true,
                    model: 'latest_short'
                }
            };

            const [response] = await this.speechClient.recognize(request);
            const transcription = response.results
                .map(result => result.alternatives[0].transcript)
                .join('\n');

            return transcription.trim();

        } catch (error) {
            console.error('Audio transcription error:', error);
            throw new Error('Failed to transcribe audio');
        }
    }

    simulateVoiceCommand() {
        const sampleCommands = [
            "start workout",
            "next exercise",
            "pause",
            "how am I doing",
            "set timer for 1 minute",
            "count reps",
            "log water",
            "motivate me",
            "check form",
            "too easy"
        ];
        
        return sampleCommands[Math.floor(Math.random() * sampleCommands.length)];
    }

    parseCommand(transcription) {
        const text = transcription.toLowerCase().trim();
        
        for (const [commandType, patterns] of Object.entries(this.commandPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    return {
                        type: commandType,
                        text: transcription,
                        confidence: 0.9,
                        parameters: this.extractParameters(text, commandType)
                    };
                }
            }
        }

        // Check for exercise-specific commands
        const exerciseCommand = this.parseExerciseCommand(text);
        if (exerciseCommand) {
            return exerciseCommand;
        }

        return {
            type: 'unknown',
            text: transcription,
            confidence: 0.1,
            parameters: {}
        };
    }

    parseExerciseCommand(text) {
        // Check for exercise names
        for (const [exercise, variations] of Object.entries(this.workoutCommands.exercises)) {
            for (const variation of variations) {
                if (text.includes(variation)) {
                    return {
                        type: 'exercise',
                        exercise: exercise,
                        text: text,
                        confidence: 0.8,
                        parameters: { exercise: exercise }
                    };
                }
            }
        }

        // Check for timer commands with duration
        const timerMatch = text.match(/(\\d+)\\s*(seconds?|minutes?|mins?)/);
        if (timerMatch) {
            const duration = parseInt(timerMatch[1]);
            const unit = timerMatch[2];
            const seconds = unit.startsWith('min') ? duration * 60 : duration;
            
            return {
                type: 'timer',
                text: text,
                confidence: 0.9,
                parameters: { duration: seconds }
            };
        }

        return null;
    }

    extractParameters(text, commandType) {
        const parameters = {};

        switch (commandType) {
            case 'timer':
                const timerMatch = text.match(/(\\d+)\\s*(seconds?|minutes?|mins?)/);
                if (timerMatch) {
                    const duration = parseInt(timerMatch[1]);
                    const unit = timerMatch[2];
                    parameters.duration = unit.startsWith('min') ? duration * 60 : duration;
                }
                break;

            case 'water':
                const waterMatch = text.match(/(\\d+)\\s*(ml|milliliters?|glasses?|cups?)/);
                if (waterMatch) {
                    let amount = parseInt(waterMatch[1]);
                    const unit = waterMatch[2];
                    
                    if (unit.includes('glass') || unit.includes('cup')) {
                        amount *= 250; // Convert to ml
                    }
                    
                    parameters.amount = amount;
                } else {
                    parameters.amount = 250; // Default glass
                }
                break;

            case 'food':
                // Extract food items (simplified)
                const foodWords = text.split(' ').filter(word => 
                    !['log', 'ate', 'had', 'consumed', 'add', 'record'].includes(word)
                );
                parameters.food = foodWords.join(' ');
                break;
        }

        return parameters;
    }

    async executeCommand(command) {
        try {
            switch (command.type) {
                case 'start':
                    return await this.handleStartCommand();
                
                case 'pause':
                    return await this.handlePauseCommand();
                
                case 'resume':
                    return await this.handleResumeCommand();
                
                case 'next':
                    return await this.handleNextCommand();
                
                case 'repeat':
                    return await this.handleRepeatCommand();
                
                case 'timer':
                    return await this.handleTimerCommand(command.parameters);
                
                case 'count':
                    return await this.handleCountCommand();
                
                case 'status':
                    return await this.handleStatusCommand();
                
                case 'help':
                    return await this.handleHelpCommand();
                
                case 'water':
                    return await this.handleWaterCommand(command.parameters);
                
                case 'food':
                    return await this.handleFoodCommand(command.parameters);
                
                case 'motivation':
                    return await this.handleMotivationCommand();
                
                case 'easy':
                    return await this.handleDifficultyCommand('increase');
                
                case 'hard':
                    return await this.handleDifficultyCommand('decrease');
                
                case 'form':
                    return await this.handleFormCommand();
                
                case 'exercise':
                    return await this.handleExerciseCommand(command.parameters);
                
                default:
                    return await this.handleUnknownCommand(command.text);
            }

        } catch (error) {
            console.error('Execute command error:', error);
            return {
                text: "Sorry, I couldn't process that command. Please try again.",
                audio: null,
                success: false
            };
        }
    }

    async handleStartCommand() {
        if (this.activeSession.isActive && !this.activeSession.isPaused) {
            const text = "Your workout is already active! Say 'next' to move to the next exercise.";
            return {
                text: text,
                audio: await this.generateSpeech(text),
                success: true
            };
        }

        this.activeSession.isActive = true;
        this.activeSession.isPaused = false;
        this.activeSession.currentExercise = 'push-ups'; // Default first exercise

        const text = "Great! Let's start with push-ups. I'll count your reps. Begin when you're ready!";
        return {
            text: text,
            audio: await this.generateSpeech(text),
            success: true,
            action: 'start_exercise',
            exercise: this.activeSession.currentExercise
        };
    }

    async handlePauseCommand() {
        this.activeSession.isPaused = true;
        
        const text = "Workout paused. Take your time! Say 'resume' when you're ready to continue.";
        return {
            text: text,
            audio: await this.generateSpeech(text),
            success: true,
            action: 'pause_workout'
        };
    }

    async handleResumeCommand() {
        if (!this.activeSession.isPaused) {
            const text = "Your workout is already active!";
            return {
                text: text,
                audio: await this.generateSpeech(text),
                success: true
            };
        }

        this.activeSession.isPaused = false;
        
        const text = `Welcome back! Continue with ${this.activeSession.currentExercise}. You've got this!`;
        return {
            text: text,
            audio: await this.generateSpeech(text),
            success: true,
            action: 'resume_workout'
        };
    }

    async handleNextCommand() {
        const exercises = ['push-ups', 'squats', 'plank', 'lunges', 'burpees'];
        const currentIndex = exercises.indexOf(this.activeSession.currentExercise);
        const nextIndex = (currentIndex + 1) % exercises.length;
        
        this.activeSession.currentExercise = exercises[nextIndex];
        this.activeSession.repCount = 0;
        this.activeSession.setCount++;
        this.activeSession.totalExercises++;

        const text = `Great job! Next up: ${this.activeSession.currentExercise}. Get into position and begin when ready!`;
        return {
            text: text,
            audio: await this.generateSpeech(text),
            success: true,
            action: 'next_exercise',
            exercise: this.activeSession.currentExercise
        };
    }

    async handleRepeatCommand() {
        this.activeSession.repCount = 0;
        
        const text = `Let's do another set of ${this.activeSession.currentExercise}. You're doing amazing!`;
        return {
            text: text,
            audio: await this.generateSpeech(text),
            success: true,
            action: 'repeat_exercise'
        };
    }

    async handleTimerCommand(parameters) {
        const duration = parameters.duration || 60; // Default 1 minute
        
        const text = `Timer set for ${this.formatDuration(duration)}. Starting now!`;
        return {
            text: text,
            audio: await this.generateSpeech(text),
            success: true,
            action: 'start_timer',
            duration: duration
        };
    }

    async handleCountCommand() {
        this.activeSession.repCount++;
        
        const encouragement = this.getRepEncouragement(this.activeSession.repCount);
        const text = `${this.activeSession.repCount}! ${encouragement}`;
        
        return {
            text: text,
            audio: await this.generateSpeech(text),
            success: true,
            action: 'count_rep',
            repCount: this.activeSession.repCount
        };
    }

    async handleStatusCommand() {
        const duration = Math.round((Date.now() - this.activeSession.startTime) / 60000);
        
        const text = `You've been working out for ${duration} minutes. ` +
                    `Current exercise: ${this.activeSession.currentExercise}. ` +
                    `Reps: ${this.activeSession.repCount}. ` +
                    `Sets completed: ${this.activeSession.setCount}. Keep it up!`;
        
        return {
            text: text,
            audio: await this.generateSpeech(text),
            success: true,
            status: this.getSessionStatus()
        };
    }

    async handleHelpCommand() {
        const text = "Here are some commands you can use: " +
                    "Say 'start' to begin, 'pause' to take a break, 'next' for next exercise, " +
                    "'count' to count reps, 'timer' to set a timer, 'status' for progress, " +
                    "'motivate me' for encouragement, or 'log water' to track hydration.";
        
        return {
            text: text,
            audio: await this.generateSpeech(text),
            success: true,
            commands: this.getAvailableCommands()
        };
    }

    async handleWaterCommand(parameters) {
        const amount = parameters.amount || 250;
        
        // This would integrate with nutrition service
        const text = `Great! I've logged ${amount}ml of water for you. Stay hydrated!`;
        
        return {
            text: text,
            audio: await this.generateSpeech(text),
            success: true,
            action: 'log_water',
            amount: amount
        };
    }

    async handleFoodCommand(parameters) {
        const food = parameters.food || 'your meal';
        
        const text = `I've noted that you had ${food}. Great job tracking your nutrition!`;
        
        return {
            text: text,
            audio: await this.generateSpeech(text),
            success: true,
            action: 'log_food',
            food: food
        };
    }

    async handleMotivationCommand() {
        const motivationalMessages = [
            "You're absolutely crushing it! Every rep brings you closer to your goals!",
            "I believe in you! You're stronger than you think!",
            "This is where champions are made! Push through!",
            "Your future self will thank you for this effort!",
            "You've got this! Mind over matter!",
            "Every drop of sweat is progress! Keep going!",
            "You're not just working out, you're building character!",
            "The only bad workout is the one you didn't do - and you're here!"
        ];
        
        const message = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
        
        return {
            text: message,
            audio: await this.generateSpeech(message, { rate: 1.1, pitch: 2 }),
            success: true,
            action: 'motivation'
        };
    }

    async handleDifficultyCommand(adjustment) {
        let text;
        
        if (adjustment === 'increase') {
            text = "I hear you! Let's make it more challenging. Try increasing your speed or adding more reps!";
        } else {
            text = "No problem! Focus on proper form and take your time. Quality over quantity!";
        }
        
        return {
            text: text,
            audio: await this.generateSpeech(text),
            success: true,
            action: 'adjust_difficulty',
            adjustment: adjustment
        };
    }

    async handleFormCommand() {
        const formTips = {
            'push-ups': "Keep your body in a straight line, core engaged, and lower until your chest nearly touches the ground.",
            'squats': "Keep your chest up, knees tracking over your toes, and sit back like you're sitting in a chair.",
            'plank': "Maintain a straight line from head to heels, engage your core, and breathe steadily.",
            'lunges': "Keep your front knee over your ankle, step back far enough, and keep your torso upright.",
            'burpees': "Land softly, keep your core tight during the plank, and explode up with energy!"
        };
        
        const tip = formTips[this.activeSession.currentExercise] || 
                   "Focus on controlled movements, proper breathing, and listen to your body.";
        
        const text = `Form check for ${this.activeSession.currentExercise}: ${tip}`;
        
        return {
            text: text,
            audio: await this.generateSpeech(text),
            success: true,
            action: 'form_check',
            tip: tip
        };
    }

    async handleExerciseCommand(parameters) {
        const exercise = parameters.exercise;
        this.activeSession.currentExercise = exercise;
        this.activeSession.repCount = 0;
        
        const text = `Switching to ${exercise}. Get into position and begin when you're ready!`;
        
        return {
            text: text,
            audio: await this.generateSpeech(text),
            success: true,
            action: 'switch_exercise',
            exercise: exercise
        };
    }

    async handleUnknownCommand(text) {
        const responses = [
            "I didn't quite catch that. Try saying 'help' to see what I can do.",
            "Sorry, I'm not sure what you meant. Say 'help' for available commands.",
            "I didn't understand that command. Try 'start', 'pause', 'next', or 'help'.",
            "Could you repeat that? Say 'help' if you need to see the available commands."
        ];
        
        const response = responses[Math.floor(Math.random() * responses.length)];
        
        return {
            text: response,
            audio: await this.generateSpeech(response),
            success: false,
            originalCommand: text
        };
    }

    async generateSpeech(text, options = {}) {
        try {
            if (!this.ttsClient) {
                return null; // Return null if TTS not available
            }

            const userProfile = this.voiceProfiles.get(this.activeSession.userId);
            
            const request = {
                input: { text: text },
                voice: {
                    languageCode: userProfile?.language || 'en-US',
                    ssmlGender: userProfile?.preferredVoice === 'male' ? 'MALE' : 'FEMALE'
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: options.rate || userProfile?.speechRate || 1.0,
                    pitch: options.pitch || 0
                }
            };

            const [response] = await this.ttsClient.synthesizeSpeech(request);
            return response.audioContent;

        } catch (error) {
            console.error('Speech generation error:', error);
            return null;
        }
    }

    async speakResponse(text) {
        try {
            const audio = await this.generateSpeech(text);
            
            // In a real implementation, this would play the audio
            console.log(`🔊 Speaking: "${text}"`);
            
            return {
                text: text,
                audio: audio,
                success: true
            };

        } catch (error) {
            console.error('Speak response error:', error);
            return {
                text: text,
                audio: null,
                success: false
            };
        }
    }

    getRepEncouragement(repCount) {
        const encouragements = {
            1: "Great start!",
            5: "Nice rhythm!",
            10: "Double digits!",
            15: "You're on fire!",
            20: "Incredible!",
            25: "Unstoppable!",
            30: "Amazing!"
        };
        
        return encouragements[repCount] || 
               (repCount % 5 === 0 ? "Keep it up!" : "Good one!");
    }

    formatDuration(seconds) {
        if (seconds < 60) {
            return `${seconds} seconds`;
        } else {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            
            if (remainingSeconds === 0) {
                return `${minutes} minute${minutes > 1 ? 's' : ''}`;
            } else {
                return `${minutes} minute${minutes > 1 ? 's' : ''} and ${remainingSeconds} seconds`;
            }
        }
    }

    generateWelcomeMessage(workoutType) {
        const messages = {
            strength: "Welcome to your strength training session! I'm here to guide you through your workout with voice commands.",
            cardio: "Ready for some cardio? I'll be your voice coach today! Let's get that heart rate up!",
            yoga: "Welcome to your mindful movement session. I'll guide you through with gentle voice cues.",
            general: "Welcome to your workout! I'm your AI voice coach. Say 'start' when you're ready to begin!"
        };
        
        return messages[workoutType] || messages.general;
    }

    getAvailableCommands() {
        return [
            { command: "start", description: "Begin your workout" },
            { command: "pause", description: "Take a break" },
            { command: "resume", description: "Continue workout" },
            { command: "next", description: "Move to next exercise" },
            { command: "repeat", description: "Repeat current exercise" },
            { command: "count", description: "Count a rep" },
            { command: "timer for X minutes", description: "Set a timer" },
            { command: "status", description: "Get workout progress" },
            { command: "log water", description: "Record water intake" },
            { command: "motivate me", description: "Get encouragement" },
            { command: "check form", description: "Get form tips" },
            { command: "help", description: "Show available commands" }
        ];
    }

    getSessionStatus() {
        if (!this.activeSession) return null;
        
        const duration = Math.round((Date.now() - this.activeSession.startTime) / 60000);
        
        return {
            sessionId: this.activeSession.id,
            duration: duration,
            currentExercise: this.activeSession.currentExercise,
            repCount: this.activeSession.repCount,
            setCount: this.activeSession.setCount,
            totalExercises: this.activeSession.totalExercises,
            isActive: this.activeSession.isActive,
            isPaused: this.activeSession.isPaused,
            commandsProcessed: this.activeSession.commands.length
        };
    }

    async endVoiceSession() {
        if (!this.activeSession) {
            return {
                success: false,
                error: 'No active session to end'
            };
        }

        const duration = Math.round((Date.now() - this.activeSession.startTime) / 60000);
        const summary = {
            sessionId: this.activeSession.id,
            duration: duration,
            totalExercises: this.activeSession.totalExercises,
            totalReps: this.activeSession.repCount,
            commandsProcessed: this.activeSession.commands.length,
            completedAt: Date.now()
        };

        const farewell = `Great workout! You completed ${this.activeSession.totalExercises} exercises in ${duration} minutes. Well done!`;
        await this.speakResponse(farewell);

        this.activeSession = null;

        return {
            success: true,
            summary: summary,
            farewell: farewell
        };
    }

    async updateVoiceProfile(userId, preferences) {
        const currentProfile = this.voiceProfiles.get(userId) || {};
        const updatedProfile = { ...currentProfile, ...preferences };
        
        this.voiceProfiles.set(userId, updatedProfile);
        
        return {
            success: true,
            profile: updatedProfile
        };
    }

    generateSessionId() {
        return 'voice_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getStatus() {
        return {
            speechApiEnabled: !!this.speechClient,
            ttsEnabled: !!this.ttsClient,
            activeSession: !!this.activeSession,
            voiceProfiles: this.voiceProfiles.size,
            supportedCommands: Object.keys(this.commandPatterns).length,
            capabilities: [
                'Speech recognition',
                'Text-to-speech',
                'Workout guidance',
                'Rep counting',
                'Timer control',
                'Nutrition logging',
                'Motivational coaching'
            ]
        };
    }
}

module.exports = new VoiceCommandsService();