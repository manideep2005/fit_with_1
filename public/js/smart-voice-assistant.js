/**
 * Smart Voice Assistant for Chat
 * Provides voice interaction capabilities for the chat interface
 */

class SmartVoiceAssistant {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.initializeSpeechRecognition();
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onstart = () => {
                this.isListening = true;
                console.log('Voice recognition started');
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.handleVoiceCommand(transcript);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isListening = false;
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                console.log('Voice recognition ended');
            };
        } else {
            console.warn('Speech recognition not supported in this browser');
        }
    }

    startListening() {
        if (this.recognition && !this.isListening) {
            this.recognition.start();
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    handleVoiceCommand(transcript) {
        console.log('Voice command received:', transcript);
        
        const command = transcript.toLowerCase();
        
        // Handle different voice commands
        if (command.includes('send message')) {
            this.handleSendMessage(transcript);
        } else if (command.includes('call')) {
            this.handleCallCommand(transcript);
        } else if (command.includes('open chat')) {
            this.handleOpenChat(transcript);
        } else {
            // Default: treat as message content
            this.insertMessageText(transcript);
        }
    }

    handleSendMessage(transcript) {
        // Extract message content after "send message"
        const messageMatch = transcript.match(/send message (.+)/i);
        if (messageMatch) {
            const messageContent = messageMatch[1];
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.value = messageContent;
                // Trigger send message function if it exists
                if (typeof sendMessage === 'function') {
                    sendMessage();
                }
            }
        }
    }

    handleCallCommand(transcript) {
        if (transcript.toLowerCase().includes('video call')) {
            if (typeof startVideoCall === 'function') {
                startVideoCall();
            }
        } else if (transcript.toLowerCase().includes('voice call')) {
            if (typeof startVoiceCall === 'function') {
                startVoiceCall();
            }
        }
    }

    handleOpenChat(transcript) {
        // This could be enhanced to open specific chats by name
        console.log('Open chat command:', transcript);
    }

    insertMessageText(text) {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = text;
            messageInput.focus();
        }
    }

    speak(text) {
        if (this.synthesis) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.8;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            this.synthesis.speak(utterance);
        }
    }

    // Announce incoming messages
    announceMessage(senderName, messageContent) {
        const announcement = `New message from ${senderName}: ${messageContent}`;
        this.speak(announcement);
    }

    // Announce call events
    announceCall(type, callerName) {
        const announcement = `Incoming ${type} call from ${callerName}`;
        this.speak(announcement);
    }
}

// Initialize the smart voice assistant
const smartVoiceAssistant = new SmartVoiceAssistant();

// Export for global use
window.smartVoiceAssistant = smartVoiceAssistant;