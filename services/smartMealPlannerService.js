const UserService = require('./userService');

class SmartMealPlannerService {
    constructor() {
        this.healthQuestions = [
            {
                id: 'age',
                question: 'What is your age?',
                type: 'number',
                required: true,
                min: 13,
                max: 100,
                category: 'basic'
            },
            {
                id: 'gender',
                question: 'What is your gender?',
                type: 'select',
                options: ['male', 'female', 'other'],
                required: true,
                category: 'basic'
            },
            {
                id: 'height',
                question: 'What is your height (in cm)?',
                type: 'number',
                required: true,
                min: 100,
                max: 250,
                category: 'basic'
            },
            {
                id: 'weight',
                question: 'What is your current weight (in kg)?',
                type: 'number',
                required: true,
                min: 30,
                max: 300,
                category: 'basic'
            },
            {
                id: 'targetWeight',
                question: 'What is your target weight (in kg)?',
                type: 'number',
                required: false,
                min: 30,
                max: 300,
                category: 'goals'
            },
            {
                id: 'activityLevel',
                question: 'How would you describe your activity level?',
                type: 'select',
                options: [
                    { value: 'sedentary', label: 'Sedentary (little to no exercise)' },
                    { value: 'light', label: 'Light (light exercise 1-3 days/week)' },
                    { value: 'moderate', label: 'Moderate (moderate exercise 3-5 days/week)' },
                    { value: 'active', label: 'Active (hard exercise 6-7 days/week)' },
                    { value: 'very_active', label: 'Very Active (very hard exercise, physical job)' }
                ],
                required: true,
                category: 'lifestyle'
            },
            {
                id: 'fitnessGoal',
                question: 'What is your primary fitness goal?',
                type: 'select',
                options: [
                    { value: 'lose_weight', label: 'Lose Weight' },
                    { value: 'gain_weight', label: 'Gain Weight' },
                    { value: 'maintain_weight', label: 'Maintain Weight' },
                    { value: 'build_muscle', label: 'Build Muscle' },
                    { value: 'improve_health', label: 'Improve Overall Health' }
                ],
                required: true,
                category: 'goals'
            },
            {
                id: 'medicalConditions',
                question: 'Do you have any medical conditions?',
                type: 'multiselect',
                options: [
                    'diabetes_type1',
                    'diabetes_type2',
                    'hypertension',
                    'heart_disease',
                    'kidney_disease',
                    'liver_disease',
                    'thyroid_issues',
                    'pcos',
                    'celiac_disease',
                    'ibs',
                    'food_allergies',
                    'none'
                ],
                required: true,
                category: 'medical'
            },
            {
                id: 'allergies',
                question: 'Do you have any food allergies or intolerances?',
                type: 'multiselect',
                options: [
                    'nuts',
                    'dairy',
                    'gluten',
                    'eggs',
                    'soy',
                    'shellfish',
                    'fish',
                    'sesame',
                    'none'
                ],
                required: true,
                category: 'dietary'
            },
            {
                id: 'dietaryPreferences',
                question: 'What are your dietary preferences?',
                type: 'select',
                options: [
                    { value: 'omnivore', label: 'Omnivore (eat everything)' },
                    { value: 'vegetarian', label: 'Vegetarian' },
                    { value: 'vegan', label: 'Vegan' },
                    { value: 'pescatarian', label: 'Pescatarian' },
                    { value: 'keto', label: 'Ketogenic' },
                    { value: 'paleo', label: 'Paleo' },
                    { value: 'mediterranean', label: 'Mediterranean' }
                ],
                required: true,
                category: 'dietary'
            },
            {
                id: 'mealsPerDay',
                question: 'How many meals do you prefer per day?',
                type: 'select',
                options: [
                    { value: 3, label: '3 meals (Breakfast, Lunch, Dinner)' },
                    { value: 4, label: '4 meals (3 meals + 1 snack)' },
                    { value: 5, label: '5 meals (3 meals + 2 snacks)' },
                    { value: 6, label: '6 small meals' }
                ],
                required: true,
                category: 'preferences'
            },
            {
                id: 'cookingTime',
                question: 'How much time can you spend cooking per day?',
                type: 'select',
                options: [
                    { value: 'minimal', label: 'Minimal (15-30 minutes)' },
                    { value: 'moderate', label: 'Moderate (30-60 minutes)' },
                    { value: 'extensive', label: 'Extensive (1+ hours)' }
                ],
                required: true,
                category: 'preferences'
            },
            {
                id: 'budget',
                question: 'What is your daily food budget (in INR)?',
                type: 'select',
                options: [
                    { value: 'low', label: 'Budget-friendly (₹100-200)' },
                    { value: 'medium', label: 'Moderate (₹200-400)' },
                    { value: 'high', label: 'Premium (₹400+)' }
                ],
                required: true,
                category: 'preferences'
            },
            {
                id: 'waterIntake',
                question: 'How many glasses of water do you currently drink per day?',
                type: 'number',
                required: true,
                min: 0,
                max: 20,
                category: 'lifestyle'
            },
            {
                id: 'sleepHours',
                question: 'How many hours do you sleep per night?',
                type: 'number',
                required: true,
                min: 4,
                max: 12,
                category: 'lifestyle'
            },
            {
                id: 'stressLevel',
                question: 'How would you rate your stress level?',
                type: 'select',
                options: [
                    { value: 'low', label: 'Low stress' },
                    { value: 'moderate', label: 'Moderate stress' },
                    { value: 'high', label: 'High stress' }
                ],
                required: true,
                category: 'lifestyle'
            },
            {
                id: 'supplements',
                question: 'Are you currently taking any supplements?',
                type: 'multiselect',
                options: [
                    'multivitamin',
                    'protein_powder',
                    'omega3',
                    'vitamin_d',
                    'vitamin_b12',
                    'iron',
                    'calcium',
                    'probiotics',
                    'none'
                ],
                required: false,
                category: 'medical'
            }
        ];

        this.nutritionDatabase = this.initializeNutritionDatabase();
        this.mealTemplates = this.initializeMealTemplates();
    }

    // Get health assessment questions
    getHealthQuestions() {
        return this.healthQuestions;
    }

    // Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
    calculateBMR(userData) {
        const { age, gender, height, weight } = userData;
        
        let bmr;
        if (gender === 'male') {
            bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
            bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        }
        
        return Math.round(bmr);
    }

    // Calculate TDEE (Total Daily Energy Expenditure)
    calculateTDEE(bmr, activityLevel) {
        const activityMultipliers = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            very_active: 1.9
        };
        
        return Math.round(bmr * activityMultipliers[activityLevel]);
    }

    // Calculate target calories based on fitness goal
    calculateTargetCalories(tdee, fitnessGoal, currentWeight, targetWeight) {
        let targetCalories = tdee;
        
        switch (fitnessGoal) {
            case 'lose_weight':
                // Create 500-750 calorie deficit for 0.5-0.75 kg loss per week
                const weightDiff = currentWeight - (targetWeight || currentWeight - 10);
                const deficitRate = weightDiff > 20 ? 750 : 500;
                targetCalories = tdee - deficitRate;
                break;
            case 'gain_weight':
                // Create 300-500 calorie surplus
                targetCalories = tdee + 400;
                break;
            case 'build_muscle':
                // Slight surplus for muscle building
                targetCalories = tdee + 200;
                break;
            case 'maintain_weight':
            case 'improve_health':
            default:
                targetCalories = tdee;
                break;
        }
        
        // Ensure minimum calories for safety
        return Math.max(targetCalories, 1200);
    }

    // Calculate macronutrient distribution
    calculateMacros(targetCalories, fitnessGoal, medicalConditions) {
        let proteinPercent, carbPercent, fatPercent;
        
        // Adjust macros based on fitness goal
        switch (fitnessGoal) {
            case 'build_muscle':
                proteinPercent = 0.30;
                carbPercent = 0.40;
                fatPercent = 0.30;
                break;
            case 'lose_weight':
                proteinPercent = 0.35;
                carbPercent = 0.35;
                fatPercent = 0.30;
                break;
            case 'gain_weight':
                proteinPercent = 0.25;
                carbPercent = 0.45;
                fatPercent = 0.30;
                break;
            default:
                proteinPercent = 0.25;
                carbPercent = 0.45;
                fatPercent = 0.30;
                break;
        }

        // Adjust for medical conditions
        if (medicalConditions.includes('diabetes_type1') || medicalConditions.includes('diabetes_type2')) {
            carbPercent = 0.35;
            proteinPercent = 0.30;
            fatPercent = 0.35;
        }

        if (medicalConditions.includes('kidney_disease')) {
            proteinPercent = 0.15;
            carbPercent = 0.55;
            fatPercent = 0.30;
        }

        return {
            protein: Math.round((targetCalories * proteinPercent) / 4), // 4 calories per gram
            carbs: Math.round((targetCalories * carbPercent) / 4),
            fat: Math.round((targetCalories * fatPercent) / 9), // 9 calories per gram
            calories: targetCalories
        };
    }

    // Generate personalized meal plan
    async generateMealPlan(userId, healthData) {
        try {
            // Calculate nutritional requirements
            const bmr = this.calculateBMR(healthData);
            const tdee = this.calculateTDEE(bmr, healthData.activityLevel);
            const targetCalories = this.calculateTargetCalories(
                tdee, 
                healthData.fitnessGoal, 
                healthData.weight, 
                healthData.targetWeight
            );
            const macros = this.calculateMacros(
                targetCalories, 
                healthData.fitnessGoal, 
                healthData.medicalConditions
            );

            // Generate meal plan for 7 days
            const mealPlan = {
                userId,
                generatedAt: new Date(),
                nutritionTargets: {
                    bmr,
                    tdee,
                    targetCalories,
                    macros
                },
                healthProfile: healthData,
                weeklyPlan: {}
            };

            // Generate meals for each day
            for (let day = 0; day < 7; day++) {
                const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][day];
                mealPlan.weeklyPlan[dayName] = this.generateDayMeals(healthData, macros, targetCalories);
            }

            // Generate shopping list
            mealPlan.shoppingList = this.generateShoppingList(mealPlan.weeklyPlan);

            // Generate health tips
            mealPlan.healthTips = this.generateHealthTips(healthData, macros);

            // Save meal plan to database
            await this.saveMealPlan(userId, mealPlan);

            return {
                success: true,
                mealPlan
            };

        } catch (error) {
            console.error('Error generating meal plan:', error);
            return {
                success: false,
                error: 'Failed to generate meal plan'
            };
        }
    }

    // Generate meals for a single day
    generateDayMeals(healthData, macros, targetCalories) {
        const { mealsPerDay, dietaryPreferences, allergies, cookingTime, budget } = healthData;
        
        // Distribute calories across meals
        const calorieDistribution = this.getCalorieDistribution(mealsPerDay, targetCalories);
        
        const dayMeals = {};
        
        calorieDistribution.forEach(meal => {
            const mealOptions = this.selectMealOptions(
                meal.type,
                meal.calories,
                dietaryPreferences,
                allergies,
                cookingTime,
                budget,
                macros
            );
            
            dayMeals[meal.type] = {
                targetCalories: meal.calories,
                options: mealOptions,
                selectedMeal: mealOptions[0] // Default to first option
            };
        });

        return dayMeals;
    }

    // Get calorie distribution across meals
    getCalorieDistribution(mealsPerDay, targetCalories) {
        const distributions = {
            3: [
                { type: 'breakfast', calories: Math.round(targetCalories * 0.25) },
                { type: 'lunch', calories: Math.round(targetCalories * 0.40) },
                { type: 'dinner', calories: Math.round(targetCalories * 0.35) }
            ],
            4: [
                { type: 'breakfast', calories: Math.round(targetCalories * 0.25) },
                { type: 'lunch', calories: Math.round(targetCalories * 0.35) },
                { type: 'snack', calories: Math.round(targetCalories * 0.15) },
                { type: 'dinner', calories: Math.round(targetCalories * 0.25) }
            ],
            5: [
                { type: 'breakfast', calories: Math.round(targetCalories * 0.20) },
                { type: 'morning_snack', calories: Math.round(targetCalories * 0.10) },
                { type: 'lunch', calories: Math.round(targetCalories * 0.30) },
                { type: 'evening_snack', calories: Math.round(targetCalories * 0.15) },
                { type: 'dinner', calories: Math.round(targetCalories * 0.25) }
            ],
            6: [
                { type: 'breakfast', calories: Math.round(targetCalories * 0.20) },
                { type: 'morning_snack', calories: Math.round(targetCalories * 0.10) },
                { type: 'lunch', calories: Math.round(targetCalories * 0.25) },
                { type: 'afternoon_snack', calories: Math.round(targetCalories * 0.10) },
                { type: 'dinner', calories: Math.round(targetCalories * 0.25) },
                { type: 'evening_snack', calories: Math.round(targetCalories * 0.10) }
            ]
        };

        return distributions[mealsPerDay] || distributions[3];
    }

    // Select meal options based on criteria
    selectMealOptions(mealType, targetCalories, dietaryPreferences, allergies, cookingTime, budget, macros) {
        const availableMeals = this.mealTemplates[mealType] || [];
        
        // Filter meals based on dietary preferences and allergies
        let filteredMeals = availableMeals.filter(meal => {
            // Check dietary preferences
            if (!this.matchesDietaryPreference(meal, dietaryPreferences)) return false;
            
            // Check allergies
            if (this.containsAllergens(meal, allergies)) return false;
            
            // Check cooking time
            if (!this.matchesCookingTime(meal, cookingTime)) return false;
            
            // Check budget
            if (!this.matchesBudget(meal, budget)) return false;
            
            return true;
        });

        // If no meals match, use fallback meals
        if (filteredMeals.length === 0) {
            filteredMeals = this.getFallbackMeals(mealType, dietaryPreferences);
        }

        // Sort by nutritional match and return top 3 options
        return filteredMeals
            .map(meal => this.adjustMealPortion(meal, targetCalories))
            .sort((a, b) => this.calculateNutritionalScore(b, macros) - this.calculateNutritionalScore(a, macros))
            .slice(0, 3);
    }

    // Check if meal matches dietary preference
    matchesDietaryPreference(meal, preference) {
        const mealTags = meal.tags || [];
        
        switch (preference) {
            case 'vegetarian':
                return mealTags.includes('vegetarian') || mealTags.includes('vegan');
            case 'vegan':
                return mealTags.includes('vegan');
            case 'pescatarian':
                return mealTags.includes('vegetarian') || mealTags.includes('fish');
            case 'keto':
                return mealTags.includes('keto') || mealTags.includes('low_carb');
            case 'paleo':
                return mealTags.includes('paleo');
            case 'mediterranean':
                return mealTags.includes('mediterranean');
            default:
                return true;
        }
    }

    // Check if meal contains allergens
    containsAllergens(meal, allergies) {
        if (allergies.includes('none')) return false;
        
        const mealAllergens = meal.allergens || [];
        return allergies.some(allergy => mealAllergens.includes(allergy));
    }

    // Check if meal matches cooking time preference
    matchesCookingTime(meal, cookingTime) {
        const mealTime = meal.cookingTime || 30;
        
        switch (cookingTime) {
            case 'minimal':
                return mealTime <= 30;
            case 'moderate':
                return mealTime <= 60;
            case 'extensive':
                return true;
            default:
                return true;
        }
    }

    // Check if meal matches budget
    matchesBudget(meal, budget) {
        const mealCost = meal.estimatedCost || 200;
        
        switch (budget) {
            case 'low':
                return mealCost <= 200;
            case 'medium':
                return mealCost <= 400;
            case 'high':
                return true;
            default:
                return true;
        }
    }

    // Adjust meal portion to match target calories
    adjustMealPortion(meal, targetCalories) {
        const ratio = targetCalories / meal.calories;
        
        return {
            ...meal,
            portion: ratio,
            calories: Math.round(meal.calories * ratio),
            protein: Math.round(meal.protein * ratio * 10) / 10,
            carbs: Math.round(meal.carbs * ratio * 10) / 10,
            fat: Math.round(meal.fat * ratio * 10) / 10,
            ingredients: (meal.ingredients || []).map(ing => ({
                ...ing,
                amount: Math.round(ing.amount * ratio * 10) / 10
            }))
        };
    }

    // Calculate nutritional score for meal selection
    calculateNutritionalScore(meal, targetMacros) {
        const proteinScore = Math.abs(meal.protein - (targetMacros.protein / 4)) / (targetMacros.protein / 4);
        const carbScore = Math.abs(meal.carbs - (targetMacros.carbs / 4)) / (targetMacros.carbs / 4);
        const fatScore = Math.abs(meal.fat - (targetMacros.fat / 4)) / (targetMacros.fat / 4);
        
        return 1 - (proteinScore + carbScore + fatScore) / 3;
    }

    // Generate shopping list from weekly meal plan
    generateShoppingList(weeklyPlan) {
        const ingredients = {};
        
        Object.values(weeklyPlan).forEach(dayMeals => {
            Object.values(dayMeals).forEach(meal => {
                if (meal.selectedMeal && meal.selectedMeal.ingredients) {
                    meal.selectedMeal.ingredients.forEach(ingredient => {
                        if (ingredients[ingredient.name]) {
                            ingredients[ingredient.name].amount += ingredient.amount;
                        } else {
                            ingredients[ingredient.name] = {
                                name: ingredient.name,
                                amount: ingredient.amount,
                                unit: ingredient.unit,
                                category: ingredient.category || 'other'
                            };
                        }
                    });
                }
            });
        });

        // Group by category
        const categorizedList = {};
        Object.values(ingredients).forEach(ingredient => {
            const category = ingredient.category;
            if (!categorizedList[category]) {
                categorizedList[category] = [];
            }
            categorizedList[category].push(ingredient);
        });

        return categorizedList;
    }

    // Generate personalized health tips
    generateHealthTips(healthData, macros) {
        const tips = [];
        
        // Water intake tips
        const recommendedWater = Math.max(8, Math.round(healthData.weight * 0.035));
        if (healthData.waterIntake < recommendedWater) {
            tips.push({
                category: 'hydration',
                tip: `Increase your water intake to ${recommendedWater} glasses per day for optimal hydration.`,
                priority: 'high'
            });
        }

        // Sleep tips
        if (healthData.sleepHours < 7) {
            tips.push({
                category: 'sleep',
                tip: 'Aim for 7-9 hours of sleep per night to support your fitness goals and recovery.',
                priority: 'high'
            });
        }

        // Stress management
        if (healthData.stressLevel === 'high') {
            tips.push({
                category: 'stress',
                tip: 'Consider stress-reduction techniques like meditation or yoga to support your health goals.',
                priority: 'medium'
            });
        }

        // Medical condition specific tips
        if (healthData.medicalConditions.includes('diabetes_type2')) {
            tips.push({
                category: 'medical',
                tip: 'Focus on complex carbohydrates and monitor your blood sugar levels regularly.',
                priority: 'high'
            });
        }

        if (healthData.medicalConditions.includes('hypertension')) {
            tips.push({
                category: 'medical',
                tip: 'Limit sodium intake to less than 2300mg per day and include potassium-rich foods.',
                priority: 'high'
            });
        }

        // Supplement recommendations
        if (!healthData.supplements.includes('vitamin_d')) {
            tips.push({
                category: 'supplements',
                tip: 'Consider vitamin D supplementation, especially if you have limited sun exposure.',
                priority: 'medium'
            });
        }

        return tips;
    }

    // Save meal plan to database
    async saveMealPlan(userId, mealPlan) {
        try {
            const User = require('../models/User');
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            // Save to user's meal plans with required fields
            if (!user.mealPlans) user.mealPlans = [];
            
            // Deactivate previous meal plans
            user.mealPlans.forEach(plan => {
                plan.isActive = false;
            });
            
            user.mealPlans.push({
                id: new Date().getTime().toString(),
                name: 'AI Generated Meal Plan',
                mealType: 'complete',
                date: new Date(),
                isActive: true,
                nutritionTargets: mealPlan.nutritionTargets,
                healthProfile: mealPlan.healthProfile,
                weeklyPlan: mealPlan.weeklyPlan,
                shoppingList: mealPlan.shoppingList,
                healthTips: mealPlan.healthTips,
                createdAt: new Date()
            });

            await user.save();
            return true;
        } catch (error) {
            console.error('Error saving meal plan:', error);
            return false;
        }
    }

    // Get fallback meals for when no matches are found
    getFallbackMeals(mealType, dietaryPreference) {
        const fallbacks = {
            breakfast: [
                {
                    name: 'Oatmeal with Fruits',
                    calories: 300,
                    protein: 10,
                    carbs: 50,
                    fat: 8,
                    tags: ['vegetarian', 'vegan'],
                    allergens: [],
                    cookingTime: 10,
                    estimatedCost: 50
                }
            ],
            lunch: [
                {
                    name: 'Rice and Dal',
                    calories: 400,
                    protein: 15,
                    carbs: 60,
                    fat: 10,
                    tags: ['vegetarian', 'vegan'],
                    allergens: [],
                    cookingTime: 30,
                    estimatedCost: 80
                }
            ],
            dinner: [
                {
                    name: 'Vegetable Curry with Roti',
                    calories: 350,
                    protein: 12,
                    carbs: 45,
                    fat: 12,
                    tags: ['vegetarian'],
                    allergens: [],
                    cookingTime: 25,
                    estimatedCost: 100
                }
            ]
        };

        return fallbacks[mealType] || [];
    }

    // Initialize nutrition database
    initializeNutritionDatabase() {
        // This would typically be loaded from a database
        return {
            // Nutrition data for various foods
        };
    }

    // Initialize meal templates
    initializeMealTemplates() {
        return {
            breakfast: [
                {
                    name: 'Masala Oats with Vegetables',
                    calories: 280,
                    protein: 12,
                    carbs: 45,
                    fat: 8,
                    cookingTime: 15,
                    estimatedCost: 60,
                    tags: ['vegetarian', 'healthy', 'quick'],
                    allergens: [],
                    ingredients: [
                        { name: 'Oats', amount: 50, unit: 'g', category: 'grains' },
                        { name: 'Mixed Vegetables', amount: 100, unit: 'g', category: 'vegetables' },
                        { name: 'Spices', amount: 5, unit: 'g', category: 'spices' }
                    ],
                    instructions: [
                        'Heat oil in a pan',
                        'Add vegetables and spices',
                        'Add oats and water',
                        'Cook for 10 minutes'
                    ]
                },
                {
                    name: 'Poha with Peanuts',
                    calories: 320,
                    protein: 8,
                    carbs: 55,
                    fat: 10,
                    cookingTime: 20,
                    estimatedCost: 40,
                    tags: ['vegetarian', 'traditional'],
                    allergens: ['nuts'],
                    ingredients: [
                        { name: 'Poha', amount: 60, unit: 'g', category: 'grains' },
                        { name: 'Peanuts', amount: 20, unit: 'g', category: 'nuts' },
                        { name: 'Onions', amount: 30, unit: 'g', category: 'vegetables' }
                    ]
                },
                {
                    name: 'Scrambled Eggs with Toast',
                    calories: 350,
                    protein: 20,
                    carbs: 25,
                    fat: 18,
                    cookingTime: 10,
                    estimatedCost: 80,
                    tags: ['protein_rich', 'quick'],
                    allergens: ['eggs', 'gluten'],
                    ingredients: [
                        { name: 'Eggs', amount: 2, unit: 'pieces', category: 'protein' },
                        { name: 'Bread', amount: 2, unit: 'slices', category: 'grains' },
                        { name: 'Butter', amount: 10, unit: 'g', category: 'dairy' }
                    ]
                }
            ],
            lunch: [
                {
                    name: 'Dal Rice with Vegetables',
                    calories: 450,
                    protein: 18,
                    carbs: 70,
                    fat: 12,
                    cookingTime: 45,
                    estimatedCost: 100,
                    tags: ['vegetarian', 'traditional', 'complete_protein'],
                    allergens: [],
                    ingredients: [
                        { name: 'Rice', amount: 80, unit: 'g', category: 'grains' },
                        { name: 'Dal', amount: 40, unit: 'g', category: 'legumes' },
                        { name: 'Mixed Vegetables', amount: 150, unit: 'g', category: 'vegetables' }
                    ]
                },
                {
                    name: 'Chicken Curry with Roti',
                    calories: 520,
                    protein: 35,
                    carbs: 45,
                    fat: 22,
                    cookingTime: 60,
                    estimatedCost: 200,
                    tags: ['protein_rich', 'traditional'],
                    allergens: ['gluten'],
                    ingredients: [
                        { name: 'Chicken', amount: 150, unit: 'g', category: 'protein' },
                        { name: 'Roti', amount: 2, unit: 'pieces', category: 'grains' },
                        { name: 'Onions', amount: 50, unit: 'g', category: 'vegetables' }
                    ]
                },
                {
                    name: 'Quinoa Salad Bowl',
                    calories: 380,
                    protein: 15,
                    carbs: 50,
                    fat: 14,
                    cookingTime: 25,
                    estimatedCost: 150,
                    tags: ['healthy', 'gluten_free', 'complete_protein'],
                    allergens: [],
                    ingredients: [
                        { name: 'Quinoa', amount: 60, unit: 'g', category: 'grains' },
                        { name: 'Mixed Salad', amount: 200, unit: 'g', category: 'vegetables' },
                        { name: 'Olive Oil', amount: 15, unit: 'ml', category: 'fats' }
                    ]
                }
            ],
            dinner: [
                {
                    name: 'Grilled Fish with Vegetables',
                    calories: 400,
                    protein: 30,
                    carbs: 25,
                    fat: 20,
                    cookingTime: 30,
                    estimatedCost: 250,
                    tags: ['protein_rich', 'healthy', 'omega3'],
                    allergens: ['fish'],
                    ingredients: [
                        { name: 'Fish Fillet', amount: 150, unit: 'g', category: 'protein' },
                        { name: 'Steamed Vegetables', amount: 200, unit: 'g', category: 'vegetables' },
                        { name: 'Olive Oil', amount: 10, unit: 'ml', category: 'fats' }
                    ]
                },
                {
                    name: 'Paneer Tikka with Salad',
                    calories: 420,
                    protein: 25,
                    carbs: 20,
                    fat: 28,
                    cookingTime: 35,
                    estimatedCost: 180,
                    tags: ['vegetarian', 'protein_rich'],
                    allergens: ['dairy'],
                    ingredients: [
                        { name: 'Paneer', amount: 150, unit: 'g', category: 'protein' },
                        { name: 'Mixed Salad', amount: 150, unit: 'g', category: 'vegetables' },
                        { name: 'Yogurt', amount: 50, unit: 'g', category: 'dairy' }
                    ]
                }
            ],
            snack: [
                {
                    name: 'Mixed Nuts and Fruits',
                    calories: 200,
                    protein: 6,
                    carbs: 20,
                    fat: 12,
                    cookingTime: 0,
                    estimatedCost: 80,
                    tags: ['healthy', 'quick'],
                    allergens: ['nuts'],
                    ingredients: [
                        { name: 'Mixed Nuts', amount: 25, unit: 'g', category: 'nuts' },
                        { name: 'Seasonal Fruits', amount: 150, unit: 'g', category: 'fruits' }
                    ]
                },
                {
                    name: 'Greek Yogurt with Berries',
                    calories: 180,
                    protein: 15,
                    carbs: 20,
                    fat: 5,
                    cookingTime: 0,
                    estimatedCost: 120,
                    tags: ['protein_rich', 'probiotic'],
                    allergens: ['dairy'],
                    ingredients: [
                        { name: 'Greek Yogurt', amount: 150, unit: 'g', category: 'dairy' },
                        { name: 'Mixed Berries', amount: 100, unit: 'g', category: 'fruits' }
                    ]
                }
            ]
        };
    }
}

module.exports = new SmartMealPlannerService();