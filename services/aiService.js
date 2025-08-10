const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
    constructor() {
        // Initialize Google AI if API key is available
        this.geminiApiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        
        if (this.geminiApiKey) {
            this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
            console.log('✅ Google Gemini AI initialized');
        } else {
            console.log('⚠️  No Google AI API key found, using fallback system');
            console.log('💡 Get a free API key at: https://makersuite.google.com/app/apikey');
        }
    }

    // Main method to get AI response
    async getAIResponse(userMessage, userContext = {}) {
        try {
            // Try Google Gemini first if API key is available
            if (this.geminiApiKey && this.model) {
                const response = await this.getGeminiResponse(userMessage, userContext);
                if (response) return response;
            }

            // Fallback to enhanced rule-based fitness coach
            return this.getEnhancedFallbackResponse(userMessage, userContext);

        } catch (error) {
            console.error('AI Service error:', error);
            return this.getEnhancedFallbackResponse(userMessage, userContext);
        }
    }

    // Google Gemini API call
    async getGeminiResponse(userMessage, userContext) {
        try {
            const fitnessPrompt = this.createAdvancedFitnessPrompt(userMessage, userContext);
            
            console.log('🤖 Sending request to Google Gemini...');
            
            const result = await this.model.generateContent(fitnessPrompt);
            const response = await result.response;
            const text = response.text();
            
            console.log('✅ Received response from Google Gemini');
            
            return this.formatAIResponse(text);
            
        } catch (error) {
            console.error('Gemini API error:', error);
            
            // Check for specific error types
            if (error.message.includes('API_KEY_INVALID')) {
                console.error('❌ Invalid Google AI API Key');
            } else if (error.message.includes('QUOTA_EXCEEDED')) {
                console.error('❌ Google AI quota exceeded');
            }
            
            return null;
        }
    }

    // Create advanced fitness-focused prompt for Gemini
    createAdvancedFitnessPrompt(userMessage, userContext) {
        const context = userContext || {};
        const userInfo = context.personalInfo || {};
        const goals = context.fitnessGoals || {};
        const healthInfo = context.healthInfo || {};
        
        let prompt = `You are an expert AI fitness coach and personal trainer with years of experience helping people achieve their fitness goals. You provide personalized, science-based advice that is encouraging, practical, and safe.

USER PROFILE:`;
        
        if (userInfo.firstName) {
            prompt += `\n- Name: ${userInfo.firstName}`;
        }
        
        if (userInfo.age) {
            prompt += `\n- Age: ${userInfo.age} years old`;
        }
        
        if (userInfo.gender) {
            prompt += `\n- Gender: ${userInfo.gender}`;
        }
        
        if (userInfo.height && userInfo.weight) {
            prompt += `\n- Height: ${userInfo.height} cm, Weight: ${userInfo.weight} kg`;
        }
        
        if (goals.primaryGoal) {
            prompt += `\n- Primary Goal: ${goals.primaryGoal}`;
        }
        
        if (goals.activityLevel) {
            prompt += `\n- Activity Level: ${goals.activityLevel}`;
        }
        
        if (goals.workoutFrequency) {
            prompt += `\n- Preferred Workout Frequency: ${goals.workoutFrequency} times per week`;
        }
        
        if (healthInfo.dietaryRestrictions && healthInfo.dietaryRestrictions.length > 0) {
            prompt += `\n- Dietary Restrictions: ${healthInfo.dietaryRestrictions.join(', ')}`;
        }

        prompt += `\n\nUSER QUESTION: "${userMessage}"

INSTRUCTIONS:
- Provide a personalized, helpful response based on the user's profile
- Be encouraging and motivational
- Give specific, actionable advice
- Include safety considerations when relevant
- Keep responses conversational and friendly
- If asking for workout plans, provide specific exercises, sets, and reps
- If asking about nutrition, give practical meal ideas and tips
- Always consider the user's experience level and goals

Response:`;
        
        return prompt;
    }

    // Enhanced rule-based fallback system (completely free but much better)
    getEnhancedFallbackResponse(userMessage, userContext = {}) {
        const message = userMessage.toLowerCase();
        const context = userContext || {};
        const userInfo = context.personalInfo || {};
        const goals = context.fitnessGoals || {};
        const healthInfo = context.healthInfo || {};
        
        const userName = userInfo.firstName || 'there';
        const userGoal = goals.primaryGoal || 'general fitness';
        const userAge = userInfo.age;
        const userLevel = goals.activityLevel || 'beginner';

        // Specific workout plan requests
        if (message.includes('workout plan') || message.includes('exercise plan') || message.includes('routine')) {
            return this.generateWorkoutPlan(userName, userGoal, userLevel, userAge);
        }

        // Workout-related responses
        if (message.includes('workout') || message.includes('exercise') || message.includes('training')) {
            const workoutResponses = [
                `Hi ${userName}! Based on your ${userGoal} goal, here's a great workout structure:\n\n🔥 **Warm-up (5 mins):** Light cardio + dynamic stretching\n💪 **Main workout (20-30 mins):**\n- Squats: 3 sets of 12-15\n- Push-ups: 3 sets of 8-12\n- Plank: 3 sets of 30-60 seconds\n- Lunges: 3 sets of 10 each leg\n\n❄️ **Cool-down (5 mins):** Static stretching\n\nHow does this sound for your fitness level?`,
                
                `Perfect question, ${userName}! For ${userGoal}, I recommend this approach:\n\n📅 **Frequency:** 3-4 times per week\n⏱️ **Duration:** 30-45 minutes\n🎯 **Focus:** Compound movements for maximum efficiency\n\n**Today's suggestion:**\n1. Bodyweight squats (3x15)\n2. Modified push-ups (3x10)\n3. Mountain climbers (3x20)\n4. Dead bugs (3x10 each side)\n\nWant me to explain any of these exercises?`,
                
                `Great timing, ${userName}! Here's a quick but effective routine perfect for ${userGoal}:\n\n**Circuit Training (Repeat 3 times):**\n• Jumping jacks - 30 seconds\n• Bodyweight squats - 15 reps\n• Push-ups (modify as needed) - 10 reps\n• High knees - 30 seconds\n• Plank hold - 30 seconds\n• Rest - 60 seconds between rounds\n\nThis targets multiple muscle groups and gets your heart pumping! Ready to try it?`
            ];
            return this.getRandomResponse(workoutResponses);
        }

        // Nutrition and diet responses
        if (message.includes('nutrition') || message.includes('diet') || message.includes('food') || message.includes('eat') || message.includes('meal')) {
            const nutritionResponses = [
                `Excellent question, ${userName}! For ${userGoal}, here's your nutrition game plan:\n\n🍽️ **Meal Structure:**\n- **Breakfast:** Protein + complex carbs (eggs + oatmeal)\n- **Lunch:** Lean protein + vegetables + healthy fats\n- **Dinner:** Similar to lunch, lighter portions\n- **Snacks:** Greek yogurt, nuts, or fruit\n\n💧 **Hydration:** 8-10 glasses of water daily\n📊 **Portions:** Use your hand as a guide - palm-sized protein, fist-sized vegetables\n\nAny specific dietary preferences or restrictions I should know about?`,
                
                `Great focus on nutrition, ${userName}! Here's a simple approach for ${userGoal}:\n\n🥗 **The Plate Method:**\n- 1/2 plate: Colorful vegetables\n- 1/4 plate: Lean protein (chicken, fish, beans)\n- 1/4 plate: Complex carbs (quinoa, brown rice)\n- Thumb-sized healthy fats (avocado, nuts)\n\n⏰ **Timing Tips:**\n- Eat every 3-4 hours\n- Pre-workout: Light carbs + protein\n- Post-workout: Protein within 30 minutes\n\nWould you like specific meal ideas?`,
                
                `Perfect question, ${userName}! Nutrition is 70% of your ${userGoal} success. Here's your action plan:\n\n📝 **Weekly Prep Strategy:**\n- Sunday: Batch cook proteins (chicken, beans)\n- Prep vegetables and portion snacks\n- Plan 3 main meals + 2 healthy snacks daily\n\n🚫 **Avoid:** Processed foods, sugary drinks, late-night eating\n✅ **Focus on:** Whole foods, consistent meal timing, mindful eating\n\nWhat's your biggest nutrition challenge right now?`
            ];
            return this.getRandomResponse(nutritionResponses);
        }

        // Weight loss specific
        if (message.includes('weight loss') || message.includes('lose weight') || message.includes('fat loss') || message.includes('slim down')) {
            const weightLossResponses = [
                `${userName}, sustainable weight loss is absolutely achievable! Here's your science-backed approach:\n\n🎯 **Goal:** 1-2 pounds per week (safe and sustainable)\n\n📉 **Strategy:**\n- Create a moderate calorie deficit (300-500 calories/day)\n- Combine cardio (3x/week) + strength training (2x/week)\n- Focus on protein (0.8g per lb body weight)\n- Stay hydrated and get 7-9 hours sleep\n\n📊 **Track:** Weight weekly, measurements monthly, progress photos\n\nWhat's your current activity level? This helps me give more specific advice!`,
                
                `Fantastic goal, ${userName}! Weight loss success comes from consistency, not perfection. Here's your roadmap:\n\n🔥 **Exercise Plan:**\n- 150 minutes moderate cardio per week\n- 2-3 strength training sessions\n- Daily walks (aim for 8,000+ steps)\n\n🍽️ **Nutrition Focus:**\n- Eat in a slight calorie deficit\n- Prioritize protein and fiber\n- Control portions, not eliminate foods\n\n💡 **Success Tips:** Track everything for 2 weeks, meal prep, find an accountability partner\n\nWhat's been your biggest challenge with weight loss before?`
            ];
            return this.getRandomResponse(weightLossResponses);
        }

        // Muscle building
        if (message.includes('muscle') || message.includes('strength') || message.includes('build') || message.includes('gain') || message.includes('bulk')) {
            const muscleResponses = [
                `Excellent goal, ${userName}! Building muscle requires the right combination of training, nutrition, and recovery:\n\n💪 **Training Protocol:**\n- Lift weights 3-4x per week\n- Focus on compound movements (squats, deadlifts, bench press)\n- Progressive overload (gradually increase weight/reps)\n- 8-12 reps for muscle growth\n\n🥩 **Nutrition:**\n- Eat in a slight calorie surplus (200-500 calories)\n- 0.8-1g protein per lb body weight\n- Don't neglect carbs for energy!\n\n😴 **Recovery:** 7-9 hours sleep, rest days between training same muscles\n\nWhat's your current experience with weight training?`,
                
                `Great focus on muscle building, ${userName}! Here's your muscle-building blueprint:\n\n🏋️ **Workout Split (3-4 days):**\n- Day 1: Upper body (push-ups, rows, shoulder press)\n- Day 2: Lower body (squats, lunges, calf raises)\n- Day 3: Rest or light cardio\n- Day 4: Full body circuit\n\n📈 **Progression:** Increase difficulty every 2 weeks\n🍖 **Fuel:** Protein at every meal, post-workout protein shake\n⏱️ **Patience:** Visible results in 6-8 weeks, significant changes in 3-6 months\n\nAre you working out at home or do you have gym access?`
            ];
            return this.getRandomResponse(muscleResponses);
        }

        // Motivation and getting started
        if (message.includes('motivation') || message.includes('help') || message.includes('start') || message.includes('begin')) {
            const motivationResponses = [
                `${userName}, I'm so proud of you for taking this first step! 🌟 Starting is truly the hardest part, and you're already here asking the right questions.\n\n🎯 **Your Action Plan:**\n1. Set ONE small goal this week (like 10-minute daily walks)\n2. Schedule your workouts like important appointments\n3. Find your 'why' - what's driving this change?\n4. Celebrate small wins along the way!\n\n💪 **Remember:** Every expert was once a beginner. You don't have to be perfect, just consistent.\n\nWhat's one small step you can commit to this week?`,
                
                `You've got this, ${userName}! 🚀 The fact that you're here shows you're ready for positive change. Let's make this journey enjoyable and sustainable:\n\n✨ **Mindset Shifts:**\n- Progress over perfection\n- Focus on how you FEEL, not just how you look\n- Every workout is a victory, no matter how small\n\n🎯 **Week 1 Challenge:**\n- Move your body for 15 minutes daily (walk, dance, stretch)\n- Drink an extra glass of water each day\n- Go to bed 15 minutes earlier\n\nSmall changes create big transformations! What excites you most about this journey?`
            ];
            return this.getRandomResponse(motivationResponses);
        }

        // Progress tracking
        if (message.includes('progress') || message.includes('track') || message.includes('measure') || message.includes('results')) {
            const progressResponses = [
                `Fantastic question, ${userName}! Tracking progress is crucial for staying motivated. Here's your complete tracking toolkit:\n\n📊 **Multiple Metrics (Don't rely on scale alone!):**\n- Weekly weigh-ins (same day, same time)\n- Monthly body measurements (waist, hips, arms, thighs)\n- Progress photos (front, side, back - monthly)\n- Energy levels and mood (daily 1-10 scale)\n- Workout performance (weights lifted, reps completed)\n- Sleep quality and duration\n\n📱 **Tools:** Use a fitness app, journal, or simple spreadsheet\n🎯 **Review:** Weekly check-ins to adjust your plan\n\nWhich metrics resonate most with your goals?`,
                
                `Great focus on tracking, ${userName}! Progress isn't always visible on the scale. Here's how to see the full picture:\n\n🏆 **Non-Scale Victories to Celebrate:**\n- Clothes fitting better\n- Increased energy throughout the day\n- Better sleep quality\n- Improved mood and confidence\n- Climbing stairs without getting winded\n- Lifting heavier weights or doing more reps\n\n📸 **Photo Tips:** Same lighting, same poses, same time of day\n📏 **Measurements:** Track every 2-4 weeks, not daily\n\nRemember: Your body is changing even when the scale isn't moving! What positive changes have you noticed so far?`
            ];
            return this.getRandomResponse(progressResponses);
        }

        // Default personalized responses
        const defaultResponses = [
            `Hi ${userName}! 👋 I'm your AI fitness coach, and I'm excited to help you with your ${userGoal} journey! \n\nI can help you with:\n🏋️ Personalized workout plans\n🥗 Nutrition guidance\n📈 Progress tracking strategies\n💪 Motivation and accountability\n🎯 Goal setting and planning\n\nWhat would you like to focus on today?`,
            
            `Hello ${userName}! 🌟 I'm here to support your fitness journey every step of the way. Whether you need workout routines, nutrition advice, or just some motivation, I've got you covered!\n\nBased on your ${userGoal} goal, I can provide specific guidance tailored just for you. What's on your mind today?`,
            
            `Hey ${userName}! 💪 As your AI fitness coach, I'm here to make your ${userGoal} journey both effective and enjoyable.\n\nI specialize in:\n• Creating personalized workout plans\n• Providing nutrition guidance\n• Helping with motivation and mindset\n• Tracking progress effectively\n\nWhat aspect of fitness would you like to explore today?`
        ];
        
        return this.getRandomResponse(defaultResponses);
    }

    // Generate specific workout plans
    generateWorkoutPlan(userName, goal, level, age) {
        const ageGroup = age ? (age < 30 ? 'young' : age < 50 ? 'middle' : 'mature') : 'general';
        
        let plan = `${userName}, here's your personalized workout plan for ${goal}:\n\n`;
        
        if (goal.includes('weight loss') || goal.includes('fat loss')) {
            plan += `🔥 **WEIGHT LOSS WORKOUT PLAN**\n\n`;
            plan += `**Week Schedule:** 4-5 days\n`;
            plan += `**Duration:** 30-45 minutes per session\n\n`;
            plan += `**Day 1 & 3 - Cardio + Strength:**\n`;
            plan += `• 5-min warm-up (light jogging/marching)\n`;
            plan += `• Circuit (3 rounds, 45 sec work, 15 sec rest):\n`;
            plan += `  - Jumping jacks\n  - Bodyweight squats\n  - Push-ups (modify as needed)\n  - Mountain climbers\n  - Burpees (or step-ups)\n`;
            plan += `• 10-min cool-down walk + stretching\n\n`;
            plan += `**Day 2 & 4 - Strength Focus:**\n`;
            plan += `• Squats: 3 sets x 12-15 reps\n`;
            plan += `• Push-ups: 3 sets x 8-12 reps\n`;
            plan += `• Lunges: 3 sets x 10 each leg\n`;
            plan += `• Plank: 3 sets x 30-60 seconds\n`;
            plan += `• Glute bridges: 3 sets x 15 reps\n\n`;
            plan += `**Day 5 - Active Recovery:**\n`;
            plan += `• 30-minute brisk walk or yoga\n\n`;
        } else if (goal.includes('muscle') || goal.includes('strength')) {
            plan += `💪 **MUSCLE BUILDING WORKOUT PLAN**\n\n`;
            plan += `**Week Schedule:** 3-4 days\n`;
            plan += `**Duration:** 45-60 minutes per session\n\n`;
            plan += `**Day 1 - Upper Body:**\n`;
            plan += `• Push-ups: 4 sets x 8-12 reps\n`;
            plan += `• Pike push-ups: 3 sets x 6-10 reps\n`;
            plan += `• Tricep dips: 3 sets x 8-12 reps\n`;
            plan += `• Plank to downward dog: 3 sets x 10 reps\n\n`;
            plan += `**Day 2 - Lower Body:**\n`;
            plan += `• Squats: 4 sets x 12-15 reps\n`;
            plan += `• Single-leg glute bridges: 3 sets x 10 each\n`;
            plan += `• Lunges: 3 sets x 12 each leg\n`;
            plan += `• Calf raises: 3 sets x 15-20 reps\n\n`;
            plan += `**Day 3 - Full Body:**\n`;
            plan += `• Burpees: 3 sets x 5-8 reps\n`;
            plan += `• Mountain climbers: 3 sets x 20 reps\n`;
            plan += `• Plank: 3 sets x 45-90 seconds\n`;
            plan += `• Jump squats: 3 sets x 10 reps\n\n`;
        } else {
            plan += `🎯 **GENERAL FITNESS WORKOUT PLAN**\n\n`;
            plan += `**Week Schedule:** 3-4 days\n`;
            plan += `**Duration:** 30-40 minutes per session\n\n`;
            plan += `**Day 1 - Cardio + Core:**\n`;
            plan += `• 10-min cardio (jogging, dancing, or jumping jacks)\n`;
            plan += `• Plank: 3 sets x 30-60 seconds\n`;
            plan += `• Bicycle crunches: 3 sets x 20 reps\n`;
            plan += `• Dead bugs: 3 sets x 10 each side\n\n`;
            plan += `**Day 2 - Strength:**\n`;
            plan += `• Squats: 3 sets x 12-15 reps\n`;
            plan += `• Push-ups: 3 sets x 8-12 reps\n`;
            plan += `• Lunges: 3 sets x 10 each leg\n`;
            plan += `• Glute bridges: 3 sets x 12 reps\n\n`;
            plan += `**Day 3 - Active Recovery:**\n`;
            plan += `• 20-30 minute walk or gentle yoga\n\n`;
        }
        
        plan += `💡 **Important Notes:**\n`;
        plan += `• Start with 2-3 sets if you're a beginner\n`;
        plan += `• Rest 48 hours between strength sessions\n`;
        plan += `• Listen to your body and modify as needed\n`;
        plan += `• Progress by adding reps or sets weekly\n\n`;
        plan += `Ready to start? Which day looks most doable for you this week?`;
        
        return plan;
    }

    // Get random response from array
    getRandomResponse(responses) {
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // Format AI response
    formatAIResponse(response) {
        // Clean up the response
        let formatted = response.trim();
        
        // Remove any unwanted prefixes
        formatted = formatted.replace(/^(AI Coach:|Coach:|Bot:)/i, '').trim();
        
        // Ensure it starts with a capital letter
        if (formatted.length > 0) {
            formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }
        
        // Add encouraging tone if response seems too short
        if (formatted.length < 50) {
            formatted += " I'm here to help you succeed in your fitness journey!";
        }
        
        return formatted;
    }

    // Advanced AI-Powered Workout Generation
    async generateAdvancedWorkoutPlan(userProfile, preferences = {}) {
        try {
            const {
                fitnessGoals,
                personalInfo,
                healthInfo,
                workoutHistory,
                availableEquipment = [],
                timeAvailable = 30,
                fitnessLevel = 'beginner'
            } = userProfile;

            // Create detailed prompt for AI workout generation
            const workoutPrompt = this.createWorkoutGenerationPrompt(
                fitnessGoals,
                personalInfo,
                healthInfo,
                workoutHistory,
                availableEquipment,
                timeAvailable,
                fitnessLevel,
                preferences
            );

            let aiResponse = null;
            if (this.geminiApiKey && this.model) {
                try {
                    const result = await this.model.generateContent(workoutPrompt);
                    const response = await result.response;
                    aiResponse = response.text();
                } catch (error) {
                    console.error('Gemini workout generation error:', error);
                }
            }

            // Parse AI response or use intelligent fallback
            const workoutPlan = aiResponse ? 
                this.parseAIWorkoutResponse(aiResponse) : 
                this.generateIntelligentWorkoutFallback(userProfile, preferences);

            return {
                success: true,
                workoutPlan: workoutPlan,
                generatedBy: aiResponse ? 'AI' : 'Intelligent Algorithm',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Advanced workout generation error:', error);
            return {
                success: false,
                error: 'Failed to generate workout plan',
                fallbackPlan: this.getBasicWorkoutPlan(userProfile.fitnessGoals?.primaryGoal || 'general fitness')
            };
        }
    }

    // Create comprehensive workout generation prompt
    createWorkoutGenerationPrompt(goals, personalInfo, healthInfo, history, equipment, time, level, preferences) {
        let prompt = `You are an expert personal trainer and exercise physiologist. Create a detailed, personalized workout plan based on the following user profile:

USER PROFILE:
- Age: ${personalInfo?.age || 'Not specified'}
- Gender: ${personalInfo?.gender || 'Not specified'}
- Height: ${personalInfo?.height || 'Not specified'} cm
- Weight: ${personalInfo?.weight || 'Not specified'} kg
- Fitness Level: ${level}
- Primary Goal: ${goals?.primaryGoal || 'General fitness'}
- Target Weight: ${goals?.targetWeight || 'Not specified'} kg
- Activity Level: ${goals?.activityLevel || 'Moderate'}
- Workout Frequency: ${goals?.workoutFrequency || 3} times per week
- Preferred Workout Types: ${goals?.preferredWorkoutTypes?.join(', ') || 'Varied'}

CONSTRAINTS:
- Available Time: ${time} minutes per session
- Available Equipment: ${equipment.length > 0 ? equipment.join(', ') : 'Bodyweight only'}
- Health Considerations: ${healthInfo?.dietaryRestrictions?.join(', ') || 'None specified'}

PREFERENCES:
- Workout Intensity: ${preferences.intensity || 'Moderate'}
- Focus Areas: ${preferences.focusAreas?.join(', ') || 'Full body'}
- Avoid: ${preferences.avoid?.join(', ') || 'None'}

Please create a comprehensive workout plan that includes:
1. Weekly schedule (specific days and workout types)
2. Detailed exercises with sets, reps, and rest periods
3. Progression plan for the next 4 weeks
4. Warm-up and cool-down routines
5. Modifications for different fitness levels
6. Safety considerations and form tips
7. Expected results timeline

Format the response as a structured workout plan with clear sections.`;

        return prompt;
    }

    // Parse AI response into structured workout plan
    parseAIWorkoutResponse(aiResponse) {
        return {
            title: "AI-Generated Personalized Workout Plan",
            description: "Custom workout plan created by AI based on your profile",
            content: aiResponse,
            duration: "4 weeks",
            difficulty: "Personalized",
            equipment: "As specified",
            structure: this.extractWorkoutStructure(aiResponse)
        };
    }

    // Extract workout structure from AI response
    extractWorkoutStructure(response) {
        const lines = response.split('\n');
        const structure = {
            weeklySchedule: [],
            exercises: [],
            progressionPlan: []
        };

        lines.forEach(line => {
            if (line.toLowerCase().includes('day') && line.includes(':')) {
                structure.weeklySchedule.push(line.trim());
            }
            if (line.includes('sets') || line.includes('reps')) {
                structure.exercises.push(line.trim());
            }
            if (line.toLowerCase().includes('week') && line.toLowerCase().includes('progress')) {
                structure.progressionPlan.push(line.trim());
            }
        });

        return structure;
    }

    // Intelligent workout fallback system
    generateIntelligentWorkoutFallback(userProfile, preferences) {
        const { fitnessGoals, personalInfo } = userProfile;
        const goal = fitnessGoals?.primaryGoal?.toLowerCase() || 'general fitness';
        const level = preferences.fitnessLevel || 'beginner';
        const timeAvailable = preferences.timeAvailable || 30;

        const workoutPlans = {
            'weight loss': this.getWeightLossWorkout(level, timeAvailable),
            'muscle gain': this.getMuscleGainWorkout(level, timeAvailable),
            'strength': this.getStrengthWorkout(level, timeAvailable),
            'endurance': this.getEnduranceWorkout(level, timeAvailable),
            'general fitness': this.getGeneralFitnessWorkout(level, timeAvailable)
        };

        const selectedPlan = workoutPlans[goal] || workoutPlans['general fitness'];
        
        return {
            ...selectedPlan,
            personalizedFor: `${personalInfo?.firstName || 'User'} - ${goal}`,
            adaptedFor: level,
            sessionDuration: `${timeAvailable} minutes`
        };
    }

    // Specific workout plan generators
    getWeightLossWorkout(level, time) {
        return {
            title: "AI-Optimized Weight Loss Program",
            description: "High-intensity circuit training designed for maximum calorie burn",
            weeklySchedule: [
                "Monday: HIIT Cardio + Core (30 min)",
                "Tuesday: Strength Circuit (30 min)",
                "Wednesday: Active Recovery - Walking/Yoga (20 min)",
                "Thursday: Full Body Circuit (35 min)",
                "Friday: Cardio + Strength Combo (30 min)",
                "Saturday: Long Cardio Session (45 min)",
                "Sunday: Rest or Light Activity"
            ],
            expectedResults: "3-5 lbs weight loss, improved cardiovascular fitness, increased energy"
        };
    }

    getMuscleGainWorkout(level, time) {
        return {
            title: "AI-Designed Muscle Building Program",
            description: "Progressive overload strength training for maximum muscle growth",
            weeklySchedule: [
                "Monday: Upper Body Push (45 min)",
                "Tuesday: Lower Body (45 min)",
                "Wednesday: Rest or Light Cardio",
                "Thursday: Upper Body Pull (45 min)",
                "Friday: Full Body Power (40 min)",
                "Saturday: Core + Flexibility (30 min)",
                "Sunday: Complete Rest"
            ],
            expectedResults: "2-4 lbs muscle gain, increased strength, improved body composition"
        };
    }

    getStrengthWorkout(level, time) {
        return {
            title: "AI-Optimized Strength Training",
            description: "Progressive strength building with compound movements",
            weeklySchedule: [
                "Monday: Lower Body Strength",
                "Tuesday: Upper Body Strength", 
                "Wednesday: Rest",
                "Thursday: Full Body Power",
                "Friday: Accessory Work",
                "Saturday: Active Recovery",
                "Sunday: Rest"
            ],
            expectedResults: "25-40% strength increase, improved power, better movement quality"
        };
    }

    getEnduranceWorkout(level, time) {
        return {
            title: "AI-Designed Endurance Program",
            description: "Cardiovascular and muscular endurance development",
            weeklySchedule: [
                "Monday: Long Steady Cardio",
                "Tuesday: Interval Training",
                "Wednesday: Cross Training",
                "Thursday: Tempo Work",
                "Friday: Recovery Cardio",
                "Saturday: Long Session",
                "Sunday: Rest"
            ],
            expectedResults: "Improved VO2 max, better endurance, faster recovery"
        };
    }

    getGeneralFitnessWorkout(level, time) {
        return {
            title: "AI-Balanced Fitness Program",
            description: "Well-rounded program for overall health and fitness",
            weeklySchedule: [
                "Monday: Full Body Strength",
                "Tuesday: Cardio + Core",
                "Wednesday: Flexibility + Balance",
                "Thursday: Circuit Training",
                "Friday: Strength + Cardio Combo",
                "Saturday: Active Recreation",
                "Sunday: Rest or Gentle Movement"
            ],
            expectedResults: "Improved overall fitness, better energy, enhanced quality of life"
        };
    }

    // Get basic workout plan for fallback
    getBasicWorkoutPlan(goal) {
        return {
            title: `Basic ${goal} Workout`,
            description: "Simple workout plan to get you started",
            exercises: [
                "Bodyweight squats - 3x10",
                "Push-ups - 3x8",
                "Plank - 3x30 seconds",
                "Walking - 20 minutes"
            ],
            frequency: "3 times per week",
            duration: "20-30 minutes"
        };
    }

    // Health check for AI service
    async healthCheck() {
        return {
            status: 'healthy',
            providers: {
                gemini: !!this.geminiApiKey,
                fallback: true
            },
            features: {
                realAI: !!this.geminiApiKey,
                enhancedFallback: true,
                personalizedResponses: true,
                workoutPlans: true,
                advancedWorkoutGeneration: true,
                intelligentFallback: true
            },
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = new AIService();