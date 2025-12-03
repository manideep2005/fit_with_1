const axios = require('axios');

class HybridAiService {
  constructor() {
    this.isVercel = !!process.env.VERCEL;
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.groqApiKey = process.env.GROQ_API_KEY;
    
    console.log('🤖 Hybrid AI Service initialized:', {
      environment: this.isVercel ? 'Vercel' : 'Local',
      ollamaAvailable: !this.isVercel,
      openaiConfigured: !!this.openaiApiKey,
      groqConfigured: !!this.groqApiKey
    });
  }

  async generateResponse(message, userContext = {}) {
    const prompt = this.buildFitnessPrompt(message, userContext);
    
    try {
      if (!this.isVercel) {
        // Try Ollama first for local development
        return await this.useOllama(prompt);
      } else {
        // Use cloud APIs for Vercel
        if (this.groqApiKey) {
          return await this.useGroq(prompt);
        } else if (this.openaiApiKey) {
          return await this.useOpenAI(prompt);
        } else {
          return this.getFallbackResponse(message);
        }
      }
    } catch (error) {
      console.error('AI Service error:', error.message);
      
      // Fallback chain
      if (!this.isVercel && this.openaiApiKey) {
        try {
          return await this.useOpenAI(prompt);
        } catch (fallbackError) {
          console.error('OpenAI fallback failed:', fallbackError.message);
        }
      }
      
      return this.getFallbackResponse(message);
    }
  }

  async useOllama(prompt) {
    console.log('🦙 Using Ollama for AI response');
    
    const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
      model: 'llama3.2:3b', // Lightweight model for fitness coaching
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 500
      }
    }, {
      timeout: 30000 // 30 second timeout
    });

    return {
      success: true,
      response: response.data.response.trim(),
      provider: 'Ollama (llama3.2:3b)',
      timestamp: new Date().toISOString()
    };
  }

  async useGroq(prompt) {
    console.log('⚡ Using Groq for AI response');
    
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant', // Fast and efficient
      messages: [
        {
          role: 'system',
          content: 'You are an expert fitness coach and nutritionist. Provide helpful, motivating, and scientifically accurate fitness advice.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${this.groqApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    return {
      success: true,
      response: response.data.choices[0].message.content.trim(),
      provider: 'Groq (llama-3.1-8b-instant)',
      timestamp: new Date().toISOString()
    };
  }

  async useOpenAI(prompt) {
    console.log('🧠 Using OpenAI for AI response');
    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert fitness coach and nutritionist. Provide helpful, motivating, and scientifically accurate fitness advice.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    return {
      success: true,
      response: response.data.choices[0].message.content.trim(),
      provider: 'OpenAI (gpt-3.5-turbo)',
      timestamp: new Date().toISOString()
    };
  }

  buildFitnessPrompt(message, userContext) {
    const { fullName, personalInfo, fitnessGoals, onboardingData } = userContext;
    const firstName = personalInfo?.firstName || fullName?.split(' ')[0] || 'there';
    
    let contextInfo = `User: ${firstName}`;
    
    if (onboardingData?.personalInfo) {
      const info = onboardingData.personalInfo;
      contextInfo += `\nAge: ${info.age || 'Not specified'}`;
      contextInfo += `\nGender: ${info.gender || 'Not specified'}`;
      contextInfo += `\nHeight: ${onboardingData.bodyMetrics?.height || 'Not specified'}`;
      contextInfo += `\nWeight: ${onboardingData.bodyMetrics?.weight || 'Not specified'}`;
    }
    
    if (onboardingData?.healthGoals?.goals) {
      contextInfo += `\nFitness Goals: ${onboardingData.healthGoals.goals.join(', ')}`;
    }
    
    if (onboardingData?.bodyMetrics?.activityLevel) {
      contextInfo += `\nActivity Level: ${onboardingData.bodyMetrics.activityLevel}`;
    }

    return `Context: ${contextInfo}

User Question: ${message}

Please provide a helpful, personalized fitness coaching response. Be encouraging, specific, and actionable. Keep it concise but informative.`;
  }

  getFallbackResponse(message) {
    const responses = [
      "Great question! As your AI fitness coach, I'm here to help you achieve your goals. For personalized advice, I'd recommend focusing on consistency in both your workouts and nutrition.",
      "I'm excited to help you on your fitness journey! Remember, small consistent steps lead to big results. What specific area would you like to focus on today?",
      "That's a fantastic question about fitness! The key to success is finding activities you enjoy and can stick with long-term. Would you like some specific workout suggestions?",
      "As your AI coach, I believe in your potential! Every fitness journey is unique, and I'm here to support you every step of the way. Let's work together to reach your goals!",
      "Excellent question! Fitness is all about balance - combining effective workouts with proper nutrition and adequate rest. What aspect would you like to explore further?"
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      success: true,
      response: randomResponse,
      provider: 'Fallback Response',
      timestamp: new Date().toISOString()
    };
  }

  async generateWorkoutPlan(userProfile, preferences = {}) {
    const prompt = this.buildWorkoutPrompt(userProfile, preferences);
    
    try {
      const result = await this.generateResponse(prompt, userProfile);
      
      if (result.success) {
        return {
          success: true,
          workoutPlan: {
            title: `Personalized Workout Plan for ${userProfile.personalInfo?.firstName || 'You'}`,
            description: 'AI-generated workout plan based on your goals and preferences',
            content: result.response
          },
          generatedBy: result.provider,
          timestamp: result.timestamp
        };
      } else {
        throw new Error('AI generation failed');
      }
    } catch (error) {
      console.error('Workout plan generation error:', error);
      return {
        success: false,
        error: error.message,
        fallbackPlan: this.getFallbackWorkoutPlan(preferences)
      };
    }
  }

  buildWorkoutPrompt(userProfile, preferences) {
    const { personalInfo, fitnessGoals, healthInfo } = userProfile;
    const { timeAvailable = 30, fitnessLevel = 'beginner', equipment = [], intensity = 'moderate' } = preferences;
    
    return `Create a personalized workout plan with the following details:

User Profile:
- Age: ${personalInfo?.age || 'Not specified'}
- Fitness Level: ${fitnessLevel}
- Goals: ${fitnessGoals?.primaryGoal || 'General fitness'}
- Available Time: ${timeAvailable} minutes
- Equipment: ${equipment.length > 0 ? equipment.join(', ') : 'Bodyweight only'}
- Preferred Intensity: ${intensity}

Please create a structured workout plan with:
1. Warm-up (5 minutes)
2. Main workout exercises with sets/reps
3. Cool-down (5 minutes)
4. Tips for proper form
5. Modifications for different fitness levels

Format it clearly and make it actionable.`;
  }

  getFallbackWorkoutPlan(preferences) {
    const { timeAvailable = 30 } = preferences;
    
    return {
      title: 'Quick Full-Body Workout',
      description: 'A balanced workout suitable for all fitness levels',
      content: `
🔥 ${timeAvailable}-Minute Full-Body Workout

WARM-UP (5 minutes):
• Arm circles - 30 seconds
• Leg swings - 30 seconds each leg
• Jumping jacks - 1 minute
• Dynamic stretches - 2 minutes

MAIN WORKOUT (${timeAvailable - 10} minutes):
• Push-ups - 3 sets of 8-12 reps
• Squats - 3 sets of 12-15 reps
• Plank - 3 sets of 30-60 seconds
• Lunges - 3 sets of 10 reps each leg
• Mountain climbers - 3 sets of 20 reps

COOL-DOWN (5 minutes):
• Static stretches
• Deep breathing
• Gentle yoga poses

💡 Tips:
- Rest 30-60 seconds between sets
- Focus on proper form over speed
- Modify exercises as needed
- Stay hydrated throughout
      `
    };
  }

  async healthCheck() {
    const status = {
      timestamp: new Date().toISOString(),
      environment: this.isVercel ? 'Vercel' : 'Local',
      providers: {
        ollama: { available: false, status: 'Not checked' },
        groq: { available: !!this.groqApiKey, status: this.groqApiKey ? 'Configured' : 'Not configured' },
        openai: { available: !!this.openaiApiKey, status: this.openaiApiKey ? 'Configured' : 'Not configured' }
      }
    };

    // Test Ollama if local
    if (!this.isVercel) {
      try {
        await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 });
        status.providers.ollama = { available: true, status: 'Connected' };
      } catch (error) {
        status.providers.ollama = { available: false, status: 'Connection failed' };
      }
    }

    return status;
  }
}

module.exports = new HybridAiService();