// Vercel-compatible Voice Assistant for Fit-With-AI
class VoiceAssistantVercel {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.isEnabled = true;
        this.init();
    }

    init() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.log('Voice recognition not supported');
            return;
        }
        
        this.setupRecognition();
        this.createUI();
        console.log('✅ Fit-With-AI Voice Assistant ready');
    }

    setupRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
            const command = event.results[0][0].transcript.toLowerCase().trim();
            this.processCommand(command);
        };

        this.recognition.onerror = () => {
            this.stopListening();
        };

        this.recognition.onend = () => {
            this.stopListening();
        };
    }

    processCommand(command) {
        console.log('Voice command:', command);
        
        if (command.includes('dashboard') || command.includes('home')) {
            this.speak('Going to dashboard');
            window.location.href = '/dashboard';
        } else if (command.includes('workout') || command.includes('exercise')) {
            this.speak('Opening workouts');
            window.location.href = '/workouts';
        } else if (command.includes('nutrition') || command.includes('food')) {
            this.speak('Opening nutrition');
            window.location.href = '/nutrition';
        } else if (command.includes('progress') || command.includes('stats')) {
            this.speak('Opening progress');
            window.location.href = '/progress';
        } else if (command.includes('add water') || command.includes('log water')) {
            this.addWater();
        } else if (command.includes('log workout')) {
            this.logWorkout();
        } else if (command.includes('help')) {
            this.speak('I can help you navigate, log workouts, add water, and more. Try saying go to workouts or add water.');
        } else {
            this.speak('I didn\'t understand. Try saying help for commands.');
        }
    }

    async addWater() {
        try {
            this.speak('Adding water');
            const response = await fetch('/api/nutrition/water', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 250 })
            });
            
            if (response.ok) {
                this.speak('Water logged successfully');
            }
        } catch (error) {
            this.speak('Error logging water');
        }
    }

    logWorkout() {
        this.speak('Opening workout log');
        const quickLogBtn = document.getElementById('quickLogBtn');
        if (quickLogBtn) {
            quickLogBtn.click();
        }
    }

    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        }
    }

    startListening() {
        if (!this.recognition || this.isListening) return;
        
        this.isListening = true;
        this.updateUI('listening');
        this.recognition.start();
    }

    stopListening() {
        this.isListening = false;
        this.updateUI('stopped');
    }

    updateUI(state) {
        const button = document.getElementById('voice-btn');
        if (!button) return;

        if (state === 'listening') {
            button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            button.innerHTML = '<i class="fas fa-stop"></i>';
        } else {
            button.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
            button.innerHTML = '<i class="fas fa-microphone"></i>';
        }
    }

    createUI() {
        const button = document.createElement('div');
        button.id = 'voice-btn';
        button.innerHTML = '<i class="fas fa-microphone"></i>';
        button.style.cssText = `
            position: fixed;
            bottom: 200px;
            right: 30px;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
            z-index: 9998;
            color: white;
            font-size: 20px;
            transition: all 0.3s ease;
        `;

        button.addEventListener('click', () => {
            if (this.isListening) {
                this.stopListening();
            } else {
                this.startListening();
            }
        });

        document.body.appendChild(button);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname !== '/' && !window.location.pathname.includes('login')) {
        window.voiceAssistant = new VoiceAssistantVercel();
    }
});