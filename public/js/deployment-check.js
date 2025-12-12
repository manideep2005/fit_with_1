// Deployment Check Script for Vercel
console.log('🚀 Deployment Check Started');

// Check if we're in Vercel environment
const isVercel = !!(
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('vercel.com') ||
    document.querySelector('meta[name="vercel-deployment-url"]') ||
    window.VERCEL_ENV
);

console.log('📍 Environment Check:', {
    hostname: window.location.hostname,
    isVercel: isVercel,
    isHTTPS: window.location.protocol === 'https:',
    userAgent: navigator.userAgent.substring(0, 50)
});

// Check Voice Assistant
function checkVoiceAssistant() {
    console.log('🎤 Checking Voice Assistant...');
    
    const hasWebSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const hasSpeechSynthesis = !!window.speechSynthesis;
    
    console.log('Voice API Support:', {
        speechRecognition: hasWebSpeech,
        speechSynthesis: hasSpeechSynthesis,
        supported: hasWebSpeech && hasSpeechSynthesis
    });
    
    // Check if voice assistant files are loaded
    const voiceAssistantLoaded = !!(window.voiceAssistant || window.vercelVoiceAssistant);
    console.log('Voice Assistant Loaded:', voiceAssistantLoaded);
    
    return {
        apiSupport: hasWebSpeech && hasSpeechSynthesis,
        scriptLoaded: voiceAssistantLoaded
    };
}

// Check Chat System
function checkChatSystem() {
    console.log('💬 Checking Chat System...');
    
    const chatContainer = document.querySelector('.chat-container');
    const advancedChatLoaded = !!window.advancedChat;
    const socketIOLoaded = !!window.io;
    
    console.log('Chat System Status:', {
        chatPageExists: !!chatContainer,
        advancedChatLoaded: advancedChatLoaded,
        socketIOLoaded: socketIOLoaded
    });
    
    return {
        pageExists: !!chatContainer,
        scriptLoaded: advancedChatLoaded,
        socketAvailable: socketIOLoaded
    };
}

// Check API Endpoints
async function checkAPIEndpoints() {
    console.log('🔗 Checking API Endpoints...');
    
    const endpoints = [
        '/api/health',
        '/api/dashboard-data',
        '/api/chat/friends',
        '/api/nutrition/today'
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint);
            results[endpoint] = {
                status: response.status,
                ok: response.ok
            };
            console.log(`✅ ${endpoint}: ${response.status}`);
        } catch (error) {
            results[endpoint] = {
                status: 'error',
                error: error.message
            };
            console.log(`❌ ${endpoint}: ${error.message}`);
        }
    }
    
    return results;
}

// Run all checks
async function runDeploymentCheck() {
    console.log('🔍 Running Deployment Verification...');
    
    const voiceCheck = checkVoiceAssistant();
    const chatCheck = checkChatSystem();
    const apiCheck = await checkAPIEndpoints();
    
    const report = {
        environment: {
            isVercel: isVercel,
            isHTTPS: window.location.protocol === 'https:',
            hostname: window.location.hostname
        },
        voiceAssistant: voiceCheck,
        chatSystem: chatCheck,
        apiEndpoints: apiCheck,
        timestamp: new Date().toISOString()
    };
    
    console.log('📊 Deployment Check Report:', report);
    
    // Display results on page if in development
    if (window.location.hostname.includes('localhost') || window.location.search.includes('debug=true')) {
        displayReport(report);
    }
    
    return report;
}

// Display report on page
function displayReport(report) {
    const reportDiv = document.createElement('div');
    reportDiv.id = 'deployment-report';
    reportDiv.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        max-width: 400px;
        z-index: 10000;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    reportDiv.innerHTML = `
        <h3>🚀 Deployment Check</h3>
        <p><strong>Environment:</strong> ${report.environment.isVercel ? 'Vercel' : 'Local'}</p>
        <p><strong>HTTPS:</strong> ${report.environment.isHTTPS ? '✅' : '❌'}</p>
        <p><strong>Voice Assistant:</strong> ${report.voiceAssistant.apiSupport && report.voiceAssistant.scriptLoaded ? '✅' : '❌'}</p>
        <p><strong>Chat System:</strong> ${report.chatSystem.scriptLoaded ? '✅' : '❌'}</p>
        <p><strong>API Health:</strong> ${report.apiEndpoints['/api/health']?.ok ? '✅' : '❌'}</p>
        <button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 10px;">Close</button>
    `;
    
    document.body.appendChild(reportDiv);
}

// Auto-run check when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDeploymentCheck);
} else {
    runDeploymentCheck();
}

// Export for manual testing
window.deploymentCheck = {
    run: runDeploymentCheck,
    voice: checkVoiceAssistant,
    chat: checkChatSystem,
    api: checkAPIEndpoints
};