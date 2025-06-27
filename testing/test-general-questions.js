// Test script for AI Service with general questions
const aiService = require('./services/aiService');

async function testGeneralQuestions() {
    console.log('🤖 Testing AI Service with General Questions...\n');
    
    const mockUserContext = {
        personalInfo: {
            firstName: 'John',
            age: 25
        },
        fitnessGoals: {
            primaryGoal: 'weight loss'
        }
    };
    
    // Test various non-fitness questions
    const generalQuestions = [
        'What is the weather like today?',
        'How do I cook pasta?',
        'What is the capital of France?',
        'Can you help me with my math homework?',
        'What movies should I watch?',
        'How do I fix my computer?',
        'What is artificial intelligence?',
        'Tell me a joke',
        'What is the meaning of life?',
        'How do I learn programming?',
        'What should I wear today?',
        'How do I make friends?'
    ];
    
    console.log('Testing with non-fitness questions:');
    console.log('User Context:', JSON.stringify(mockUserContext, null, 2));
    console.log('');
    
    for (let i = 0; i < generalQuestions.length; i++) {
        const question = generalQuestions[i];
        console.log(`Question ${i + 1}: "${question}"`);
        
        try {
            const response = await aiService.getAIResponse(question, mockUserContext);
            console.log(`Response: ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`);
            console.log('---');
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
            console.log('---');
        }
    }
    
    console.log('🎉 General questions test completed!');
}

// Run the test
testGeneralQuestions().catch(console.error);