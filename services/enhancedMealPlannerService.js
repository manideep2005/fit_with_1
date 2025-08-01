const foodDatabaseService = require('./foodDatabaseService');
const aiService = require('./aiService');

class EnhancedMealPlannerService {
  constructor() {
    this.foodDatabase = foodDatabaseService;
    this.mealTemplates = this.createMealTemplates();
    this.nutritionCalculator = this.createNutritionCalculator();
    console.log('✅ Enhanced Meal Planner Service initialized');
  }

  // Create meal templates for different regions and meal types
  createMealTemplates() {
    return {
      north_indian: {
        breakfast: [
          {
            template: 'paratha_based',
            structure: ['stuffed_bread', 'yogurt', 'pickle', 'tea'],
            calories_distribution: [60, 20, 5, 15],
            cooking_time: 45,
            difficulty: 'intermediate'
          },
          {
            template: 'cereal_based',
            structure: ['poha_upma', 'nuts', 'tea', 'fruit'],
            calories_distribution: [70, 10, 10, 10],
            cooking_time: 20,
            difficulty: 'beginner'
          }
        ],
        lunch: [
          {
            template: 'dal_chawal',
            structure: ['dal', 'rice', 'vegetable', 'salad', 'pickle'],
            calories_distribution: [25, 35, 25, 10, 5],
            cooking_time: 60,
            difficulty: 'intermediate'
          },
          {
            template: 'roti_sabzi',
            structure: ['roti', 'dal', 'vegetable', 'salad'],
            calories_distribution: [40, 25, 25, 10],
            cooking_time: 75,
            difficulty: 'intermediate'
          }
        ],
        dinner: [
          {
            template: 'light_dinner',
            structure: ['roti', 'dal', 'vegetable', 'yogurt'],
            calories_distribution: [35, 25, 30, 10],
            cooking_time: 60,
            difficulty: 'intermediate'
          }
        ]
      },
      south_indian: {
        breakfast: [
          {
            template: 'fermented_breakfast',
            structure: ['idli_dosa', 'sambar', 'chutney', 'filter_coffee'],
            calories_distribution: [50, 30, 15, 5],
            cooking_time: 30,
            difficulty: 'intermediate'
          },
          {
            template: 'upma_breakfast',
            structure: ['upma', 'chutney', 'coffee'],
            calories_distribution: [75, 20, 5],
            cooking_time: 20,
            difficulty: 'beginner'
          }
        ],
        lunch: [
          {
            template: 'sambar_rice',
            structure: ['rice', 'sambar', 'rasam', 'vegetable', 'pickle'],
            calories_distribution: [35, 25, 15, 20, 5],
            cooking_time: 60,
            difficulty: 'intermediate'
          },
          {
            template: 'meals_style',
            structure: ['rice', 'sambar', 'rasam', 'kootu', 'poriyal', 'pickle'],
            calories_distribution: [30, 20, 10, 15, 20, 5],
            cooking_time: 90,
            difficulty: 'advanced'
          }
        ],
        dinner: [
          {
            template: 'curd_rice',
            structure: ['curd_rice', 'pickle', 'papad'],
            calories_distribution: [80, 15, 5],
            cooking_time: 15,
            difficulty: 'beginner'
          }
        ]
      },
      west_indian: {
        breakfast: [
          {
            template: 'gujarati_breakfast',
            structure: ['dhokla_thepla', 'chutney', 'tea'],
            calories_distribution: [75, 20, 5],
            cooking_time: 35,
            difficulty: 'intermediate'
          }
        ],
        lunch: [
          {
            template: 'gujarati_thali',
            structure: ['roti', 'dal', 'sabzi', 'rice', 'kadhi', 'pickle', 'sweet'],
            calories_distribution: [20, 15, 20, 15, 15, 5, 10],
            cooking_time: 120,
            difficulty: 'advanced'
          }
        ]
      },
      east_indian: {
        breakfast: [
          {
            template: 'bengali_breakfast',
            structure: ['luchi', 'aloo_dum', 'tea'],
            calories_distribution: [50, 45, 5],
            cooking_time: 45,
            difficulty: 'intermediate'
          }
        ],
        lunch: [
          {
            template: 'fish_rice',
            structure: ['rice', 'fish_curry', 'dal', 'vegetable', 'sweet'],
            calories_distribution: [30, 30, 15, 15, 10],
            cooking_time: 75,
            difficulty: 'intermediate'
          }
        ]
      },
      international: {
        breakfast: [
          {
            template: 'protein_bowl',
            structure: ['oats_quinoa', 'protein', 'fruits', 'nuts'],
            calories_distribution: [50, 25, 15, 10],
            cooking_time: 15,
            difficulty: 'beginner'
          }
        ],
        lunch: [
          {
            template: 'balanced_bowl',
            structure: ['grain', 'protein', 'vegetables', 'healthy_fat'],
            calories_distribution: [35, 30, 25, 10],
            cooking_time: 30,
            difficulty: 'beginner'
          }
        ],
        dinner: [
          {
            template: 'light_protein',
            structure: ['lean_protein', 'vegetables', 'salad'],
            calories_distribution: [50, 35, 15],
            cooking_time: 25,
            difficulty: 'beginner'
          }
        ]
      }
    };
  }

  // Create advanced nutrition calculator
  createNutritionCalculator() {
    return {
      // Calculate BMR using multiple formulas for accuracy
      calculateBMR: (age, gender, height, weight, formula = 'mifflin') => {
        switch (formula) {
          case 'mifflin':
            return gender === 'male' 
              ? 10 * weight + 6.25 * height - 5 * age + 5
              : 10 * weight + 6.25 * height - 5 * age - 161;
          case 'harris':
            return gender === 'male'
              ? 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
              : 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
          case 'katch':
            // Requires body fat percentage
            const leanMass = weight * (1 - (25 / 100)); // Assuming 25% body fat if not provided
            return 370 + (21.6 * leanMass);
          default:
            return this.calculateBMR(age, gender, height, weight, 'mifflin');
        }
      },

      // Calculate TDEE with activity and lifestyle factors
      calculateTDEE: (bmr, activityLevel, lifestyle, medicalConditions = []) => {
        const activityMultipliers = {
          'sedentary': 1.2,
          'lightly_active': 1.375,
          'moderately_active': 1.55,
          'very_active': 1.725,
          'extremely_active': 1.9
        };

        let tdee = bmr * (activityMultipliers[activityLevel] || 1.55);

        // Lifestyle adjustments
        if (lifestyle === 'student') tdee *= 1.05; // Higher stress, irregular eating
        if (lifestyle === 'work_from_home') tdee *= 0.95; // Less movement
        if (lifestyle === 'frequent_traveler') tdee *= 1.1; // Irregular schedule

        // Medical condition adjustments
        if (medicalConditions.includes('thyroid_hypothyroid')) tdee *= 0.9;
        if (medicalConditions.includes('thyroid_hyperthyroid')) tdee *= 1.1;
        if (medicalConditions.includes('pcos')) tdee *= 0.95;

        return Math.round(tdee);
      },

      // Calculate macronutrient distribution based on goals and health conditions
      calculateMacros: (calories, goals, medicalConditions, bodyComposition) => {
        let proteinRatio = 0.25;
        let carbRatio = 0.45;
        let fatRatio = 0.30;

        // Adjust for fitness goals
        if (goals.includes('gain_muscle')) {
          proteinRatio = 0.30;
          carbRatio = 0.40;
          fatRatio = 0.30;
        } else if (goals.includes('lose_weight')) {
          proteinRatio = 0.30;
          carbRatio = 0.35;
          fatRatio = 0.35;
        } else if (goals.includes('improve_endurance')) {
          proteinRatio = 0.20;
          carbRatio = 0.55;
          fatRatio = 0.25;
        }

        // Adjust for medical conditions
        if (medicalConditions.includes('diabetes_type1') || medicalConditions.includes('diabetes_type2')) {
          proteinRatio = 0.25;
          carbRatio = 0.35;
          fatRatio = 0.40;
        } else if (medicalConditions.includes('heart_disease')) {
          proteinRatio = 0.20;
          carbRatio = 0.55;
          fatRatio = 0.25;
        } else if (medicalConditions.includes('kidney_disease')) {
          proteinRatio = 0.15;
          carbRatio = 0.60;
          fatRatio = 0.25;
        }

        return {
          protein: Math.round((calories * proteinRatio) / 4),
          carbs: Math.round((calories * carbRatio) / 4),
          fat: Math.round((calories * fatRatio) / 9),
          fiber: Math.round(calories / 1000 * 14),
          water: Math.max(2000, calories * 1.2) // ml per day
        };
      },

      // Calculate micronutrient needs
      calculateMicronutrients: (age, gender, medicalConditions, lifestyle) => {
        const baseMicronutrients = {
          vitamin_d: gender === 'male' ? 15 : 15, // mcg
          vitamin_b12: 2.4, // mcg
          iron: gender === 'male' ? 8 : 18, // mg
          calcium: age > 50 ? 1200 : 1000, // mg
          magnesium: gender === 'male' ? 400 : 310, // mg
          zinc: gender === 'male' ? 11 : 8, // mg
          vitamin_c: 90, // mg
          folate: 400 // mcg
        };

        // Adjust for medical conditions
        if (medicalConditions.includes('osteoporosis')) {
          baseMicronutrients.calcium *= 1.2;
          baseMicronutrients.vitamin_d *= 1.5;
        }
        
        if (medicalConditions.includes('anemia')) {
          baseMicronutrients.iron *= 1.5;
          baseMicronutrients.vitamin_c *= 1.2;
        }

        if (lifestyle === 'athlete') {
          baseMicronutrients.iron *= 1.3;
          baseMicronutrients.magnesium *= 1.2;
          baseMicronutrients.zinc *= 1.2;
        }

        return baseMicronutrients;
      }
    };
  }

  // Generate comprehensive meal plan
  async generateComprehensiveMealPlan(healthAssessment, preferences = {}) {
    try {
      console.log('🍽️ Generating comprehensive meal plan...');
      
      const {
        age, gender, height, weight, target_weight,
        activity_level, fitness_goals, medical_conditions,
        region, dietary_restrictions, food_preferences,
        meal_timing, cooking_time, budget_range,
        kitchen_equipment, lifestyle, family_size
      } = healthAssessment;

      // Calculate nutrition targets
      const nutritionTargets = this.calculateAdvancedNutritionTargets(healthAssessment);
      
      // Get current season
      const currentSeason = this.getCurrentSeason();
      
      // Generate 7-day meal plan
      const mealPlan = {};
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
        const day = days[dayIndex];
        console.log(`📅 Generating meals for ${day}...`);
        
        mealPlan[day] = await this.generateDayMeals({
          dayIndex,
          nutritionTargets,
          region: region || 'mixed',
          dietaryRestrictions: dietary_restrictions || [],
          medicalConditions: medical_conditions || [],
          foodPreferences: food_preferences || [],
          season: currentSeason,
          cookingTime: cooking_time || 'moderate',
          budget: budget_range || 'moderate',
          kitchenEquipment: kitchen_equipment || [],
          mealTiming: meal_timing || 'regular',
          familySize: family_size || '1'
        });
      }

      // Generate shopping list
      const shoppingList = this.generateShoppingList(mealPlan);
      
      // Calculate weekly nutrition summary
      const weeklyNutrition = this.calculateWeeklyNutrition(mealPlan);
      
      // Generate meal prep suggestions
      const mealPrepSuggestions = this.generateMealPrepSuggestions(mealPlan, cooking_time);

      console.log('✅ Comprehensive meal plan generated successfully');
      
      return {
        mealPlan,
        nutritionTargets,
        shoppingList,
        weeklyNutrition,
        mealPrepSuggestions,
        metadata: {
          generatedAt: new Date(),
          region: region || 'mixed',
          totalDays: 7,
          averageCaloriesPerDay: nutritionTargets.calories,
          dietaryRestrictions: dietary_restrictions || [],
          medicalConditions: medical_conditions || []
        }
      };
      
    } catch (error) {
      console.error('❌ Error generating comprehensive meal plan:', error);
      throw new Error('Failed to generate meal plan: ' + error.message);
    }
  }

  // Calculate advanced nutrition targets
  calculateAdvancedNutritionTargets(assessment) {
    const {
      age = 25, gender = 'male', height = 170, weight = 70,
      target_weight, activity_level = 'moderately_active',
      fitness_goals = ['maintain_health'],
      medical_conditions = ['none'],
      lifestyle = 'working_professional'
    } = assessment;

    // Calculate BMR and TDEE
    const bmr = this.nutritionCalculator.calculateBMR(age, gender, height, weight);
    const tdee = this.nutritionCalculator.calculateTDEE(bmr, activity_level, lifestyle, medical_conditions);
    
    // Adjust calories based on goals
    let targetCalories = tdee;
    if (fitness_goals.includes('lose_weight')) {
      const weightDiff = weight - (target_weight || weight - 5);
      const weeklyDeficit = Math.min(weightDiff * 1100, 3500); // Max 1 lb per week
      targetCalories = tdee - (weeklyDeficit / 7);
    } else if (fitness_goals.includes('gain_muscle')) {
      targetCalories = tdee + 300; // Moderate surplus
    }

    // Ensure minimum calories
    targetCalories = Math.max(targetCalories, gender === 'male' ? 1500 : 1200);

    // Calculate macronutrients
    const macros = this.nutritionCalculator.calculateMacros(
      targetCalories, 
      fitness_goals, 
      medical_conditions,
      { weight, height }
    );

    // Calculate micronutrients
    const micronutrients = this.nutritionCalculator.calculateMicronutrients(
      age, gender, medical_conditions, lifestyle
    );

    return {
      calories: Math.round(targetCalories),
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      fiber: macros.fiber,
      water: macros.water,
      micronutrients,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      weeklyWeightChange: fitness_goals.includes('lose_weight') ? -0.5 : 
                         fitness_goals.includes('gain_muscle') ? 0.25 : 0
    };
  }

  // Generate meals for a single day
  async generateDayMeals(dayConfig) {
    const {
      dayIndex, nutritionTargets, region, dietaryRestrictions,
      medicalConditions, season, cookingTime, budget, mealTiming
    } = dayConfig;

    // Get meal distribution based on timing preference
    const mealDistribution = this.getMealDistribution(mealTiming, nutritionTargets.calories);
    
    const dayMeals = {};
    
    for (const [mealType, calorieTarget] of Object.entries(mealDistribution)) {
      console.log(`🍽️ Generating ${mealType} (${calorieTarget} calories)...`);
      
      const meal = await this.generateSingleMeal({
        mealType,
        calorieTarget,
        region,
        dietaryRestrictions,
        medicalConditions,
        season,
        cookingTime,
        budget,
        dayIndex,
        nutritionTargets
      });
      
      dayMeals[mealType] = meal;
    }
    
    return dayMeals;
  }

  // Generate a single meal
  async generateSingleMeal(mealConfig) {
    const {
      mealType, calorieTarget, region, dietaryRestrictions,
      medicalConditions, season, cookingTime, budget, dayIndex
    } = mealConfig;

    // Get meal template
    const templates = this.mealTemplates[region] || this.mealTemplates['international'];
    const mealTemplates = templates[mealType] || templates['lunch'];
    const template = mealTemplates[dayIndex % mealTemplates.length];

    // Generate meal suggestions based on criteria
    const mealSuggestions = this.foodDatabase.generateMealSuggestions({
      region,
      mealType,
      dietaryRestrictions,
      healthConditions: medicalConditions,
      season,
      calorieTarget,
      preparationTime: this.getMaxCookingTime(cookingTime),
      budget
    });

    // Select best meal suggestion
    const selectedMeal = this.selectBestMeal(mealSuggestions, template, calorieTarget);
    
    // Enhance with cooking instructions and tips
    const enhancedMeal = await this.enhanceMealWithInstructions(selectedMeal, region, mealType);
    
    return enhancedMeal;
  }

  // Select the best meal from suggestions
  selectBestMeal(suggestions, template, calorieTarget) {
    if (!suggestions || suggestions.length === 0) {
      return this.createFallbackMeal(template, calorieTarget);
    }

    // Score meals based on various factors
    const scoredMeals = suggestions.map(meal => ({
      ...meal,
      score: this.calculateMealScore(meal, template, calorieTarget)
    }));

    // Sort by score and return the best
    scoredMeals.sort((a, b) => b.score - a.score);
    return scoredMeals[0];
  }

  // Calculate meal score based on multiple factors
  calculateMealScore(meal, template, calorieTarget) {
    let score = 0;
    
    // Calorie accuracy (40% weight)
    const calorieAccuracy = 1 - Math.abs(meal.totalCalories - calorieTarget) / calorieTarget;
    score += calorieAccuracy * 40;
    
    // Nutritional balance (30% weight)
    const proteinRatio = meal.totalProtein / (meal.totalCalories / 4);
    const idealProteinRatio = 0.25;
    const proteinScore = 1 - Math.abs(proteinRatio - idealProteinRatio) / idealProteinRatio;
    score += proteinScore * 30;
    
    // Preparation time (15% weight)
    const timeScore = template.cooking_time >= meal.preparationTime ? 1 : 0.5;
    score += timeScore * 15;
    
    // Cost efficiency (10% weight)
    const costScore = meal.cost === 'budget' ? 1 : meal.cost === 'moderate' ? 0.7 : 0.4;
    score += costScore * 10;
    
    // Variety bonus (5% weight)
    const varietyScore = meal.ingredients.length >= 4 ? 1 : 0.5;
    score += varietyScore * 5;
    
    return score;
  }

  // Create fallback meal when no suggestions available
  createFallbackMeal(template, calorieTarget) {
    return {
      name: `Balanced ${template.template.replace('_', ' ')} Meal`,
      totalCalories: calorieTarget,
      totalProtein: Math.round(calorieTarget * 0.25 / 4),
      totalCarbs: Math.round(calorieTarget * 0.45 / 4),
      totalFat: Math.round(calorieTarget * 0.30 / 9),
      ingredients: [
        { name: 'Protein Source', category: 'protein' },
        { name: 'Whole Grain', category: 'carbs' },
        { name: 'Vegetables', category: 'vegetables' },
        { name: 'Healthy Fat', category: 'fats' }
      ],
      preparationTime: template.cooking_time,
      difficulty: template.difficulty,
      cost: 'moderate',
      instructions: ['Prepare ingredients', 'Cook according to preference', 'Serve hot'],
      tags: ['balanced', 'nutritious']
    };
  }

  // Enhance meal with detailed cooking instructions
  async enhanceMealWithInstructions(meal, region, mealType) {
    try {
      // Generate detailed cooking instructions using AI
      const prompt = `Generate detailed cooking instructions for "${meal.name}" - a ${region} ${mealType} dish with ingredients: ${meal.ingredients.map(i => i.name).join(', ')}. Include prep time, cooking steps, and serving suggestions.`;
      
      const aiInstructions = await aiService.getAIResponse(prompt, { region, mealType });
      
      return {
        ...meal,
        detailedInstructions: this.parseAIInstructions(aiInstructions),
        nutritionTips: this.generateNutritionTips(meal),
        variations: this.generateMealVariations(meal, region),
        storageInstructions: this.generateStorageInstructions(meal),
        servingSize: this.calculateServingSize(meal.totalCalories)
      };
    } catch (error) {
      console.error('Error enhancing meal with instructions:', error);
      return {
        ...meal,
        detailedInstructions: ['Prepare ingredients as needed', 'Cook according to traditional methods', 'Serve hot'],
        nutritionTips: ['Balanced meal with good nutrition'],
        variations: [],
        storageInstructions: 'Store leftovers in refrigerator for up to 2 days'
      };
    }
  }

  // Parse AI-generated instructions
  parseAIInstructions(aiResponse) {
    // Simple parsing - can be enhanced with more sophisticated NLP
    const lines = aiResponse.split('\n').filter(line => line.trim());
    return lines.slice(0, 8); // Take first 8 meaningful lines
  }

  // Generate nutrition tips for the meal
  generateNutritionTips(meal) {
    const tips = [];
    
    if (meal.totalProtein > 20) {
      tips.push('High protein content supports muscle building and satiety');
    }
    
    if (meal.ingredients.some(i => i.tags && i.tags.includes('high_fiber'))) {
      tips.push('Rich in fiber for digestive health');
    }
    
    if (meal.ingredients.some(i => i.tags && i.tags.includes('antioxidant'))) {
      tips.push('Contains antioxidants for immune support');
    }
    
    if (meal.totalCalories < 400) {
      tips.push('Light meal perfect for weight management');
    }
    
    return tips.length > 0 ? tips : ['Balanced meal with good nutritional value'];
  }

  // Generate meal variations
  generateMealVariations(meal, region) {
    const variations = [];
    
    // Protein variations
    const proteinIngredients = meal.ingredients.filter(i => 
      ['legumes', 'meat', 'fish', 'eggs', 'dairy'].includes(i.category)
    );
    
    if (proteinIngredients.length > 0) {
      variations.push(`Substitute ${proteinIngredients[0].name} with tofu for vegan option`);
    }
    
    // Regional variations
    if (region !== 'international') {
      variations.push('Add international spices for fusion flavor');
    }
    
    // Cooking method variations
    variations.push('Try grilling instead of pan-frying for lower fat content');
    
    return variations;
  }

  // Generate storage instructions
  generateStorageInstructions(meal) {
    const hasPerishables = meal.ingredients.some(i => 
      ['dairy', 'meat', 'fish'].includes(i.category)
    );
    
    if (hasPerishables) {
      return 'Store in refrigerator for up to 2 days. Reheat thoroughly before serving.';
    } else {
      return 'Can be stored at room temperature for 4-6 hours, refrigerate for longer storage.';
    }
  }

  // Calculate appropriate serving size
  calculateServingSize(calories) {
    if (calories < 300) return 'Small portion (1 serving)';
    if (calories < 500) return 'Medium portion (1-1.5 servings)';
    if (calories < 700) return 'Large portion (1.5-2 servings)';
    return 'Extra large portion (2+ servings)';
  }

  // Get meal distribution based on timing preference
  getMealDistribution(timing, totalCalories) {
    const distributions = {
      'early_bird': {
        breakfast: Math.round(totalCalories * 0.30),
        lunch: Math.round(totalCalories * 0.35),
        snack: Math.round(totalCalories * 0.10),
        dinner: Math.round(totalCalories * 0.25)
      },
      'regular': {
        breakfast: Math.round(totalCalories * 0.25),
        lunch: Math.round(totalCalories * 0.35),
        snack: Math.round(totalCalories * 0.15),
        dinner: Math.round(totalCalories * 0.25)
      },
      'late_riser': {
        brunch: Math.round(totalCalories * 0.35),
        lunch: Math.round(totalCalories * 0.30),
        snack: Math.round(totalCalories * 0.15),
        dinner: Math.round(totalCalories * 0.20)
      },
      'night_owl': {
        brunch: Math.round(totalCalories * 0.30),
        lunch: Math.round(totalCalories * 0.25),
        dinner: Math.round(totalCalories * 0.30),
        late_snack: Math.round(totalCalories * 0.15)
      }
    };
    
    return distributions[timing] || distributions['regular'];
  }

  // Get maximum cooking time based on preference
  getMaxCookingTime(preference) {
    const timeMap = {
      'minimal': 30,
      'moderate': 60,
      'substantial': 120,
      'extensive': 180
    };
    
    return timeMap[preference] || 60;
  }

  // Get current season
  getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 10) return 'monsoon';
    return 'winter';
  }

  // Generate shopping list from meal plan
  generateShoppingList(mealPlan) {
    const ingredients = {};
    const categories = {};
    
    // Collect all ingredients
    Object.values(mealPlan).forEach(dayMeals => {
      Object.values(dayMeals).forEach(meal => {
        if (meal.ingredients) {
          meal.ingredients.forEach(ingredient => {
            const name = ingredient.name;
            const category = ingredient.category || 'miscellaneous';
            
            if (!ingredients[name]) {
              ingredients[name] = {
                name,
                category,
                quantity: 0,
                unit: this.getIngredientUnit(category),
                estimatedCost: this.estimateIngredientCost(ingredient)
              };
            }
            
            ingredients[name].quantity += this.estimateIngredientQuantity(ingredient, meal.totalCalories);
            
            if (!categories[category]) {
              categories[category] = [];
            }
            
            if (!categories[category].find(item => item.name === name)) {
              categories[category].push(ingredients[name]);
            }
          });
        }
      });
    });
    
    // Calculate total estimated cost
    const totalCost = Object.values(ingredients).reduce((sum, item) => sum + item.estimatedCost, 0);
    
    return {
      ingredients: Object.values(ingredients),
      categories,
      totalItems: Object.keys(ingredients).length,
      estimatedTotalCost: Math.round(totalCost),
      generatedAt: new Date()
    };
  }

  // Get appropriate unit for ingredient
  getIngredientUnit(category) {
    const unitMap = {
      'grains': 'kg',
      'legumes': 'kg',
      'vegetables': 'kg',
      'fruits': 'kg',
      'dairy': 'liters',
      'meat': 'kg',
      'fish': 'kg',
      'oils': 'liters',
      'spices': 'grams',
      'nuts': 'grams'
    };
    
    return unitMap[category] || 'pieces';
  }

  // Estimate ingredient quantity needed
  estimateIngredientQuantity(ingredient, mealCalories) {
    const category = ingredient.category;
    const baseQuantities = {
      'grains': 0.1, // 100g per meal
      'legumes': 0.05, // 50g per meal
      'vegetables': 0.15, // 150g per meal
      'fruits': 0.1, // 100g per meal
      'dairy': 0.2, // 200ml per meal
      'meat': 0.1, // 100g per meal
      'fish': 0.1, // 100g per meal
      'oils': 0.01, // 10ml per meal
      'spices': 0.005, // 5g per meal
      'nuts': 0.02 // 20g per meal
    };
    
    const baseQuantity = baseQuantities[category] || 0.1;
    const scaleFactor = mealCalories / 500; // Scale based on meal size
    
    return baseQuantity * scaleFactor;
  }

  // Estimate ingredient cost
  estimateIngredientCost(ingredient) {
    const costMap = {
      'budget': 50,
      'moderate': 100,
      'premium': 200
    };
    
    return costMap[ingredient.cost] || 75;
  }

  // Calculate weekly nutrition summary
  calculateWeeklyNutrition(mealPlan) {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let mealCount = 0;
    
    Object.values(mealPlan).forEach(dayMeals => {
      Object.values(dayMeals).forEach(meal => {
        totalCalories += meal.totalCalories || 0;
        totalProtein += meal.totalProtein || 0;
        totalCarbs += meal.totalCarbs || 0;
        totalFat += meal.totalFat || 0;
        mealCount++;
      });
    });
    
    return {
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      averageCaloriesPerDay: Math.round(totalCalories / 7),
      averageCaloriesPerMeal: Math.round(totalCalories / mealCount),
      macroDistribution: {
        protein: Math.round((totalProtein * 4 / totalCalories) * 100),
        carbs: Math.round((totalCarbs * 4 / totalCalories) * 100),
        fat: Math.round((totalFat * 9 / totalCalories) * 100)
      },
      weeklyTotals: {
        calories: totalCalories,
        protein: Math.round(totalProtein),
        carbs: Math.round(totalCarbs),
        fat: Math.round(totalFat)
      }
    };
  }

  // Generate meal prep suggestions
  generateMealPrepSuggestions(mealPlan, cookingTimePreference) {
    const suggestions = [];
    
    // Batch cooking suggestions
    const grainMeals = this.findMealsWithCategory(mealPlan, 'grains');
    if (grainMeals.length > 3) {
      suggestions.push({
        type: 'batch_cooking',
        title: 'Batch Cook Grains',
        description: 'Cook rice, quinoa, and other grains in large batches on Sunday',
        timesSaved: '30 minutes per day',
        meals: grainMeals.slice(0, 3)
      });
    }
    
    // Prep vegetables
    const vegMeals = this.findMealsWithCategory(mealPlan, 'vegetables');
    if (vegMeals.length > 2) {
      suggestions.push({
        type: 'prep_vegetables',
        title: 'Pre-cut Vegetables',
        description: 'Wash, chop, and store vegetables for the week',
        timesSaved: '15 minutes per meal',
        meals: vegMeals.slice(0, 3)
      });
    }
    
    // Make-ahead meals
    const makeAheadMeals = this.findMakeAheadMeals(mealPlan);
    if (makeAheadMeals.length > 0) {
      suggestions.push({
        type: 'make_ahead',
        title: 'Make-Ahead Meals',
        description: 'Prepare these meals in advance and reheat when needed',
        timesSaved: '45 minutes per meal',
        meals: makeAheadMeals
      });
    }
    
    // Freezer-friendly options
    const freezerMeals = this.findFreezerFriendlyMeals(mealPlan);
    if (freezerMeals.length > 0) {
      suggestions.push({
        type: 'freezer_meals',
        title: 'Freezer-Friendly Meals',
        description: 'Double the recipe and freeze portions for future weeks',
        timesSaved: '60 minutes per week',
        meals: freezerMeals
      });
    }
    
    return suggestions;
  }

  // Helper methods for meal prep suggestions
  findMealsWithCategory(mealPlan, category) {
    const meals = [];
    Object.values(mealPlan).forEach(dayMeals => {
      Object.values(dayMeals).forEach(meal => {
        if (meal.ingredients && meal.ingredients.some(i => i.category === category)) {
          meals.push(meal);
        }
      });
    });
    return meals;
  }

  findMakeAheadMeals(mealPlan) {
    const makeAheadMeals = [];
    Object.values(mealPlan).forEach(dayMeals => {
      Object.values(dayMeals).forEach(meal => {
        if (meal.tags && (meal.tags.includes('make_ahead') || meal.preparationTime > 45)) {
          makeAheadMeals.push(meal);
        }
      });
    });
    return makeAheadMeals;
  }

  findFreezerFriendlyMeals(mealPlan) {
    const freezerMeals = [];
    Object.values(mealPlan).forEach(dayMeals => {
      Object.values(dayMeals).forEach(meal => {
        if (meal.tags && meal.tags.includes('freezer_friendly')) {
          freezerMeals.push(meal);
        }
      });
    });
    return freezerMeals;
  }

  // Get meal plan analytics
  getMealPlanAnalytics(mealPlan, nutritionTargets) {
    const weeklyNutrition = this.calculateWeeklyNutrition(mealPlan);
    
    return {
      adherenceToTargets: {
        calories: Math.round((weeklyNutrition.averageCaloriesPerDay / nutritionTargets.calories) * 100),
        protein: Math.round((weeklyNutrition.weeklyTotals.protein / 7 / nutritionTargets.protein) * 100),
        carbs: Math.round((weeklyNutrition.weeklyTotals.carbs / 7 / nutritionTargets.carbs) * 100),
        fat: Math.round((weeklyNutrition.weeklyTotals.fat / 7 / nutritionTargets.fat) * 100)
      },
      varietyScore: this.calculateVarietyScore(mealPlan),
      healthScore: this.calculateHealthScore(mealPlan),
      costEfficiency: this.calculateCostEfficiency(mealPlan),
      timeEfficiency: this.calculateTimeEfficiency(mealPlan),
      recommendations: this.generateRecommendations(mealPlan, nutritionTargets)
    };
  }

  // Calculate variety score
  calculateVarietyScore(mealPlan) {
    const uniqueIngredients = new Set();
    const uniqueCategories = new Set();
    
    Object.values(mealPlan).forEach(dayMeals => {
      Object.values(dayMeals).forEach(meal => {
        if (meal.ingredients) {
          meal.ingredients.forEach(ingredient => {
            uniqueIngredients.add(ingredient.name);
            uniqueCategories.add(ingredient.category);
          });
        }
      });
    });
    
    // Score based on ingredient diversity
    const ingredientScore = Math.min(uniqueIngredients.size / 30, 1) * 50;
    const categoryScore = Math.min(uniqueCategories.size / 8, 1) * 50;
    
    return Math.round(ingredientScore + categoryScore);
  }

  // Calculate health score
  calculateHealthScore(mealPlan) {
    let healthyIngredients = 0;
    let totalIngredients = 0;
    
    Object.values(mealPlan).forEach(dayMeals => {
      Object.values(dayMeals).forEach(meal => {
        if (meal.ingredients) {
          meal.ingredients.forEach(ingredient => {
            totalIngredients++;
            if (ingredient.tags && (
              ingredient.tags.includes('antioxidant') ||
              ingredient.tags.includes('high_fiber') ||
              ingredient.tags.includes('omega_3') ||
              ingredient.tags.includes('vitamin_rich')
            )) {
              healthyIngredients++;
            }
          });
        }
      });
    });
    
    return totalIngredients > 0 ? Math.round((healthyIngredients / totalIngredients) * 100) : 50;
  }

  // Calculate cost efficiency
  calculateCostEfficiency(mealPlan) {
    let budgetMeals = 0;
    let totalMeals = 0;
    
    Object.values(mealPlan).forEach(dayMeals => {
      Object.values(dayMeals).forEach(meal => {
        totalMeals++;
        if (meal.cost === 'budget' || meal.cost === 'moderate') {
          budgetMeals++;
        }
      });
    });
    
    return totalMeals > 0 ? Math.round((budgetMeals / totalMeals) * 100) : 50;
  }

  // Calculate time efficiency
  calculateTimeEfficiency(mealPlan) {
    let quickMeals = 0;
    let totalMeals = 0;
    
    Object.values(mealPlan).forEach(dayMeals => {
      Object.values(dayMeals).forEach(meal => {
        totalMeals++;
        if (meal.preparationTime <= 30) {
          quickMeals++;
        }
      });
    });
    
    return totalMeals > 0 ? Math.round((quickMeals / totalMeals) * 100) : 50;
  }

  // Generate recommendations
  generateRecommendations(mealPlan, nutritionTargets) {
    const recommendations = [];
    const analytics = this.getMealPlanAnalytics(mealPlan, nutritionTargets);
    
    if (analytics.varietyScore < 70) {
      recommendations.push({
        type: 'variety',
        message: 'Try incorporating more diverse ingredients and cooking methods',
        priority: 'medium'
      });
    }
    
    if (analytics.healthScore < 60) {
      recommendations.push({
        type: 'health',
        message: 'Add more antioxidant-rich and nutrient-dense foods',
        priority: 'high'
      });
    }
    
    if (analytics.timeEfficiency < 50) {
      recommendations.push({
        type: 'time',
        message: 'Consider meal prep strategies to reduce daily cooking time',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }
}

module.exports = new EnhancedMealPlannerService();