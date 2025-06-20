# AI Coach Setup Instructions

Your AI Coach is already working with an enhanced rule-based system that provides personalized fitness advice! However, you can get even better responses by adding a **FREE** Google AI API key.

## Current Status ✅
- ✅ Enhanced AI Coach is working
- ✅ Personalized responses based on your profile
- ✅ Detailed workout plans and nutrition advice
- ✅ Completely free to use

## Optional: Get Even Better AI Responses (FREE)

To get more advanced AI responses, you can add a Google Gemini API key:

### Step 1: Get Your Free API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### Step 2: Add the API Key
1. Create a `.env` file in your project root (copy from `.env.example`)
2. Add this line: `GOOGLE_AI_API_KEY=your_api_key_here`
3. Restart your application

### Free Tier Limits
- **15 requests per minute**
- **1,500 requests per day**
- **1 million tokens per month**

This is more than enough for personal use!

## Features Available

### With Enhanced Fallback System (Current)
- ✅ Personalized responses using your name and goals
- ✅ Detailed workout plans based on your fitness level
- ✅ Nutrition advice tailored to your goals
- ✅ Progress tracking guidance
- ✅ Motivational support
- ✅ Specific exercise routines with sets and reps

### With Google AI (Optional Upgrade)
- ✅ All above features PLUS:
- ✅ More natural conversation flow
- ✅ Better understanding of complex questions
- ✅ More varied and creative responses
- ✅ Advanced fitness knowledge

## Testing Your AI Coach

Try asking these questions:
- "Create a workout plan for me"
- "How can I lose weight?"
- "I need help with nutrition"
- "What exercises should I do today?"
- "How do I track my progress?"
- "I need motivation to start exercising"

Your AI Coach will provide detailed, personalized responses based on your fitness profile!

## Troubleshooting

If you're having issues:
1. Check that your `.env` file is in the project root
2. Make sure there are no spaces around the `=` in your API key line
3. Restart the application after adding the API key
4. The fallback system will always work even without an API key

## Support

The AI Coach is designed to work perfectly without any API keys. The Google AI integration is just an optional enhancement for even better responses!