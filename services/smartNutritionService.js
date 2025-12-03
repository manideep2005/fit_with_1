const aiService = require('./aiService');

class SmartNutritionService {
  constructor() {
    this.foodDatabase = this.initializeFoodDatabase();
    this.userPreferences = new Map();
  }

  // AI Meal Planning
  async generateMealPlan(userId, preferences = {}) {
    try {
      const { dietType = 'balanced', calories = 2000, allergies = [], budget = 'medium' } = preferences;
      
      const prompt = `Generate a daily meal plan for ${calories} calories, ${dietType} diet. Avoid: ${allergies.join(', ')}. Budget: ${budget}. Return JSON with breakfast, lunch, dinner, snacks.`;
      
      const aiResponse = await aiService.getAIResponse(prompt, { type: 'nutrition' });
      
      // Fallback meal plan if AI fails
      const fallbackPlan = this.generateFallbackMealPlan(calories, dietType, allergies);
      
      let mealPlan;
      try {
        mealPlan = JSON.parse(aiResponse);
      } catch {
        mealPlan = fallbackPlan;
      }

      return {
        success: true,
        mealPlan: this.enrichMealPlan(mealPlan),
        generatedBy: aiResponse ? 'AI' : 'fallback'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        mealPlan: this.generateFallbackMealPlan(2000, 'balanced', [])
      };
    }
  }

  // Smart Grocery Lists
  generateGroceryList(mealPlan, preferences = {}) {
    const { budget = 'medium', store = 'general' } = preferences;
    const groceryList = new Map();

    // Extract ingredients from meal plan
    Object.values(mealPlan).forEach(meals => {
      if (Array.isArray(meals)) {
        meals.forEach(meal => {
          if (meal.ingredients) {
            meal.ingredients.forEach(ingredient => {
              const key = ingredient.name.toLowerCase();
              if (groceryList.has(key)) {
                groceryList.set(key, {
                  ...groceryList.get(key),
                  quantity: groceryList.get(key).quantity + ingredient.quantity
                });
              } else {
                groceryList.set(key, {
                  name: ingredient.name,
                  quantity: ingredient.quantity,
                  unit: ingredient.unit,
                  category: this.categorizeIngredient(ingredient.name),
                  estimatedPrice: this.estimatePrice(ingredient.name, ingredient.quantity, budget)
                });
              }
            });
          }
        });
      }
    });

    const categorizedList = this.categorizeGroceryList(Array.from(groceryList.values()));
    
    return {
      success: true,
      groceryList: categorizedList,
      totalEstimatedCost: this.calculateTotalCost(categorizedList),
      optimizationTips: this.getOptimizationTips(categorizedList, budget)
    };
  }

  // Macro Nutrient Optimization
  optimizeMacros(currentIntake, goals, activityLevel = 'moderate') {
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };

    const multiplier = activityMultipliers[activityLevel] || 1.55;
    const adjustedGoals = {
      calories: Math.round(goals.calories * multiplier),
      protein: Math.round(goals.protein * multiplier),
      carbs: Math.round(goals.carbs * multiplier),
      fat: Math.round(goals.fat * multiplier)
    };

    const recommendations = [];
    
    // Analyze current vs optimal
    if (currentIntake.protein < adjustedGoals.protein * 0.8) {
      recommendations.push({
        type: 'increase',
        nutrient: 'protein',
        amount: adjustedGoals.protein - currentIntake.protein,
        foods: ['chicken breast', 'greek yogurt', 'eggs', 'protein powder']
      });
    }

    if (currentIntake.carbs > adjustedGoals.carbs * 1.2) {
      recommendations.push({
        type: 'decrease',
        nutrient: 'carbs',
        amount: currentIntake.carbs - adjustedGoals.carbs,
        suggestion: 'Replace refined carbs with complex carbs'
      });
    }

    return {
      success: true,
      currentIntake,
      optimizedGoals: adjustedGoals,
      recommendations,
      macroBalance: this.calculateMacroBalance(currentIntake, adjustedGoals)
    };
  }

  // Food Sensitivity Detection
  detectSensitivities(nutritionHistory, symptoms = []) {
    const suspiciousFoods = new Map();
    const commonTriggers = ['dairy', 'gluten', 'nuts', 'shellfish', 'eggs'];

    // Analyze patterns in nutrition logs
    nutritionHistory.forEach(log => {
      if (log.meals) {
        log.meals.forEach(meal => {
          if (meal.foods) {
            meal.foods.forEach(food => {
              const foodName = food.name.toLowerCase();
              commonTriggers.forEach(trigger => {
                if (foodName.includes(trigger)) {
                  if (!suspiciousFoods.has(trigger)) {
                    suspiciousFoods.set(trigger, { count: 0, dates: [] });
                  }
                  const data = suspiciousFoods.get(trigger);
                  data.count++;
                  data.dates.push(log.date);
                }
              });
            });
          }
        });
      }
    });

    const detectedSensitivities = Array.from(suspiciousFoods.entries())
      .filter(([food, data]) => data.count >= 3)
      .map(([food, data]) => ({
        food,
        frequency: data.count,
        confidence: Math.min(data.count / 10, 1),
        recommendation: `Consider eliminating ${food} for 2 weeks to test sensitivity`
      }));

    return {
      success: true,
      detectedSensitivities,
      recommendations: this.generateSensitivityRecommendations(detectedSensitivities),
      nextSteps: detectedSensitivities.length > 0 ? 
        'Consider consulting a nutritionist for elimination diet guidance' : 
        'No clear sensitivities detected. Continue monitoring.'
    };
  }

  // Restaurant Menu Scanner (Mock implementation)
  scanRestaurantMenu(restaurantName, menuItems = []) {
    const healthyOptions = menuItems.map(item => {
      const healthScore = this.calculateHealthScore(item);
      const modifications = this.suggestModifications(item);
      
      return {
        ...item,
        healthScore,
        modifications,
        isRecommended: healthScore >= 7,
        nutritionEstimate: this.estimateNutrition(item)
      };
    }).sort((a, b) => b.healthScore - a.healthScore);

    return {
      success: true,
      restaurant: restaurantName,
      healthyOptions: healthyOptions.slice(0, 10),
      generalTips: [
        'Ask for dressing on the side',
        'Choose grilled over fried',
        'Request extra vegetables',
        'Opt for whole grain options when available'
      ]
    };
  }

  // Helper Methods
  generateFallbackMealPlan(calories, dietType, allergies) {
    const baseMeals = {
      breakfast: [
        { name: 'Oatmeal with berries', calories: 300, protein: 8, carbs: 45, fat: 6 },
        { name: 'Greek yogurt parfait', calories: 250, protein: 15, carbs: 30, fat: 5 }
      ],
      lunch: [
        { name: 'Grilled chicken salad', calories: 400, protein: 35, carbs: 20, fat: 15 },
        { name: 'Quinoa bowl', calories: 450, protein: 18, carbs: 60, fat: 12 }
      ],
      dinner: [
        { name: 'Baked salmon with vegetables', calories: 500, protein: 40, carbs: 25, fat: 20 },
        { name: 'Lean beef stir-fry', calories: 480, protein: 35, carbs: 35, fat: 18 }
      ],
      snacks: [
        { name: 'Apple with almond butter', calories: 200, protein: 6, carbs: 25, fat: 8 },
        { name: 'Protein smoothie', calories: 180, protein: 20, carbs: 15, fat: 4 }
      ]
    };

    return baseMeals;
  }

  enrichMealPlan(mealPlan) {
    Object.keys(mealPlan).forEach(mealType => {
      if (Array.isArray(mealPlan[mealType])) {
        mealPlan[mealType] = mealPlan[mealType].map(meal => ({
          ...meal,
          id: Date.now() + Math.random(),
          prepTime: this.estimatePrepTime(meal),
          difficulty: this.estimateDifficulty(meal),
          tags: this.generateTags(meal)
        }));
      }
    });
    return mealPlan;
  }

  categorizeIngredient(ingredientName) {
    const categories = {
      'Proteins': ['chicken', 'beef', 'fish', 'eggs', 'tofu', 'beans'],
      'Vegetables': ['broccoli', 'spinach', 'carrots', 'tomatoes', 'onions'],
      'Fruits': ['apple', 'banana', 'berries', 'orange', 'grapes'],
      'Grains': ['rice', 'quinoa', 'oats', 'bread', 'pasta'],
      'Dairy': ['milk', 'cheese', 'yogurt', 'butter'],
      'Pantry': ['oil', 'spices', 'herbs', 'vinegar', 'salt']
    };

    for (const [category, items] of Object.entries(categories)) {
      if (items.some(item => ingredientName.toLowerCase().includes(item))) {
        return category;
      }
    }
    return 'Other';
  }

  estimatePrice(ingredient, quantity, budget) {
    const basePrices = {
      low: { multiplier: 0.8, currency: '$' },
      medium: { multiplier: 1.0, currency: '$' },
      high: { multiplier: 1.3, currency: '$' }
    };

    const priceData = basePrices[budget] || basePrices.medium;
    const basePrice = Math.random() * 5 + 1; // $1-6 base price
    return (basePrice * quantity * priceData.multiplier).toFixed(2);
  }

  categorizeGroceryList(items) {
    const categorized = {};
    items.forEach(item => {
      if (!categorized[item.category]) {
        categorized[item.category] = [];
      }
      categorized[item.category].push(item);
    });
    return categorized;
  }

  calculateTotalCost(categorizedList) {
    let total = 0;
    Object.values(categorizedList).forEach(category => {
      category.forEach(item => {
        total += parseFloat(item.estimatedPrice);
      });
    });
    return total.toFixed(2);
  }

  getOptimizationTips(groceryList, budget) {
    return [
      'Buy seasonal produce for better prices',
      'Consider generic brands for pantry items',
      'Buy proteins in bulk and freeze portions',
      'Shop sales and use coupons when available'
    ];
  }

  calculateMacroBalance(current, goals) {
    return {
      protein: Math.round((current.protein / goals.protein) * 100),
      carbs: Math.round((current.carbs / goals.carbs) * 100),
      fat: Math.round((current.fat / goals.fat) * 100),
      calories: Math.round((current.calories / goals.calories) * 100)
    };
  }

  generateSensitivityRecommendations(sensitivities) {
    if (sensitivities.length === 0) {
      return ['Continue monitoring food intake and symptoms'];
    }

    return [
      'Keep a detailed food and symptom diary',
      'Consider elimination diet under professional guidance',
      'Try alternative foods for suspected triggers',
      'Consult with a registered dietitian'
    ];
  }

  calculateHealthScore(menuItem) {
    let score = 5; // Base score
    
    // Positive factors
    if (menuItem.name.toLowerCase().includes('grilled')) score += 2;
    if (menuItem.name.toLowerCase().includes('salad')) score += 2;
    if (menuItem.name.toLowerCase().includes('vegetable')) score += 1;
    
    // Negative factors
    if (menuItem.name.toLowerCase().includes('fried')) score -= 3;
    if (menuItem.name.toLowerCase().includes('creamy')) score -= 2;
    if (menuItem.name.toLowerCase().includes('cheese')) score -= 1;
    
    return Math.max(1, Math.min(10, score));
  }

  suggestModifications(menuItem) {
    const modifications = [];
    
    if (menuItem.name.toLowerCase().includes('fried')) {
      modifications.push('Ask for grilled instead of fried');
    }
    if (menuItem.name.toLowerCase().includes('sauce')) {
      modifications.push('Request sauce on the side');
    }
    modifications.push('Add extra vegetables');
    modifications.push('Choose whole grain option if available');
    
    return modifications;
  }

  estimateNutrition(menuItem) {
    // Simple estimation based on menu item name and typical restaurant portions
    const baseCalories = 400 + Math.random() * 400;
    return {
      calories: Math.round(baseCalories),
      protein: Math.round(baseCalories * 0.15 / 4),
      carbs: Math.round(baseCalories * 0.45 / 4),
      fat: Math.round(baseCalories * 0.35 / 9)
    };
  }

  estimatePrepTime(meal) {
    const complexityKeywords = ['baked', 'roasted', 'slow', 'marinated'];
    const quickKeywords = ['smoothie', 'salad', 'sandwich'];
    
    if (quickKeywords.some(keyword => meal.name.toLowerCase().includes(keyword))) {
      return '10-15 min';
    }
    if (complexityKeywords.some(keyword => meal.name.toLowerCase().includes(keyword))) {
      return '45-60 min';
    }
    return '20-30 min';
  }

  estimateDifficulty(meal) {
    const hardKeywords = ['baked', 'roasted', 'seared'];
    const easyKeywords = ['smoothie', 'salad', 'bowl'];
    
    if (easyKeywords.some(keyword => meal.name.toLowerCase().includes(keyword))) {
      return 'Easy';
    }
    if (hardKeywords.some(keyword => meal.name.toLowerCase().includes(keyword))) {
      return 'Medium';
    }
    return 'Easy';
  }

  generateTags(meal) {
    const tags = [];
    const name = meal.name.toLowerCase();
    
    if (name.includes('protein') || name.includes('chicken') || name.includes('fish')) {
      tags.push('High Protein');
    }
    if (name.includes('vegetable') || name.includes('salad')) {
      tags.push('Vegetable Rich');
    }
    if (name.includes('quick') || name.includes('smoothie')) {
      tags.push('Quick');
    }
    
    return tags;
  }

  initializeFoodDatabase() {
    return {
      // Simplified food database for nutrition calculations
      'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
      'salmon': { calories: 208, protein: 22, carbs: 0, fat: 12 },
      'quinoa': { calories: 222, protein: 8, carbs: 39, fat: 3.6 },
      'broccoli': { calories: 34, protein: 3, carbs: 7, fat: 0.4 },
      'avocado': { calories: 160, protein: 2, carbs: 9, fat: 15 }
    };
  }
}

module.exports = new SmartNutritionService();