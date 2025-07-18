// FREE AI-POWERED MEAL GENERATOR (No External API Required)
class AIMealGeneratorService {
    constructor() {
        // Initialize meal databases and AI logic
        this.initializeMealDatabase();
        this.initializeNutritionRules();
        this.initializePersonalizationEngine();
    }

    initializeMealDatabase() {
        this.mealDatabase = {
            north: {
                breakfast: [
                    { 
                        name: 'Protein-Rich Aloo Paratha', 
                        calories: 320, 
                        protein: 12, 
                        carbs: 45, 
                        fat: 10, 
                        fiber: 4,
                        description: 'High-protein stuffed potato flatbread with Greek yogurt',
                        ingredients: ['Wheat flour (100g)', 'Potatoes (150g)', 'Greek yogurt (100g)', 'Paneer (50g)', 'Spices'],
                        cookingTime: 25,
                        difficulty: 'Medium',
                        healthBenefits: ['High protein', 'Complex carbs', 'Probiotics'],
                        tags: ['vegetarian', 'high-protein', 'filling']
                    },
                    { 
                        name: 'Quinoa Upma', 
                        calories: 280, 
                        protein: 10, 
                        carbs: 40, 
                        fat: 8, 
                        fiber: 6,
                        description: 'Protein-packed quinoa porridge with vegetables',
                        ingredients: ['Quinoa (80g)', 'Mixed vegetables (100g)', 'Nuts (20g)', 'Spices'],
                        cookingTime: 20,
                        difficulty: 'Easy',
                        healthBenefits: ['Complete protein', 'High fiber', 'Gluten-free'],
                        tags: ['vegan', 'gluten-free', 'high-protein']
                    },
                    { 
                        name: 'Moong Dal Chilla', 
                        calories: 250, 
                        protein: 14, 
                        carbs: 30, 
                        fat: 6, 
                        fiber: 8,
                        description: 'High-protein lentil pancake with vegetables',
                        ingredients: ['Moong dal (100g)', 'Vegetables (80g)', 'Spices', 'Oil (1 tsp)'],
                        cookingTime: 15,
                        difficulty: 'Easy',
                        healthBenefits: ['High protein', 'Low fat', 'High fiber'],
                        tags: ['vegetarian', 'high-protein', 'low-fat']
                    }
                ],
                lunch: [
                    { 
                        name: 'Quinoa Rajma Bowl', 
                        calories: 420, 
                        protein: 18, 
                        carbs: 55, 
                        fat: 12, 
                        fiber: 12,
                        description: 'Protein-rich kidney bean curry with quinoa',
                        ingredients: ['Quinoa (100g)', 'Rajma (150g)', 'Vegetables (100g)', 'Spices'],
                        cookingTime: 35,
                        difficulty: 'Medium',
                        healthBenefits: ['Complete protein', 'High fiber', 'Iron-rich'],
                        tags: ['vegetarian', 'high-protein', 'iron-rich']
                    },
                    { 
                        name: 'Chicken Tikka Salad Bowl', 
                        calories: 380, 
                        protein: 32, 
                        carbs: 25, 
                        fat: 15, 
                        fiber: 8,
                        description: 'Grilled chicken with mixed greens and quinoa',
                        ingredients: ['Chicken breast (150g)', 'Mixed greens (100g)', 'Quinoa (50g)', 'Yogurt dressing'],
                        cookingTime: 30,
                        difficulty: 'Medium',
                        healthBenefits: ['Lean protein', 'Low carb', 'Nutrient dense'],
                        tags: ['non-vegetarian', 'high-protein', 'low-carb']
                    }
                ],
                snacks: [
                    { 
                        name: 'Protein Hummus with Veggies', 
                        calories: 180, 
                        protein: 8, 
                        carbs: 20, 
                        fat: 8, 
                        fiber: 6,
                        description: 'High-protein chickpea hummus with fresh vegetables',
                        ingredients: ['Chickpeas (100g)', 'Tahini (15g)', 'Vegetables (100g)', 'Olive oil (1 tsp)'],
                        cookingTime: 10,
                        difficulty: 'Easy',
                        healthBenefits: ['Plant protein', 'Healthy fats', 'Fiber'],
                        tags: ['vegan', 'high-protein', 'healthy-fats']
                    }
                ],
                dinner: [
                    { 
                        name: 'Grilled Fish with Quinoa', 
                        calories: 450, 
                        protein: 35, 
                        carbs: 40, 
                        fat: 15, 
                        fiber: 5,
                        description: 'Omega-3 rich fish with protein-packed quinoa',
                        ingredients: ['Fish fillet (200g)', 'Quinoa (80g)', 'Vegetables (100g)', 'Herbs'],
                        cookingTime: 25,
                        difficulty: 'Medium',
                        healthBenefits: ['Omega-3', 'Complete protein', 'Low saturated fat'],
                        tags: ['non-vegetarian', 'omega-3', 'high-protein']
                    }
                ]
            },
            south: {
                breakfast: [
                    { 
                        name: 'Protein Idli with Sambar', 
                        calories: 250, 
                        protein: 12, 
                        carbs: 40, 
                        fat: 5, 
                        fiber: 8,
                        description: 'Quinoa-enhanced idli with protein-rich sambar',
                        ingredients: ['Rice (60g)', 'Urad dal (40g)', 'Quinoa (20g)', 'Toor dal (50g)', 'Vegetables'],
                        cookingTime: 30,
                        difficulty: 'Medium',
                        healthBenefits: ['Probiotics', 'Complete protein', 'Digestive health'],
                        tags: ['vegetarian', 'fermented', 'high-protein']
                    }
                ]
            },
            east: {
                breakfast: [
                    { 
                        name: 'Fish Curry with Brown Rice', 
                        calories: 380, 
                        protein: 25, 
                        carbs: 45, 
                        fat: 10, 
                        fiber: 6,
                        description: 'Bengali-style fish curry with fiber-rich brown rice',
                        ingredients: ['Fish (150g)', 'Brown rice (80g)', 'Vegetables (100g)', 'Mustard oil (1 tsp)'],
                        cookingTime: 35,
                        difficulty: 'Medium',
                        healthBenefits: ['Omega-3', 'Complex carbs', 'High protein'],
                        tags: ['non-vegetarian', 'omega-3', 'whole-grain']
                    }
                ]
            },
            west: {
                breakfast: [
                    { 
                        name: 'Protein Dhokla', 
                        calories: 200, 
                        protein: 10, 
                        carbs: 30, 
                        fat: 4, 
                        fiber: 6,
                        description: 'High-protein steamed gram flour cake with added quinoa',
                        ingredients: ['Gram flour (80g)', 'Quinoa flour (20g)', 'Yogurt (50g)', 'Spices'],
                        cookingTime: 25,
                        difficulty: 'Medium',
                        healthBenefits: ['Plant protein', 'Probiotics', 'Low fat'],
                        tags: ['vegetarian', 'high-protein', 'low-fat']
                    }
                ]
            }
        };
    }

    initializeNutritionRules() {
        this.nutritionRules = {
            weightLoss: {
                calorieMultiplier: 0.8,
                proteinMultiplier: 1.2,
                carbMultiplier: 0.7,
                fatMultiplier: 0.8
            },
            muscleGain: {
                calorieMultiplier: 1.2,
                proteinMultiplier: 1.5,
                carbMultiplier: 1.1,
                fatMultiplier: 1.0
            },
            maintenance: {
                calorieMultiplier: 1.0,
                proteinMultiplier: 1.0,
                carbMultiplier: 1.0,
                fatMultiplier: 1.0
            }
        };
    }

    initializePersonalizationEngine() {
        this.personalizationFactors = {
            age: {
                young: (meal) => ({ ...meal, calories: meal.calories * 1.1 }),
                middle: (meal) => meal,
                senior: (meal) => ({ ...meal, calories: meal.calories * 0.9, fiber: meal.fiber * 1.2 })
            },
            activityLevel: {
                low: (meal) => ({ ...meal, calories: meal.calories * 0.9 }),
                moderate: (meal) => meal,
                high: (meal) => ({ ...meal, calories: meal.calories * 1.2, protein: meal.protein * 1.1 })
            }
        };
    }

    async generatePersonalizedMealPlan(userProfile) {
        try {
            console.log('Generating AI meal plan for user profile:', userProfile);
            
            const {
                age = 25,
                weight = 70,
                height = 170,
                activityLevel = 'moderate',
                dietaryRestrictions = [],
                healthGoals = ['maintain_weight'],
                regionalPreference = 'north',
                allergies = [],
                currentCalorieGoal = 2000,
                currentProteinGoal = 120
            } = userProfile;

            // AI-powered meal selection algorithm
            const selectedMeals = this.intelligentMealSelection(userProfile);
            
            // Generate personalized meal plan
            const mealPlan = {
                breakfast: this.personalizeMeal(selectedMeals.breakfast, userProfile),
                lunch: this.personalizeMeal(selectedMeals.lunch, userProfile),
                snacks: this.personalizeMeal(selectedMeals.snacks, userProfile),
                dinner: this.personalizeMeal(selectedMeals.dinner, userProfile),
                
                // AI metadata
                aiMetadata: {
                    generatedAt: new Date(),
                    confidenceScore: this.calculateConfidenceScore(userProfile),
                    personalizationFactors: this.getPersonalizationFactors(userProfile),
                    adaptationSuggestions: this.getAdaptationSuggestions(userProfile),
                    nutritionalBalance: this.calculateNutritionalBalance(selectedMeals),
                    aiRecommendations: this.generateAIRecommendations(userProfile, selectedMeals)
                },
                
                // Nutritional summary
                dailyNutrition: this.calculateDailyNutrition(selectedMeals),
                
                // Shopping list
                shoppingList: this.generateShoppingList(selectedMeals),
                
                // Meal prep tips
                mealPrepTips: this.generateMealPrepTips(selectedMeals)
            };

            return mealPlan;

        } catch (error) {
            console.error('Error generating AI meal plan:', error);
            throw new Error('Failed to generate personalized meal plan');
        }
    }

    intelligentMealSelection(userProfile) {
        const { regionalPreference, dietaryRestrictions, allergies, healthGoals } = userProfile;
        
        // Get meals from preferred region
        const regionMeals = this.mealDatabase[regionalPreference] || this.mealDatabase.north;
        
        // AI filtering algorithm
        const filteredMeals = {
            breakfast: this.filterMealsByPreferences(regionMeals.breakfast, userProfile),
            lunch: this.filterMealsByPreferences(regionMeals.lunch, userProfile),
            snacks: this.filterMealsByPreferences(regionMeals.snacks, userProfile),
            dinner: this.filterMealsByPreferences(regionMeals.dinner, userProfile)
        };
        
        // Smart selection based on AI scoring
        return {
            breakfast: this.selectBestMeal(filteredMeals.breakfast, userProfile),
            lunch: this.selectBestMeal(filteredMeals.lunch, userProfile),
            snacks: this.selectBestMeal(filteredMeals.snacks, userProfile),
            dinner: this.selectBestMeal(filteredMeals.dinner, userProfile)
        };
    }

    filterMealsByPreferences(meals, userProfile) {
        if (!meals || meals.length === 0) return [];
        
        return meals.filter(meal => {
            // Filter by dietary restrictions
            if (userProfile.dietaryRestrictions && userProfile.dietaryRestrictions.includes('vegetarian') && 
                meal.tags && meal.tags.includes('non-vegetarian')) {
                return false;
            }
            
            if (userProfile.dietaryRestrictions && userProfile.dietaryRestrictions.includes('vegan') && 
                meal.tags && !meal.tags.includes('vegan')) {
                return false;
            }
            
            // Filter by allergies (simplified)
            if (userProfile.allergies && userProfile.allergies.length > 0 && meal.ingredients) {
                if (userProfile.allergies.some(allergy => 
                    meal.ingredients.some(ingredient => 
                        ingredient.toLowerCase().includes(allergy.toLowerCase())))) {
                    return false;
                }
            }
            
            return true;
        });
    }

    selectBestMeal(meals, userProfile) {
        if (!meals || meals.length === 0) {
            // Fallback to basic meal
            return {
                name: 'Basic Healthy Meal',
                calories: 300,
                protein: 15,
                carbs: 40,
                fat: 8,
                fiber: 5,
                description: 'Nutritionally balanced meal',
                ingredients: ['Whole grains', 'Protein source', 'Vegetables'],
                cookingTime: 20,
                difficulty: 'Easy',
                healthBenefits: ['Balanced nutrition'],
                tags: ['healthy']
            };
        }
        
        // AI scoring algorithm
        const scoredMeals = meals.map(meal => ({
            ...meal,
            aiScore: this.calculateMealScore(meal, userProfile)
        }));
        
        // Sort by AI score and return best match
        scoredMeals.sort((a, b) => b.aiScore - a.aiScore);
        return scoredMeals[0];
    }

    calculateMealScore(meal, userProfile) {
        let score = 0;
        
        // Health goal alignment
        if (userProfile.healthGoals.includes('weight_loss') && meal.calories < 350) score += 20;
        if (userProfile.healthGoals.includes('muscle_gain') && meal.protein > 15) score += 20;
        if (userProfile.healthGoals.includes('maintain_weight')) score += 10;
        
        // Activity level alignment
        if (userProfile.activityLevel === 'high' && meal.protein > 20) score += 15;
        if (userProfile.activityLevel === 'low' && meal.calories < 300) score += 15;
        
        // Nutritional quality
        if (meal.fiber > 5) score += 10;
        if (meal.protein > 12) score += 10;
        if (meal.tags.includes('high-protein')) score += 15;
        if (meal.tags.includes('healthy-fats')) score += 10;
        
        // Cooking convenience
        if (meal.difficulty === 'Easy') score += 5;
        if (meal.cookingTime < 20) score += 5;
        
        return score;
    }

    personalizeMeal(meal, userProfile) {
        let personalizedMeal = { ...meal };
        
        // Apply age-based modifications
        const ageGroup = userProfile.age < 30 ? 'young' : userProfile.age > 60 ? 'senior' : 'middle';
        if (this.personalizationFactors.age[ageGroup]) {
            personalizedMeal = this.personalizationFactors.age[ageGroup](personalizedMeal);
        }
        
        // Apply activity level modifications
        if (this.personalizationFactors.activityLevel[userProfile.activityLevel]) {
            personalizedMeal = this.personalizationFactors.activityLevel[userProfile.activityLevel](personalizedMeal);
        }
        
        // Apply health goal modifications
        const healthGoal = userProfile.healthGoals[0] || 'maintenance';
        const rules = this.nutritionRules[healthGoal] || this.nutritionRules.maintenance;
        
        personalizedMeal.calories = Math.round(personalizedMeal.calories * rules.calorieMultiplier);
        personalizedMeal.protein = Math.round(personalizedMeal.protein * rules.proteinMultiplier);
        personalizedMeal.carbs = Math.round(personalizedMeal.carbs * rules.carbMultiplier);
        personalizedMeal.fat = Math.round(personalizedMeal.fat * rules.fatMultiplier);
        
        // Add personalization notes
        personalizedMeal.personalizationNotes = this.generatePersonalizationNotes(userProfile, meal);
        
        return personalizedMeal;
    }

    generatePersonalizationNotes(userProfile, meal) {
        const notes = [];
        
        if (userProfile.healthGoals.includes('weight_loss')) {
            notes.push('Portion adjusted for weight loss goals');
        }
        
        if (userProfile.healthGoals.includes('muscle_gain')) {
            notes.push('Protein content optimized for muscle building');
        }
        
        if (userProfile.activityLevel === 'high') {
            notes.push('Calories increased for high activity level');
        }
        
        if (userProfile.age > 60) {
            notes.push('Fiber content enhanced for digestive health');
        }
        
        return notes;
    }

    async generateMealAlternatives(originalMeal, userProfile, reason = 'user_request') {
        try {
            const { regionalPreference } = userProfile;
            const regionMeals = this.mealDatabase[regionalPreference] || this.mealDatabase.north;
            
            // Find meal category
            let mealCategory = 'breakfast';
            for (const [category, meals] of Object.entries(regionMeals)) {
                if (meals.some(meal => meal.name === originalMeal.name)) {
                    mealCategory = category;
                    break;
                }
            }
            
            // Get alternatives from same category
            const alternatives = regionMeals[mealCategory]
                .filter(meal => meal.name !== originalMeal.name)
                .filter(meal => Math.abs(meal.calories - originalMeal.calories) <= 100)
                .slice(0, 3)
                .map(meal => this.personalizeMeal(meal, userProfile));
            
            return alternatives;

        } catch (error) {
            console.error('Error generating meal alternatives:', error);
            throw new Error('Failed to generate meal alternatives');
        }
    }

    async adaptMealForConstraints(meal, constraints) {
        try {
            let adaptedMeal = { ...meal };
            
            constraints.forEach(constraint => {
                switch (constraint.type) {
                    case 'low_sodium':
                        adaptedMeal.description += ' (Low sodium version)';
                        adaptedMeal.healthBenefits.push('Heart-healthy');
                        break;
                    case 'gluten_free':
                        adaptedMeal.ingredients = adaptedMeal.ingredients.map(ing => 
                            ing.includes('wheat') ? ing.replace('wheat', 'rice') : ing
                        );
                        adaptedMeal.tags.push('gluten-free');
                        break;
                    case 'dairy_free':
                        adaptedMeal.ingredients = adaptedMeal.ingredients.map(ing => 
                            ing.includes('yogurt') ? ing.replace('yogurt', 'coconut yogurt') : ing
                        );
                        adaptedMeal.tags.push('dairy-free');
                        break;
                }
            });
            
            return adaptedMeal;

        } catch (error) {
            console.error('Error adapting meal:', error);
            throw new Error('Failed to adapt meal for constraints');
        }
    }

    calculateConfidenceScore(userProfile) {
        let score = 0.5; // Base score
        
        // Increase confidence based on available data
        if (userProfile.age) score += 0.1;
        if (userProfile.weight && userProfile.height) score += 0.1;
        if (userProfile.activityLevel) score += 0.1;
        if (userProfile.healthGoals) score += 0.1;
        if (userProfile.dietaryRestrictions) score += 0.1;
        if (userProfile.allergies) score += 0.1;
        
        return Math.min(score, 1.0);
    }

    getPersonalizationFactors(userProfile) {
        const factors = [];
        
        if (userProfile.age < 25) factors.push('Young adult metabolism');
        if (userProfile.age > 50) factors.push('Mature adult nutrition needs');
        if (userProfile.activityLevel === 'high') factors.push('High activity calorie needs');
        if (userProfile.healthGoals && userProfile.healthGoals.includes('weight_loss')) factors.push('Weight loss optimization');
        if (userProfile.healthGoals && userProfile.healthGoals.includes('muscle_gain')) factors.push('Protein optimization');
        if (userProfile.medicalConditions && userProfile.medicalConditions.length > 0) factors.push('Medical condition considerations');
        
        return factors;
    }

    getAdaptationSuggestions(userProfile) {
        const suggestions = [];
        
        if (userProfile.cookingSkillLevel === 'beginner') {
            suggestions.push('Consider meal prep services for complex dishes');
        }
        
        if (userProfile.availableCookingTime < 30) {
            suggestions.push('Focus on quick-cooking methods and pre-prep ingredients');
        }
        
        if (userProfile.budgetRange === 'low') {
            suggestions.push('Emphasize seasonal vegetables and bulk proteins');
        }
        
        return suggestions;
    }

    async generateWeeklyMealPlan(userProfile) {
        try {
            const weeklyPlan = {};
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            
            for (const day of days) {
                // Vary the meal plan slightly for each day
                const dailyProfile = {
                    ...userProfile,
                    dayOfWeek: day,
                    varietyFactor: Math.random() * 0.3 + 0.7 // 70-100% similarity to base preferences
                };
                
                weeklyPlan[day] = await this.generatePersonalizedMealPlan(dailyProfile);
            }
            
            return {
                weeklyPlan,
                shoppingList: this.generateWeeklyShoppingList(weeklyPlan),
                mealPrepSchedule: this.generateMealPrepSchedule(weeklyPlan),
                nutritionalSummary: this.calculateWeeklyNutrition(weeklyPlan)
            };
            
        } catch (error) {
            console.error('Error generating weekly meal plan:', error);
            throw new Error('Failed to generate weekly meal plan');
        }
    }

    generateWeeklyShoppingList(weeklyPlan) {
        const ingredients = {};
        
        Object.values(weeklyPlan).forEach(dayPlan => {
            ['breakfast', 'lunch', 'snacks', 'dinner'].forEach(mealType => {
                if (dayPlan[mealType] && dayPlan[mealType].ingredients) {
                    dayPlan[mealType].ingredients.forEach(ingredient => {
                        if (ingredients[ingredient.name]) {
                            ingredients[ingredient.name].quantity += ingredient.quantity;
                        } else {
                            ingredients[ingredient.name] = { ...ingredient };
                        }
                    });
                }
            });
        });
        
        return Object.values(ingredients);
    }

    generateMealPrepSchedule(weeklyPlan) {
        // Generate optimal meal prep schedule based on ingredient prep times and shelf life
        const schedule = {
            Sunday: [],
            Wednesday: []
        };
        
        // Add logic for optimal meal prep timing
        return schedule;
    }

    calculateWeeklyNutrition(weeklyPlan) {
        const totals = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0
        };
        
        Object.values(weeklyPlan).forEach(dayPlan => {
            ['breakfast', 'lunch', 'snacks', 'dinner'].forEach(mealType => {
                if (dayPlan[mealType] && dayPlan[mealType].nutrition) {
                    const nutrition = dayPlan[mealType].nutrition;
                    totals.calories += nutrition.calories || 0;
                    totals.protein += nutrition.protein || 0;
                    totals.carbs += nutrition.carbs || 0;
                    totals.fat += nutrition.fat || 0;
                    totals.fiber += nutrition.fiber || 0;
                }
            });
        });
        
        return {
            weekly: totals,
            daily: {
                calories: totals.calories / 7,
                protein: totals.protein / 7,
                carbs: totals.carbs / 7,
                fat: totals.fat / 7,
                fiber: totals.fiber / 7
            }
        };
    }

    calculateNutritionalBalance(selectedMeals) {
        const totalCalories = Object.values(selectedMeals).reduce((sum, meal) => sum + meal.calories, 0);
        const totalProtein = Object.values(selectedMeals).reduce((sum, meal) => sum + meal.protein, 0);
        const totalCarbs = Object.values(selectedMeals).reduce((sum, meal) => sum + meal.carbs, 0);
        const totalFat = Object.values(selectedMeals).reduce((sum, meal) => sum + meal.fat, 0);
        
        return {
            calories: totalCalories,
            protein: totalProtein,
            carbs: totalCarbs,
            fat: totalFat,
            proteinPercentage: Math.round((totalProtein * 4 / totalCalories) * 100),
            carbPercentage: Math.round((totalCarbs * 4 / totalCalories) * 100),
            fatPercentage: Math.round((totalFat * 9 / totalCalories) * 100)
        };
    }

    generateAIRecommendations(userProfile, selectedMeals) {
        const recommendations = [];
        
        const nutritionalBalance = this.calculateNutritionalBalance(selectedMeals);
        
        // Protein recommendations
        if (nutritionalBalance.proteinPercentage < 15) {
            recommendations.push({
                type: 'nutrition',
                priority: 'high',
                message: 'Consider adding more protein sources to meet your fitness goals',
                suggestion: 'Add Greek yogurt, nuts, or protein powder to your meals'
            });
        }
        
        // Fiber recommendations
        const totalFiber = Object.values(selectedMeals).reduce((sum, meal) => sum + meal.fiber, 0);
        if (totalFiber < 25) {
            recommendations.push({
                type: 'nutrition',
                priority: 'medium',
                message: 'Increase fiber intake for better digestive health',
                suggestion: 'Add more vegetables, fruits, and whole grains'
            });
        }
        
        // Activity level recommendations
        if (userProfile.activityLevel === 'high' && nutritionalBalance.calories < 2200) {
            recommendations.push({
                type: 'calories',
                priority: 'high',
                message: 'Your calorie intake may be too low for your activity level',
                suggestion: 'Consider adding healthy snacks or increasing portion sizes'
            });
        }
        
        // Health goal recommendations
        if (userProfile.healthGoals.includes('weight_loss') && nutritionalBalance.fatPercentage > 35) {
            recommendations.push({
                type: 'macros',
                priority: 'medium',
                message: 'Consider reducing fat intake for weight loss goals',
                suggestion: 'Choose leaner proteins and cooking methods'
            });
        }
        
        return recommendations;
    }

    calculateDailyNutrition(selectedMeals) {
        return {
            totalCalories: Object.values(selectedMeals).reduce((sum, meal) => sum + meal.calories, 0),
            totalProtein: Object.values(selectedMeals).reduce((sum, meal) => sum + meal.protein, 0),
            totalCarbs: Object.values(selectedMeals).reduce((sum, meal) => sum + meal.carbs, 0),
            totalFat: Object.values(selectedMeals).reduce((sum, meal) => sum + meal.fat, 0),
            totalFiber: Object.values(selectedMeals).reduce((sum, meal) => sum + meal.fiber, 0),
            mealBreakdown: {
                breakfast: { calories: selectedMeals.breakfast.calories, protein: selectedMeals.breakfast.protein },
                lunch: { calories: selectedMeals.lunch.calories, protein: selectedMeals.lunch.protein },
                snacks: { calories: selectedMeals.snacks.calories, protein: selectedMeals.snacks.protein },
                dinner: { calories: selectedMeals.dinner.calories, protein: selectedMeals.dinner.protein }
            }
        };
    }

    generateShoppingList(selectedMeals) {
        const allIngredients = [];
        
        Object.values(selectedMeals).forEach(meal => {
            if (meal.ingredients) {
                allIngredients.push(...meal.ingredients);
            }
        });
        
        // Group similar ingredients
        const groupedIngredients = {};
        allIngredients.forEach(ingredient => {
            const baseIngredient = ingredient.split('(')[0].trim();
            if (!groupedIngredients[baseIngredient]) {
                groupedIngredients[baseIngredient] = [];
            }
            groupedIngredients[baseIngredient].push(ingredient);
        });
        
        return Object.keys(groupedIngredients).map(ingredient => ({
            name: ingredient,
            category: this.categorizeIngredient(ingredient),
            items: groupedIngredients[ingredient]
        }));
    }

    categorizeIngredient(ingredient) {
        const categories = {
            'Vegetables': ['vegetables', 'onions', 'tomatoes', 'potatoes', 'greens'],
            'Proteins': ['chicken', 'fish', 'paneer', 'dal', 'chickpeas', 'rajma'],
            'Grains': ['rice', 'wheat', 'quinoa', 'flour'],
            'Dairy': ['yogurt', 'milk', 'cheese'],
            'Spices': ['spices', 'herbs', 'oil'],
            'Nuts & Seeds': ['nuts', 'seeds', 'tahini']
        };
        
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => ingredient.toLowerCase().includes(keyword))) {
                return category;
            }
        }
        
        return 'Other';
    }

    generateMealPrepTips(selectedMeals) {
        const tips = [];
        
        // Check for common ingredients
        const allIngredients = Object.values(selectedMeals)
            .flatMap(meal => meal.ingredients || []);
        
        if (allIngredients.some(ing => ing.includes('quinoa'))) {
            tips.push({
                title: 'Quinoa Prep',
                tip: 'Cook quinoa in bulk and store in refrigerator for up to 5 days',
                timesSaved: '15 minutes per meal'
            });
        }
        
        if (allIngredients.some(ing => ing.includes('vegetables'))) {
            tips.push({
                title: 'Vegetable Prep',
                tip: 'Wash and chop vegetables on Sunday for the entire week',
                timesSaved: '10 minutes per meal'
            });
        }
        
        // Check for similar cooking methods
        const cookingMethods = Object.values(selectedMeals)
            .map(meal => meal.difficulty);
        
        if (cookingMethods.includes('Medium')) {
            tips.push({
                title: 'Batch Cooking',
                tip: 'Prepare base curries and sauces in advance, add proteins fresh',
                timesSaved: '20 minutes per meal'
            });
        }
        
        return tips;
    }
}

module.exports = new AIMealGeneratorService();