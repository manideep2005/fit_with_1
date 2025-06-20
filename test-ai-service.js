// Test script for AI Service
const aiService = require('./services/aiService');

async function testAIService() {
    console.log('🤖 Testing AI Service...\n');
    
    // Test health check
    console.log('1. Health Check:');
    const health = await aiService.healthCheck();
    console.log(JSON.stringify(health, null, 2));
    console.log('');
    
    // Test different types of questions
    const testQuestions = [
        'What workout should I do today?',
        'How can I lose weight?',
        'I need help with nutrition',
        'How do I build muscle?',
        'I need motivation to start exercising',
        'How do I track my progress?'
    ];
    
    const mockUserContext = {
        personalInfo: {
            firstName: 'John',
            age: 25
        },
        fitnessGoals: {
            primaryGoal: 'weight loss'
        }
    };
    
    console.log('2. Testing AI Responses:');
    console.log('User Context:', JSON.stringify(mockUserContext, null, 2));
    console.log('');
    
    for (let i = 0; i < testQuestions.length; i++) {
        const question = testQuestions[i];
        console.log(`Question ${i + 1}: "${question}"`);
        
        try {
            const response = await aiService.getAIResponse(question, mockUserContext);
            console.log(`Response: ${response}`);
            console.log('✅ Success\n');
        } catch (error) {
            console.log(`❌ Error: ${error.message}\n`);
        }
    }
    
    console.log('🎉 AI Service test completed!');
}

// Run the test
testAIService().catch(console.error);