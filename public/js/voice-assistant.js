class VoiceAssistant {
  constructor() {
    this.isListening = false;
    this.isProcessing = false;
    this.recognition = null;
    this.wakeWord = localStorage.getItem('voiceWakeWord') || 'hey fit-with';
    this.commands = this.initCommands();
    this.createUI();
    this.autoStart();
  }

  autoStart() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => this.handleSpeechResult(event);
    this.recognition.onerror = (event) => this.handleError(event);
    this.recognition.onend = () => this.handleEnd();
    
    // Auto-start listening like Siri
    setTimeout(() => this.startListening(), 1000);
  }

  initCommands() {
    return {
      'logout': () => this.executeLogout(),
      'log out': () => this.executeLogout(),
      'switch to dashboard': () => this.navigateTo('/dashboard'),
      'switch to workouts': () => this.navigateTo('/workouts'),
      'switch to nutrition': () => this.navigateTo('/nutrition'),
      'switch to progress': () => this.navigateTo('/progress'),
      'switch to challenges': () => this.navigateTo('/challenges'),
      'switch to community': () => this.navigateTo('/community'),
      'switch to settings': () => this.navigateTo('/settings'),
      'show workouts': () => this.showWorkouts(),
      'show nutrition': () => this.showNutrition(),
      'show progress': () => this.showProgress(),
      'start workout': () => this.startWorkout(),
      'log food': () => this.logFood(),
      'add water': () => this.addWater(),
      'show stats': () => this.showStats(),
      'help': () => this.showHelp(),
      'what can you do': () => this.showHelp()
    };
  }

  startListening() {
    if (!this.recognition || this.isListening) return;
    
    this.isListening = true;
    this.recognition.start();
    this.updateVoiceIndicator('listening');
  }

  stopListening() {
    if (!this.recognition || !this.isListening) return;
    
    this.isListening = false;
    this.recognition.stop();
    this.updateVoiceIndicator('stopped');
  }

  updateVoiceIndicator(state) {
    const orb = document.getElementById('voiceOrb');
    if (!orb) return;
    
    orb.className = 'voice-orb';
    
    switch(state) {
      case 'listening':
        orb.classList.add('listening');
        this.showPopup('Listening...', '👂');
        break;
      case 'processing':
        orb.classList.add('processing');
        this.showPopup('Processing...', '🤔');
        break;
      case 'stopped':
        this.hidePopup();
        break;
    }
  }

  handleSpeechResult(event) {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join('')
      .toLowerCase()
      .trim();

    if (!this.isProcessing && transcript.includes(this.wakeWord.toLowerCase())) {
      this.processCommand(transcript);
    }
  }

  processCommand(transcript) {
    this.isProcessing = true;
    this.updateVoiceIndicator('processing');

    const command = transcript.replace(this.wakeWord.toLowerCase(), '').trim();
    
    const matchedCommand = Object.keys(this.commands).find(cmd => 
      command.includes(cmd) || this.fuzzyMatch(command, cmd)
    );

    if (matchedCommand) {
      this.commands[matchedCommand]();
    } else {
      this.speak('Sorry, I didn\'t understand. Say help for available commands.');
    }

    setTimeout(() => {
      this.isProcessing = false;
      this.updateVoiceIndicator('listening');
    }, 1500);
  }

  fuzzyMatch(input, command) {
    const words = command.split(' ');
    return words.some(word => input.includes(word));
  }

  executeLogout() {
    this.speak('Logging you out');
    this.showPopup('Logging out...', '👋');
    fetch('/logout', { method: 'POST' })
      .then(() => window.location.href = '/')
      .catch(() => this.speak('Failed to logout'));
  }

  navigateTo(path) {
    const pageName = path.replace('/', '');
    this.speak(`Switching to ${pageName}`);
    this.showPopup(`Going to ${pageName}...`, '🚀');
    setTimeout(() => {
      window.location.href = path;
    }, 1000);
  }

  showWorkouts() {
    this.speak('Here are your recent workouts');
    this.showPopup('Loading workouts...', '💪');
    this.displayWorkouts();
  }

  showNutrition() {
    this.speak('Showing your nutrition summary');
    this.showPopup('Nutrition summary', '🥗');
    this.displayNutrition();
  }

  showProgress() {
    this.speak('Here is your progress summary');
    this.showPopup('Progress summary', '📊');
    this.displayProgress();
  }

  startWorkout() {
    this.speak('Starting quick workout log');
    this.showPopup('Opening workout log...', '🏋️');
    this.openQuickLog('workout');
  }

  logFood() {
    this.speak('Opening food logger');
    this.showPopup('Opening food log...', '🍽️');
    this.openQuickLog('nutrition');
  }

  addWater() {
    this.speak('Adding 250ml of water');
    this.showPopup('Adding water...', '💧');
    this.quickLogWater();
  }

  showStats() {
    this.speak('Here are your daily stats');
    this.showPopup('Daily statistics', '📈');
    this.displayStats();
  }

  showHelp() {
    const commands = [
      'switch to dashboard/workouts/nutrition',
      'show workouts/nutrition/progress',
      'log food', 'add water', 'start workout', 'logout'
    ];
    this.speak(`I can help you with navigation and quick actions`);
    this.showPopup('Available Commands', '❓', commands.join('\n• '));
  }

  displayWorkouts() {
    fetch('/api/workouts/recent')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.workouts.length > 0) {
          const latest = data.workouts[0];
          this.speak(`Your last workout was ${latest.type} for ${latest.duration} minutes`);
        } else {
          this.speak('No recent workouts found. Say start workout to log one.');
        }
      })
      .catch(() => this.speak('Could not load workout data'));
  }

  displayNutrition() {
    const calories = document.getElementById('caloriesToday')?.textContent || '0';
    const protein = document.getElementById('proteinToday')?.textContent || '0g';
    this.speak(`Today you have consumed ${calories} calories and ${protein} of protein`);
  }

  displayProgress() {
    const workouts = document.getElementById('workoutsThisWeek')?.textContent || '0/5';
    this.speak(`This week you have completed ${workouts} workouts`);
  }

  displayChallenges() {
    fetch('/api/challenges/active')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.challenges.length > 0) {
          this.speak(`You have ${data.challenges.length} active challenges`);
        } else {
          this.speak('No active challenges. Visit the challenges page to join one.');
        }
      })
      .catch(() => this.speak('Could not load challenge data'));
  }

  displayStats() {
    const calories = document.getElementById('caloriesToday')?.textContent || '0';
    const water = document.getElementById('waterToday')?.textContent || '0L';
    this.speak(`Today: ${calories} calories consumed, ${water} of water`);
  }

  openQuickLog(type) {
    const quickLogBtn = document.getElementById('quickLogBtn');
    if (quickLogBtn) {
      quickLogBtn.click();
      setTimeout(() => {
        const logType = document.getElementById('logType');
        if (logType) {
          logType.value = type;
          logType.dispatchEvent(new Event('change'));
        }
      }, 500);
    }
  }

  quickLogWater() {
    fetch('/api/nutrition/water', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 250 })
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        this.speak('Water logged successfully');
        if (typeof loadDashboardData === 'function') loadDashboardData();
      } else {
        this.speak('Failed to log water');
      }
    })
    .catch(() => this.speak('Error logging water'));
  }

  displayHelp(commands) {
    this.showFloatingMessage('Voice Commands', commands.map(cmd => `• ${cmd}`).join('\n'));
  }

  createUI() {
    const assistant = document.createElement('div');
    assistant.className = 'voice-assistant';
    assistant.innerHTML = `
      <div id="voiceOrb" class="voice-orb">
        <i class="fas fa-microphone voice-icon"></i>
        <div class="voice-waves">
          <div class="voice-wave"></div>
          <div class="voice-wave"></div>
          <div class="voice-wave"></div>
        </div>
        <button class="voice-settings-btn" id="voiceSettingsBtn">
          <i class="fas fa-cog"></i>
        </button>
      </div>
      <div id="voicePopup" class="voice-popup">
        <div class="voice-status" id="voiceStatus">
          <span id="voiceEmoji">🎤</span>
          <span id="voiceStatusText">Voice Assistant</span>
        </div>
        <div class="voice-command" id="voiceCommand">Say "${this.wakeWord}" to start</div>
      </div>
    `;
    
    document.body.appendChild(assistant);
    this.setupEventListeners();
    this.createSettingsModal();
  }

  createSettingsModal() {
    const modal = document.createElement('div');
    modal.id = 'voiceSettingsModal';
    modal.className = 'voice-settings-modal';
    modal.innerHTML = `
      <div class="voice-settings-content">
        <h2 class="settings-title">🎤 Voice Assistant Settings</h2>
        <div class="settings-group">
          <label class="settings-label">Wake Word</label>
          <input type="text" id="wakeWordInput" class="settings-input" 
                 placeholder="e.g., hey babe, hey assistant" value="${this.wakeWord}">
          <small style="color: #6c757d; font-size: 14px;">Choose any wake word you like (e.g., "hey babe", "hey assistant")</small>
        </div>
        <div class="settings-buttons">
          <button class="settings-btn secondary" id="cancelSettings">Cancel</button>
          <button class="settings-btn primary" id="saveSettings">Save Changes</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  setupEventListeners() {
    const settingsBtn = document.getElementById('voiceSettingsBtn');
    const modal = document.getElementById('voiceSettingsModal');
    const saveBtn = document.getElementById('saveSettings');
    const cancelBtn = document.getElementById('cancelSettings');
    
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      modal.classList.add('show');
    });
    
    cancelBtn.addEventListener('click', () => {
      modal.classList.remove('show');
    });
    
    saveBtn.addEventListener('click', () => {
      const newWakeWord = document.getElementById('wakeWordInput').value.trim();
      if (newWakeWord) {
        this.setWakeWord(newWakeWord);
        modal.classList.remove('show');
        this.speak(`Wake word changed to ${newWakeWord}`);
        this.showPopup('Settings saved!', '✅');
      }
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  }

  showPopup(status, emoji, command = '') {
    const popup = document.getElementById('voicePopup');
    const statusText = document.getElementById('voiceStatusText');
    const emojiEl = document.getElementById('voiceEmoji');
    const commandEl = document.getElementById('voiceCommand');
    
    statusText.textContent = status;
    emojiEl.textContent = emoji;
    commandEl.textContent = command || `Say "${this.wakeWord}" for commands`;
    
    popup.classList.add('show');
    
    if (status !== 'Listening...') {
      setTimeout(() => this.hidePopup(), 3000);
    }
  }

  hidePopup() {
    const popup = document.getElementById('voicePopup');
    popup.classList.remove('show');
  }

  speak(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  }

  setWakeWord(newWakeWord) {
    this.wakeWord = newWakeWord;
    localStorage.setItem('voiceWakeWord', newWakeWord);
    const commandEl = document.getElementById('voiceCommand');
    if (commandEl) {
      commandEl.textContent = `Say "${this.wakeWord}" for commands`;
    }
  }

  handleError(event) {
    console.error('Speech recognition error:', event.error);
    if (event.error === 'not-allowed') {
      this.showStatus('Microphone access denied');
    } else {
      this.showStatus('Voice recognition error');
    }
  }

  handleEnd() {
    if (this.isListening) {
      setTimeout(() => this.recognition.start(), 100);
    }
  }

  setWakeWord(newWakeWord) {
    this.wakeWord = newWakeWord;
    localStorage.setItem('voiceWakeWord', newWakeWord);
    this.showStatus(`Wake word changed to "${newWakeWord}"`);
  }
}

// Initialize voice assistant
const voiceAssistant = new VoiceAssistant();
window.voiceAssistant = voiceAssistant;