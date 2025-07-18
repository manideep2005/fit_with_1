        // Global variables
        let mealLog = {
            breakfast: [],
            lunch: [],
            snacks: [],
            dinner: []
        };
        
        let nutritionGoals = {
            calories: 2000,
            protein: 150,
            carbs: 250,
            fat: 67
        };
        
        let currentNutrition = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
        };
        
        // Initialize the page
        document.addEventListener('DOMContentLoaded', function() {
            loadMealLog();
            updateNutritionSummary();
            generateAISuggestions();
            
            // Setup photo upload
            setupPhotoUpload();
            
            // Setup search
            setupSearch();
            
            // Load today's data from server
            loadTodaysData();
        });
        
        // Load today's meal data from server
        async function loadTodaysData() {
            try {
                const response = await fetch('/api/nutrition/today');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.nutrition) {
                        // Update current nutrition from server data
                        currentNutrition = {
                            calories: data.nutrition.totalCalories || 0,
                            protein: data.nutrition.totalProtein || 0,
                            carbs: data.nutrition.totalCarbs || 0,
                            fat: data.nutrition.totalFat || 0
                        };
                        
                        // Update meal log if available
                        if (data.nutrition.meals) {
                            data.nutrition.meals.forEach(meal => {
                                if (mealLog[meal.category]) {
                                    mealLog[meal.category].push(meal);
                                }
                            });
                        }
                        
                        updateNutritionSummary();
                        updateMealLogDisplay();
                    }
                }
            } catch (error) {
                console.error('Error loading today\'s data:', error);
            }
        }
        
        // Setup photo upload functionality
        function setupPhotoUpload() {
            const photoUpload = document.getElementById('photoUpload');
            const photoInput = document.getElementById('photoInput');
            
            // Drag and drop
            photoUpload.addEventListener('dragover', (e) => {
                e.preventDefault();
                photoUpload.classList.add('dragover');
            });
            
            photoUpload.addEventListener('dragleave', () => {
                photoUpload.classList.remove('dragover');
            });
            
            photoUpload.addEventListener('drop', (e) => {
                e.preventDefault();
                photoUpload.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    handlePhotoUpload(files[0]);
                }
            });
            
            // File input change
            photoInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    handlePhotoUpload(e.target.files[0]);
                }
            });
        }
        
        // Handle photo upload and recognition
        async function handlePhotoUpload(file) {
            if (!file.type.startsWith('image/')) {
                showToast('Please select a valid image file', 'error');
                return;
            }
            
            showToast('Analyzing photo...', 'info');
            
            try {
                // Create FormData for file upload
                const formData = new FormData();
                formData.append('photo', file);
                
                // Mock API call - replace with actual food recognition API
                const response = await mockPhotoRecognition(file);
                
                if (response.success) {
                    displaySearchResults(response.foods);
                    showToast('Food recognized successfully!', 'success');
                } else {
                    showToast('Could not recognize food in photo', 'error');
                }
            } catch (error) {
                console.error('Photo recognition error:', error);
                showToast('Error analyzing photo', 'error');
            }
        }
        
        // Mock photo recognition (replace with actual API)
        async function mockPhotoRecognition(file) {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Mock response
            return {
                success: true,
                foods: [
                    {
                        name: 'Grilled Chicken Breast',
                        brand: 'Estimated',
                        calories: 165,
                        protein: 31,
                        carbs: 0,
                        fat: 3.6,
                        serving: '100g',
                        confidence: 0.85
                    },
                    {
                        name: 'Mixed Green Salad',
                        brand: 'Estimated',
                        calories: 20,
                        protein: 2,
                        carbs: 4,
                        fat: 0.2,
                        serving: '1 cup',
                        confidence: 0.75
                    }
                ]
            };
        }
        
        // Setup search functionality
        function setupSearch() {
            const searchInput = document.getElementById('foodSearch');
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    searchFood();
                }
            });
        }
        
        // Search for food items
        async function searchFood() {
            const query = document.getElementById('foodSearch').value.trim();
            
            if (!query) {
                showToast('Please enter a food item to search', 'error');
                return;
            }
            
            showToast('Searching for foods...', 'info');
            
            try {
                const response = await fetch(`/api/nutriscan/search?q=${encodeURIComponent(query)}`);
                const data = await response.json();
                
                if (data.success && data.products.length > 0) {
                    displaySearchResults(data.products);
                    showToast(`Found ${data.products.length} results`, 'success');
                } else {
                    showToast('No foods found for your search', 'error');
                }
            } catch (error) {
                console.error('Search error:', error);
                showToast('Error searching for foods', 'error');
            }
        }
        
        // Scan barcode
        async function scanBarcode() {
            const barcode = document.getElementById('barcodeInput').value.trim();
            
            if (!barcode) {
                showToast('Please enter a barcode', 'error');
                return;
            }
            
            showToast('Looking up barcode...', 'info');
            
            try {
                const response = await fetch(`/api/nutriscan/barcode/${barcode}`);
                const data = await response.json();
                
                if (data.success) {
                    displaySearchResults([data.nutrition]);
                    showToast('Product found!', 'success');
                } else {
                    showToast('Product not found in database', 'error');
                }
            } catch (error) {
                console.error('Barcode scan error:', error);
                showToast('Error scanning barcode', 'error');
            }
        }
        
        // Voice input functionality
        function startVoiceInput() {
            if (!('webkitSpeechRecognition' in window)) {
                showToast('Voice recognition not supported in this browser', 'error');
                return;
            }
            
            const recognition = new webkitSpeechRecognition();
            const voiceBtn = document.getElementById('voiceBtn');
            
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            
            voiceBtn.classList.add('listening');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i> Listening...';
            
            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                processVoiceInput(transcript);
            };
            
            recognition.onerror = function(event) {
                console.error('Voice recognition error:', event.error);
                showToast('Voice recognition error', 'error');
                resetVoiceButton();
            };
            
            recognition.onend = function() {
                resetVoiceButton();
            };
            
            recognition.start();
        }
        
        function resetVoiceButton() {
            const voiceBtn = document.getElementById('voiceBtn');
            voiceBtn.classList.remove('listening');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Voice Input';
        }
        
        // Process voice input
        async function processVoiceInput(transcript) {
            showToast(`Processing: "${transcript}"`, 'info');
            
            try {
                // Mock AI processing of voice input
                const foods = await mockVoiceProcessing(transcript);
                
                if (foods.length > 0) {
                    displaySearchResults(foods);
                    showToast('Voice input processed successfully!', 'success');
                } else {
                    showToast('Could not identify foods from voice input', 'error');
                }
            } catch (error) {
                console.error('Voice processing error:', error);
                showToast('Error processing voice input', 'error');
            }
        }
        
        // Mock voice processing (replace with actual AI)
        async function mockVoiceProcessing(transcript) {
            // Simulate AI processing
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Simple keyword matching for demo
            const foods = [];
            
            if (transcript.toLowerCase().includes('chicken')) {
                foods.push({
                    name: 'Chicken Breast',
                    brand: 'Generic',
                    calories: 165,
                    protein: 31,
                    carbs: 0,
                    fat: 3.6,
                    serving: '100g'
                });
            }
            
            if (transcript.toLowerCase().includes('salad')) {
                foods.push({
                    name: 'Garden Salad',
                    brand: 'Generic',
                    calories: 20,
                    protein: 2,
                    carbs: 4,
                    fat: 0.2,
                    serving: '1 cup'
                });
            }
            
            if (transcript.toLowerCase().includes('rice')) {
                foods.push({
                    name: 'White Rice',
                    brand: 'Generic',
                    calories: 130,
                    protein: 2.7,
                    carbs: 28,
                    fat: 0.3,
                    serving: '1/2 cup'
                });
            }
            
            return foods;
        }
        
        // Display search results
        function displaySearchResults(foods) {
            const resultsSection = document.getElementById('searchResults');
            const resultsGrid = document.getElementById('resultsGrid');
            
            resultsGrid.innerHTML = '';
            
            foods.forEach((food, index) => {
                const foodItem = createFoodItemElement(food, index);
                resultsGrid.appendChild(foodItem);
            });
            
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Create food item element
        function createFoodItemElement(food, index) {
            const div = document.createElement('div');
            div.className = 'food-item';
            div.innerHTML = `
                <div class="food-header">
                    <div>
                        <h4 class="food-name">${food.name}</h4>
                        <p class="food-brand">${food.brand || 'Generic'}</p>
                    </div>
                    <div class="food-image"></div>
                </div>
                <div class="nutrition-info">
                    <div class="nutrition-item">
                        <span class="nutrition-label">Calories:</span>
                        <span class="nutrition-value">${food.calories}</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="nutrition-label">Protein:</span>
                        <span class="nutrition-value">${food.protein}g</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="nutrition-label">Carbs:</span>
                        <span class="nutrition-value">${food.carbs}g</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="nutrition-label">Fat:</span>
                        <span class="nutrition-value">${food.fat}g</span>
                    </div>
                </div>
                <div class="serving-controls">
                    <span class="serving-label">Serving: ${food.serving}</span>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="changeQuantity(${index}, -1)">-</button>
                        <input type="number" class="quantity-input" id="quantity-${index}" value="1" min="0.1" step="0.1">
                        <button class="quantity-btn" onclick="changeQuantity(${index}, 1)">+</button>
                    </div>
                    <button class="add-to-log-btn" onclick="showMealCategoryModal(${index})">
                        <i class="fas fa-plus"></i> Add to Log
                    </button>
                </div>
            `;
            
            // Store food data on element
            div.foodData = food;
            
            return div;
        }
        
        // Change quantity
        function changeQuantity(index, delta) {
            const quantityInput = document.getElementById(`quantity-${index}`);
            const currentValue = parseFloat(quantityInput.value);
            const newValue = Math.max(0.1, currentValue + delta);
            quantityInput.value = newValue.toFixed(1);
        }
        
        // Show meal category selection modal
        function showMealCategoryModal(index) {
            const categories = ['breakfast', 'lunch', 'snacks', 'dinner'];
            const categoryNames = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
            
            // Simple prompt for demo - replace with proper modal
            const categoryIndex = prompt(`Select meal category:\n${categoryNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}\n\nEnter number (1-4):`);
            
            if (categoryIndex && categoryIndex >= 1 && categoryIndex <= 4) {
                const category = categories[categoryIndex - 1];
                addToMealLog(index, category);
            }
        }
        
        // Add food to meal log
        function addToMealLog(index, category) {
            const foodItem = document.querySelectorAll('.food-item')[index];
            const food = foodItem.foodData;
            const quantity = parseFloat(document.getElementById(`quantity-${index}`).value);
            
            const logEntry = {
                name: food.name,
                brand: food.brand || 'Generic',
                calories: Math.round(food.calories * quantity),
                protein: Math.round(food.protein * quantity * 10) / 10,
                carbs: Math.round(food.carbs * quantity * 10) / 10,
                fat: Math.round(food.fat * quantity * 10) / 10,
                serving: food.serving,
                quantity: quantity,
                timestamp: new Date().toISOString()
            };
            
            mealLog[category].push(logEntry);
            
            // Update nutrition totals
            currentNutrition.calories += logEntry.calories;
            currentNutrition.protein += logEntry.protein;
            currentNutrition.carbs += logEntry.carbs;
            currentNutrition.fat += logEntry.fat;
            
            // Save to server
            saveMealToServer(logEntry, category);
            
            // Update displays
            updateMealLogDisplay();
            updateNutritionSummary();
            saveMealLog();
            
            showToast(`Added ${food.name} to ${category}!`, 'success');
        }
        
        // Save meal to server
        async function saveMealToServer(meal, category) {
            try {
                const response = await fetch('/api/nutrition', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        meals: [{
                            name: meal.name,
                            category: category,
                            calories: meal.calories,
                            protein: meal.protein,
                            carbs: meal.carbs,
                            fat: meal.fat,
                            quantity: meal.quantity,
                            serving: meal.serving
                        }],
                        totalCalories: meal.calories,
                        totalProtein: meal.protein,
                        totalCarbs: meal.carbs,
                        totalFat: meal.fat
                    })
                });
                
                if (!response.ok) {
                    console.error('Failed to save meal to server');
                }
            } catch (error) {
                console.error('Error saving meal to server:', error);
            }
        }
        
        // Update meal log display
        function updateMealLogDisplay() {
            const categories = ['breakfast', 'lunch', 'snacks', 'dinner'];
            
            categories.forEach(category => {
                const itemsContainer = document.getElementById(`${category}Items`);
                const caloriesElement = document.getElementById(`${category}Calories`);
                
                if (mealLog[category].length === 0) {
                    itemsContainer.innerHTML = '<div class="empty-category">No items added yet</div>';
                    caloriesElement.textContent = '0 cal';
                } else {
                    const totalCalories = mealLog[category].reduce((sum, item) => sum + item.calories, 0);
                    caloriesElement.textContent = `${totalCalories} cal`;
                    
                    itemsContainer.innerHTML = mealLog[category].map((item, index) => `
                        <div class="meal-item">
                            <div class="item-info">
                                <h5 class="item-name">${item.name}</h5>
                                <p class="item-details">${item.quantity} × ${item.serving} | ${item.protein}g protein</p>
                            </div>
                            <div class="item-calories">${item.calories} cal</div>
                            <button class="remove-item" onclick="removeFromMealLog('${category}', ${index})">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `).join('');
                }
            });
        }
        
        // Remove item from meal log
        function removeFromMealLog(category, index) {
            const item = mealLog[category][index];
            
            // Update nutrition totals
            currentNutrition.calories -= item.calories;
            currentNutrition.protein -= item.protein;
            currentNutrition.carbs -= item.carbs;
            currentNutrition.fat -= item.fat;
            
            // Remove from log
            mealLog[category].splice(index, 1);
            
            // Update displays
            updateMealLogDisplay();
            updateNutritionSummary();
            saveMealLog();
            
            showToast(`Removed ${item.name} from ${category}`, 'info');
        }
        
        // Update nutrition summary
        function updateNutritionSummary() {
            // Check if elements exist before updating
            const totalCaloriesEl = document.getElementById('totalCalories');
            const totalProteinEl = document.getElementById('totalProtein');
            const totalCarbsEl = document.getElementById('totalCarbs');
            const totalFatEl = document.getElementById('totalFat');
            
            if (totalCaloriesEl) totalCaloriesEl.textContent = Math.round(currentNutrition.calories);
            if (totalProteinEl) totalProteinEl.textContent = Math.round(currentNutrition.protein) + 'g';
            if (totalCarbsEl) totalCarbsEl.textContent = Math.round(currentNutrition.carbs) + 'g';
            if (totalFatEl) totalFatEl.textContent = Math.round(currentNutrition.fat) + 'g';
            
            // Update progress bars
            const caloriesPercent = Math.min((currentNutrition.calories / nutritionGoals.calories) * 100, 100);
            const proteinPercent = Math.min((currentNutrition.protein / nutritionGoals.protein) * 100, 100);
            const carbsPercent = Math.min((currentNutrition.carbs / nutritionGoals.carbs) * 100, 100);
            const fatPercent = Math.min((currentNutrition.fat / nutritionGoals.fat) * 100, 100);
            
            const caloriesProgressEl = document.getElementById('caloriesProgress');
            const proteinProgressEl = document.getElementById('proteinProgress');
            const carbsProgressEl = document.getElementById('carbsProgress');
            const fatProgressEl = document.getElementById('fatProgress');
            
            if (caloriesProgressEl) caloriesProgressEl.style.width = caloriesPercent + '%';
            if (proteinProgressEl) proteinProgressEl.style.width = proteinPercent + '%';
            if (carbsProgressEl) carbsProgressEl.style.width = carbsPercent + '%';
            if (fatProgressEl) fatProgressEl.style.width = fatPercent + '%';
        }
        
        // Generate AI suggestions
        function generateAISuggestions() {
            const suggestions = [
                {
                    name: 'Greek Yogurt with Berries',
                    reason: 'High protein, low calories - perfect for your goals',
                    calories: 150,
                    protein: 15,
                    carbs: 20
                },
                {
                    name: 'Grilled Salmon',
                    reason: 'Excellent source of omega-3 and protein',
                    calories: 200,
                    protein: 25,
                    carbs: 0
                },
                {
                    name: 'Quinoa Bowl',
                    reason: 'Complete protein and fiber to keep you full',
                    calories: 180,
                    protein: 8,
                    carbs: 32
                },
                {
                    name: 'Almonds (1 oz)',
                    reason: 'Healthy fats and protein for sustained energy',
                    calories: 160,
                    protein: 6,
                    carbs: 6
                }
            ];
            
            const suggestionsGrid = document.getElementById('aiSuggestions');
            if (suggestionsGrid) {
                suggestionsGrid.innerHTML = suggestions.map(suggestion => `
                    <div class="suggestion-card">
                        <div class="suggestion-name">${suggestion.name}</div>
                        <div class="suggestion-reason">${suggestion.reason}</div>
                        <div class="suggestion-nutrition">
                            <span>${suggestion.calories} cal</span>
                            <span>${suggestion.protein}g protein</span>
                            <span>${suggestion.carbs}g carbs</span>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        // Clear search results
        function clearResults() {
            document.getElementById('searchResults').style.display = 'none';
            document.getElementById('foodSearch').value = '';
            document.getElementById('barcodeInput').value = '';
        }
        
        // Clear meal log
        function clearMealLog() {
            if (confirm('Are you sure you want to clear today\'s meal log?')) {
                mealLog = {
                    breakfast: [],
                    lunch: [],
                    snacks: [],
                    dinner: []
                };
                
                currentNutrition = {
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0
                };
                
                updateMealLogDisplay();
                updateNutritionSummary();
                saveMealLog();
                
                showToast('Meal log cleared', 'info');
            }
        }
        
        // Save meal log to localStorage
        function saveMealLog() {
            const today = new Date().toDateString();
            localStorage.setItem(`mealLog_${today}`, JSON.stringify(mealLog));
            localStorage.setItem(`nutrition_${today}`, JSON.stringify(currentNutrition));
        }
        
        // Load meal log from localStorage
        function loadMealLog() {
            const today = new Date().toDateString();
            const savedLog = localStorage.getItem(`mealLog_${today}`);
            const savedNutrition = localStorage.getItem(`nutrition_${today}`);
            
            if (savedLog) {
                mealLog = JSON.parse(savedLog);
            }
            
            if (savedNutrition) {
                currentNutrition = JSON.parse(savedNutrition);
            }
        }
        
        // Show toast notification
        function showToast(message, type) {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            // Trigger animation
            setTimeout(() => toast.classList.add('show'), 100);
            
            // Remove after 3 seconds
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
        
        // Health Assessment Variables
        let healthQuestions = [];
        let currentQuestionIndex = 0;
        let healthAnswers = {};
        
        // Start health assessment
        async function startHealthAssessment() {
            try {
                // Load health questions from server
                const response = await fetch('/api/meal-planner/health-questions');
                const data = await response.json();
                
                if (data.success) {
                    healthQuestions = data.questions;
                    currentQuestionIndex = 0;
                    healthAnswers = {};
                    
                    // Show modal and first question
                    document.getElementById('healthAssessmentModal').style.display = 'flex';
                    document.getElementById('totalQuestions').textContent = healthQuestions.length;
                    
                    showQuestion(0);
                } else {
                    showToast('Failed to load health assessment', 'error');
                }
            } catch (error) {
                console.error('Error starting health assessment:', error);
                showToast('Error starting health assessment', 'error');
            }
        }
        
        // Show specific question
        function showQuestion(index) {
            if (index >= healthQuestions.length) {
                completeAssessment();
                return;
            }
            
            const question = healthQuestions[index];
            const container = document.getElementById('questionContainer');
            
            // Update progress
            const progress = ((index + 1) / healthQuestions.length) * 100;
            document.getElementById('assessmentProgress').style.width = progress + '%';
            document.getElementById('currentQuestion').textContent = index + 1;
            
            // Generate question HTML
            let questionHTML = `
                <div class="question">
                    <h3 class="question-title">${question.question}</h3>
            `;
            
            switch (question.type) {
                case 'number':
                    questionHTML += `
                        <input type="number" 
                               class="question-input" 
                               id="answer-${question.id}" 
                               min="${question.min || 0}" 
                               max="${question.max || 1000}"
                               value="${healthAnswers[question.id] || ''}"
                               placeholder="Enter ${question.question.toLowerCase()}">
                    `;
                    break;
                    
                case 'select':
                    if (Array.isArray(question.options) && question.options.length > 0 && typeof question.options[0] === 'object') {
                        // Options with labels
                        questionHTML += '<div class="question-options">';
                        question.options.forEach(option => {
                            const isSelected = healthAnswers[question.id] === option.value;
                            questionHTML += `
                                <div class="option-card ${isSelected ? 'selected' : ''}" 
                                     onclick="selectOption('${question.id}', '${option.value}')">
                                    <strong>${option.label}</strong>
                                </div>
                            `;
                        });
                        questionHTML += '</div>';
                    } else {
                        // Simple options
                        questionHTML += '<div class="question-options">';
                        question.options.forEach(option => {
                            const isSelected = healthAnswers[question.id] === option;
                            questionHTML += `
                                <div class="option-card ${isSelected ? 'selected' : ''}" 
                                     onclick="selectOption('${question.id}', '${option}')">
                                    ${option.charAt(0).toUpperCase() + option.slice(1).replace('_', ' ')}
                                </div>
                            `;
                        });
                        questionHTML += '</div>';
                    }
                    break;
                    
                case 'multiselect':
                    questionHTML += '<div class="multiselect-options">';
                    question.options.forEach(option => {
                        const isSelected = healthAnswers[question.id] && healthAnswers[question.id].includes(option);
                        questionHTML += `
                            <div class="multiselect-option ${isSelected ? 'selected' : ''}" 
                                 onclick="toggleMultiOption('${question.id}', '${option}')">
                                <input type="checkbox" ${isSelected ? 'checked' : ''} readonly>
                                <span>${option.charAt(0).toUpperCase() + option.slice(1).replace('_', ' ')}</span>
                            </div>
                        `;
                    });
                    questionHTML += '</div>';
                    break;
            }
            
            questionHTML += '</div>';
            container.innerHTML = questionHTML;
            
            // Update navigation buttons
            document.getElementById('prevBtn').disabled = index === 0;
            document.getElementById('nextBtn').textContent = index === healthQuestions.length - 1 ? 'Generate Plan' : 'Next';
        }
        
        // Select single option
        function selectOption(questionId, value) {
            healthAnswers[questionId] = value;
            
            // Update UI
            const options = document.querySelectorAll(`[onclick*="${questionId}"]`);
            options.forEach(option => option.classList.remove('selected'));
            event.target.classList.add('selected');
        }
        
        // Toggle multi-select option
        function toggleMultiOption(questionId, value) {
            if (!healthAnswers[questionId]) {
                healthAnswers[questionId] = [];
            }
            
            const index = healthAnswers[questionId].indexOf(value);
            if (index > -1) {
                healthAnswers[questionId].splice(index, 1);
                event.target.classList.remove('selected');
                event.target.querySelector('input').checked = false;
            } else {
                healthAnswers[questionId].push(value);
                event.target.classList.add('selected');
                event.target.querySelector('input').checked = true;
            }
        }
        
        // Navigate to next question
        function nextQuestion() {
            const currentQuestion = healthQuestions[currentQuestionIndex];
            
            // Validate current answer
            if (currentQuestion.required) {
                const answer = healthAnswers[currentQuestion.id];
                if (!answer || (Array.isArray(answer) && answer.length === 0)) {
                    showToast('Please answer this question before continuing', 'error');
                    return;
                }
            }
            
            // Save number input value
            if (currentQuestion.type === 'number') {
                const input = document.getElementById(`answer-${currentQuestion.id}`);
                if (input && input.value) {
                    healthAnswers[currentQuestion.id] = parseFloat(input.value);
                }
            }
            
            currentQuestionIndex++;
            showQuestion(currentQuestionIndex);
        }
        
        // Navigate to previous question
        function previousQuestion() {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                showQuestion(currentQuestionIndex);
            }
        }
        
        // Complete assessment and generate meal plan
        async function completeAssessment() {
            try {
                showToast('Generating your personalized meal plan...', 'info');
                
                // Send health data to server for meal plan generation
                const response = await fetch('/api/meal-planner/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        healthData: healthAnswers
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Close modal
                    closeHealthAssessment();
                    
                    // Hide welcome section
                    document.getElementById('welcomeSection').style.display = 'none';
                    
                    // Show meal plan section
                    document.getElementById('mealPlanSection').style.display = 'block';
                    
                    // Update nutrition targets
                    const targets = data.mealPlan.nutritionTargets;
                    nutritionGoals = {
                        calories: targets.targetCalories,
                        protein: targets.macros.protein,
                        carbs: targets.macros.carbs,
                        fat: targets.macros.fat
                    };
                    
                    // Update display
                    document.getElementById('targetCalories').textContent = targets.targetCalories;
                    document.getElementById('targetProtein').textContent = targets.macros.protein + 'g';
                    document.getElementById('targetCarbs').textContent = targets.macros.carbs + 'g';
                    document.getElementById('targetFat').textContent = targets.macros.fat + 'g';
                    
                    // Update progress bars
                    updateNutritionSummary();
                    
                    // Generate personalized suggestions
                    generatePersonalizedSuggestions(data.mealPlan);
                    
                    showToast('Your personalized meal plan is ready!', 'success');
                } else {
                    showToast('Failed to generate meal plan: ' + data.error, 'error');
                }
            } catch (error) {
                console.error('Error completing assessment:', error);
                showToast('Error generating meal plan', 'error');
            }
        }
        
        // Close health assessment modal
        function closeHealthAssessment() {
            document.getElementById('healthAssessmentModal').style.display = 'none';
        }
        
        // Generate personalized suggestions based on meal plan
        function generatePersonalizedSuggestions(mealPlan) {
            const suggestions = [];
            
            // Add suggestions based on health profile
            const healthProfile = mealPlan.healthProfile;
            
            if (healthProfile.fitnessGoal === 'lose_weight') {
                suggestions.push({
                    name: 'Grilled Chicken Salad',
                    reason: 'High protein, low calories - perfect for weight loss',
                    calories: 250,
                    protein: 30,
                    carbs: 10
                });
            }
            
            if (healthProfile.fitnessGoal === 'build_muscle') {
                suggestions.push({
                    name: 'Protein Smoothie Bowl',
                    reason: 'High protein content supports muscle building',
                    calories: 350,
                    protein: 35,
                    carbs: 25
                });
            }
            
            if (healthProfile.dietaryPreferences === 'vegetarian') {
                suggestions.push({
                    name: 'Quinoa Buddha Bowl',
                    reason: 'Complete plant-based protein and nutrients',
                    calories: 320,
                    protein: 18,
                    carbs: 45
                });
            }
            
            if (healthProfile.medicalConditions && healthProfile.medicalConditions.includes('diabetes_type2')) {
                suggestions.push({
                    name: 'Cauliflower Rice Bowl',
                    reason: 'Low carb option to help manage blood sugar',
                    calories: 200,
                    protein: 15,
                    carbs: 8
                });
            }
            
            // Add general healthy suggestions
            suggestions.push(
                {
                    name: 'Avocado Toast',
                    reason: 'Healthy fats and fiber for sustained energy',
                    calories: 280,
                    protein: 8,
                    carbs: 30
                },
                {
                    name: 'Greek Yogurt Parfait',
                    reason: 'Probiotics and protein for digestive health',
                    calories: 180,
                    protein: 20,
                    carbs: 15
                }
            );
            
            // Update suggestions display
            const suggestionsGrid = document.getElementById('aiSuggestions');
            if (suggestionsGrid) {
                suggestionsGrid.innerHTML = suggestions.map(suggestion => `
                    <div class="suggestion-card">
                        <div class="suggestion-name">${suggestion.name}</div>
                        <div class="suggestion-reason">${suggestion.reason}</div>
                        <div class="suggestion-nutrition">
                            <span>${suggestion.calories} cal</span>
                            <span>${suggestion.protein}g protein</span>
                            <span>${suggestion.carbs}g carbs</span>
                        </div>
                    </div>
                `).join('');
            }
        }