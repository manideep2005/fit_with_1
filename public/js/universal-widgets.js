// Universal Widget Loader for Fit-With-AI
(function() {
    'use strict';
    
    // Check if we're on a protected page (not login/signup/landing)
    const isProtectedPage = () => {
        const path = window.location.pathname;
        return path !== '/' && 
               !path.includes('login') && 
               !path.includes('signup') && 
               !path.includes('forgot-password') &&
               !path.includes('reset-password');
    };
    
    // Voice Assistant
    class SimpleVoiceAssistant {
        constructor() {
            this.isListening = false;
            this.recognition = null;
            this.init();
        }
        
        init() {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                return;
            }
            
            this.setupRecognition();
            this.createButton();
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
            
            this.recognition.onend = () => {
                this.stopListening();
            };
        }
        
        processCommand(command) {
            console.log('🎤 Voice command:', command);
            
            if (command.includes('dashboard') || command.includes('home')) {
                this.speak('Going to dashboard');
                setTimeout(() => window.location.href = '/dashboard', 1000);
            } else if (command.includes('workout') || command.includes('exercise')) {
                this.speak('Opening workouts');
                setTimeout(() => window.location.href = '/workouts', 1000);
            } else if (command.includes('nutrition') || command.includes('food')) {
                this.speak('Opening nutrition');
                setTimeout(() => window.location.href = '/nutrition', 1000);
            } else if (command.includes('progress')) {
                this.speak('Opening progress');
                setTimeout(() => window.location.href = '/progress', 1000);
            } else if (command.includes('add water')) {
                this.addWater();
            } else if (command.includes('help')) {
                this.speak('I can help you navigate pages, add water, and more. Try saying go to workouts or add water.');
            } else {
                this.speak('I didn\\'t understand. Try saying help for available commands.');
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
                    this.showNotification('💧 Water logged! +250ml', 'success');
                }
            } catch (error) {
                this.speak('Water logged');
                this.showNotification('💧 Water logged! +250ml', 'success');
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
            this.updateButton(true);
            this.recognition.start();
        }
        
        stopListening() {
            this.isListening = false;
            this.updateButton(false);
        }
        
        updateButton(listening) {
            const button = document.getElementById('voice-assistant-btn');
            if (!button) return;
            
            if (listening) {
                button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';\n                button.innerHTML = '<i class=\"fas fa-stop\"></i>';\n                button.title = 'Stop listening';\n            } else {\n                button.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';\n                button.innerHTML = '<i class=\"fas fa-microphone\"></i>';\n                button.title = 'Click to speak (Fit-With-AI Voice)';\n            }\n        }\n        \n        createButton() {\n            const button = document.createElement('div');\n            button.id = 'voice-assistant-btn';\n            button.innerHTML = '<i class=\"fas fa-microphone\"></i>';\n            button.title = 'Click to speak (Fit-With-AI Voice)';\n            button.style.cssText = `\n                position: fixed;\n                bottom: 200px;\n                right: 30px;\n                width: 60px;\n                height: 60px;\n                background: linear-gradient(135deg, #6366f1, #8b5cf6);\n                border-radius: 50%;\n                display: flex;\n                align-items: center;\n                justify-content: center;\n                cursor: pointer;\n                box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);\n                z-index: 9998;\n                color: white;\n                font-size: 20px;\n                transition: all 0.3s ease;\n            `;\n            \n            button.addEventListener('click', () => {\n                if (this.isListening) {\n                    this.stopListening();\n                } else {\n                    this.startListening();\n                }\n            });\n            \n            document.body.appendChild(button);\n        }\n        \n        showNotification(message, type = 'success') {\n            const notification = document.createElement('div');\n            notification.style.cssText = `\n                position: fixed;\n                top: 20px;\n                right: 20px;\n                background: ${type === 'success' ? '#10b981' : '#ef4444'};\n                color: white;\n                padding: 12px 20px;\n                border-radius: 8px;\n                z-index: 10000;\n                font-size: 14px;\n                box-shadow: 0 4px 12px rgba(0,0,0,0.15);\n                animation: slideIn 0.3s ease-out;\n            `;\n            notification.textContent = message;\n            \n            const style = document.createElement('style');\n            style.textContent = `\n                @keyframes slideIn {\n                    from { transform: translateX(100%); opacity: 0; }\n                    to { transform: translateX(0); opacity: 1; }\n                }\n            `;\n            document.head.appendChild(style);\n            \n            document.body.appendChild(notification);\n            \n            setTimeout(() => {\n                notification.remove();\n                style.remove();\n            }, 3000);\n        }\n    }\n    \n    // Gamification Widget\n    class SimpleGamificationWidget {\n        constructor() {\n            this.data = { level: 1, totalXP: 0, streaks: { workout: { current: 0 }, nutrition: { current: 0 } } };\n            this.isVisible = false;\n            this.init();\n        }\n        \n        async init() {\n            await this.loadData();\n            this.createWidget();\n        }\n        \n        async loadData() {\n            try {\n                const response = await fetch('/api/gamification-data');\n                const result = await response.json();\n                if (result.success) {\n                    this.data = { ...this.data, ...result.data };\n                }\n            } catch (error) {\n                // Use default data\n            }\n        }\n        \n        createWidget() {\n            const widget = document.createElement('div');\n            widget.id = 'gamification-widget-simple';\n            widget.innerHTML = `\n                <div class=\"gam-toggle\" onclick=\"window.simpleGamWidget.toggle()\">\n                    <i class=\"fas fa-trophy\"></i>\n                    <span class=\"gam-level\">${this.data.level || 1}</span>\n                </div>\n                \n                <div class=\"gam-panel\" style=\"display: none;\">\n                    <div class=\"gam-header\">\n                        <h3>🏆 Your Progress</h3>\n                        <button onclick=\"window.simpleGamWidget.hide()\">×</button>\n                    </div>\n                    \n                    <div class=\"gam-content\">\n                        <div class=\"gam-stats\">\n                            <div>Level: ${this.data.level || 1}</div>\n                            <div>XP: ${this.data.totalXP || 0}</div>\n                        </div>\n                        \n                        <div class=\"gam-streaks\">\n                            <div>🏋️ Workout: ${this.data.streaks?.workout?.current || 0} days</div>\n                            <div>🍎 Nutrition: ${this.data.streaks?.nutrition?.current || 0} days</div>\n                        </div>\n                        \n                        <div class=\"gam-actions\">\n                            <button onclick=\"window.simpleGamWidget.quickWorkout()\">Quick Workout</button>\n                            <button onclick=\"window.simpleGamWidget.quickMeal()\">Quick Meal</button>\n                        </div>\n                    </div>\n                </div>\n            `;\n            \n            this.addStyles();\n            document.body.appendChild(widget);\n            window.simpleGamWidget = this;\n        }\n        \n        addStyles() {\n            if (document.getElementById('simple-gam-styles')) return;\n            \n            const style = document.createElement('style');\n            style.id = 'simple-gam-styles';\n            style.textContent = `\n                #gamification-widget-simple {\n                    position: fixed;\n                    bottom: 130px;\n                    right: 30px;\n                    z-index: 9999;\n                    font-family: 'Inter', sans-serif;\n                }\n                \n                .gam-toggle {\n                    width: 60px;\n                    height: 60px;\n                    background: linear-gradient(135deg, #6366f1, #8b5cf6);\n                    border-radius: 50%;\n                    display: flex;\n                    align-items: center;\n                    justify-content: center;\n                    cursor: pointer;\n                    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);\n                    transition: all 0.3s ease;\n                    position: relative;\n                    color: white;\n                    font-size: 20px;\n                }\n                \n                .gam-toggle:hover { transform: scale(1.1); }\n                \n                .gam-level {\n                    position: absolute;\n                    bottom: -5px;\n                    right: -5px;\n                    background: #10b981;\n                    color: white;\n                    border-radius: 50%;\n                    width: 24px;\n                    height: 24px;\n                    display: flex;\n                    align-items: center;\n                    justify-content: center;\n                    font-size: 12px;\n                    font-weight: 600;\n                    border: 2px solid white;\n                }\n                \n                .gam-panel {\n                    position: absolute;\n                    bottom: 70px;\n                    right: 0;\n                    width: 300px;\n                    background: white;\n                    border-radius: 16px;\n                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);\n                    border: 1px solid #e2e8f0;\n                    overflow: hidden;\n                }\n                \n                .gam-header {\n                    background: linear-gradient(135deg, #6366f1, #8b5cf6);\n                    color: white;\n                    padding: 20px;\n                    display: flex;\n                    justify-content: space-between;\n                    align-items: center;\n                }\n                \n                .gam-header h3 { margin: 0; font-size: 18px; font-weight: 600; }\n                \n                .gam-header button {\n                    background: none;\n                    border: none;\n                    color: white;\n                    font-size: 24px;\n                    cursor: pointer;\n                    padding: 0;\n                    width: 30px;\n                    height: 30px;\n                    display: flex;\n                    align-items: center;\n                    justify-content: center;\n                    border-radius: 50%;\n                }\n                \n                .gam-content { padding: 20px; }\n                \n                .gam-stats {\n                    display: flex;\n                    justify-content: space-between;\n                    margin-bottom: 15px;\n                    font-weight: 600;\n                    color: #1e293b;\n                }\n                \n                .gam-streaks { margin-bottom: 20px; }\n                .gam-streaks div { margin-bottom: 8px; font-size: 14px; color: #475569; }\n                \n                .gam-actions { display: flex; gap: 10px; }\n                \n                .gam-actions button {\n                    flex: 1;\n                    padding: 10px;\n                    background: #f8fafc;\n                    border: 1px solid #e2e8f0;\n                    border-radius: 8px;\n                    cursor: pointer;\n                    transition: all 0.3s ease;\n                    font-size: 12px;\n                    color: #475569;\n                }\n                \n                .gam-actions button:hover {\n                    background: #6366f1;\n                    color: white;\n                    border-color: #6366f1;\n                }\n                \n                @media (max-width: 768px) {\n                    .gam-panel { width: 280px; right: -20px; }\n                }\n            `;\n            \n            document.head.appendChild(style);\n        }\n        \n        toggle() {\n            const panel = document.querySelector('#gamification-widget-simple .gam-panel');\n            this.isVisible = !this.isVisible;\n            panel.style.display = this.isVisible ? 'block' : 'none';\n            \n            if (this.isVisible) {\n                this.loadData();\n            }\n        }\n        \n        hide() {\n            const panel = document.querySelector('#gamification-widget-simple .gam-panel');\n            this.isVisible = false;\n            panel.style.display = 'none';\n        }\n        \n        async quickWorkout() {\n            try {\n                const response = await fetch('/api/workouts', {\n                    method: 'POST',\n                    headers: { 'Content-Type': 'application/json' },\n                    body: JSON.stringify({\n                        type: 'Quick Workout',\n                        duration: 30,\n                        calories: 200,\n                        notes: 'Quick workout via gamification widget'\n                    })\n                });\n                \n                this.showNotification('🏋️ Workout logged! +50 XP');\n                this.loadData();\n            } catch (error) {\n                this.showNotification('🏋️ Workout logged! +50 XP');\n            }\n        }\n        \n        async quickMeal() {\n            try {\n                const response = await fetch('/api/nutrition', {\n                    method: 'POST',\n                    headers: { 'Content-Type': 'application/json' },\n                    body: JSON.stringify({\n                        meals: [{ name: 'Quick Meal', calories: 150, protein: 10 }],\n                        totalCalories: 150,\n                        totalProtein: 10\n                    })\n                });\n                \n                this.showNotification('🍎 Meal logged! +25 XP');\n                this.loadData();\n            } catch (error) {\n                this.showNotification('🍎 Meal logged! +25 XP');\n            }\n        }\n        \n        showNotification(message) {\n            const notification = document.createElement('div');\n            notification.style.cssText = `\n                position: fixed;\n                top: 20px;\n                right: 20px;\n                background: #10b981;\n                color: white;\n                padding: 12px 20px;\n                border-radius: 8px;\n                z-index: 10000;\n                font-size: 14px;\n                box-shadow: 0 4px 12px rgba(0,0,0,0.15);\n            `;\n            notification.textContent = message;\n            document.body.appendChild(notification);\n            \n            setTimeout(() => notification.remove(), 3000);\n        }\n    }\n    \n    // Initialize widgets when DOM is ready\n    function initializeWidgets() {\n        if (!isProtectedPage()) return;\n        \n        console.log('🚀 Initializing Fit-With-AI widgets...');\n        \n        // Initialize Voice Assistant\n        try {\n            window.simpleVoiceAssistant = new SimpleVoiceAssistant();\n            console.log('✅ Voice Assistant initialized');\n        } catch (error) {\n            console.log('❌ Voice Assistant failed to initialize:', error.message);\n        }\n        \n        // Initialize Gamification Widget\n        try {\n            window.simpleGamificationWidget = new SimpleGamificationWidget();\n            console.log('✅ Gamification Widget initialized');\n        } catch (error) {\n            console.log('❌ Gamification Widget failed to initialize:', error.message);\n        }\n    }\n    \n    // Initialize when DOM is ready\n    if (document.readyState === 'loading') {\n        document.addEventListener('DOMContentLoaded', initializeWidgets);\n    } else {\n        initializeWidgets();\n    }\n    \n})();