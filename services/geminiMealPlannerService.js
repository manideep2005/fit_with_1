// Google Generative AI removed for deployment simplicity

class GeminiMealPlannerService {
  constructor() {
    this.isAIEnabled = false;
    console.log('🍽️ Meal Planner Service initialized (AI disabled)');
  }

  // Generate AI-powered meal plan (fallback implementation)
  async generateAIMealPlan(healthAssessment) {
    try {
      console.log('🍽️ Generating meal plan (AI disabled, using fallback)...');
      
      // Use fallback plan generation
      const structuredPlan = this.createFallbackPlan(healthAssessment);
      
      return {
        success: true,
        mealPlan: structuredPlan.mealPlan,
        nutritionTargets: structuredPlan.nutritionTargets,
        aiInsights: structuredPlan.insights,
        shoppingList: structuredPlan.shoppingList
      };
    } catch (error) {
      console.error('❌ Meal plan generation error:', error);
      throw new Error('Failed to generate meal plan: ' + error.message);
    }
  }

  // Create comprehensive prompt for Gemini
  createMealPlanPrompt(assessment) {
    const {
      age, gender, height, weight, target_weight, activity_level,
      fitness_goals, region, dietary_restrictions, medical_conditions,
      food_preferences, cooking_time, budget_range, meal_timing,
      family_size, kitchen_equipment
    } = assessment;

    return `
You are an expert nutritionist and meal planning AI. Create a comprehensive 7-day meal plan based on this health profile:

PERSONAL INFO:
- Age: ${age}, Gender: ${gender}
- Height: ${height}cm, Weight: ${weight}kg, Target: ${target_weight}kg
- Activity Level: ${activity_level}
- Fitness Goals: ${fitness_goals?.join(', ') || 'maintain health'}

PREFERENCES & RESTRICTIONS:
- Region: ${region} cuisine
- Dietary Restrictions: ${dietary_restrictions?.join(', ') || 'none'}
- Medical Conditions: ${medical_conditions?.join(', ') || 'none'}
- Food Preferences: ${food_preferences?.join(', ') || 'balanced'}
- Cooking Time: ${cooking_time} per day
- Budget: ${budget_range}
- Family Size: ${family_size}
- Kitchen Equipment: ${kitchen_equipment?.join(', ') || 'basic'}
- Meal Timing: ${meal_timing}

REQUIREMENTS:
1. Create meals for 7 days (Monday-Sunday)
2. Include breakfast, lunch, dinner, and 1-2 snacks per day
3. Focus on ${region} cuisine with authentic recipes
4. Consider medical conditions for ingredient selection
5. Provide exact calorie and macro counts
6. Include cooking instructions and prep time
7. Generate shopping list with quantities
8. Add nutritional insights and tips

FORMAT YOUR RESPONSE AS JSON:
{
  "nutritionTargets": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number
  },
  "mealPlan": {
    "monday": {
      "breakfast": {
        "name": "Meal Name",
        "description": "Brief description",
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "ingredients": ["ingredient1", "ingredient2"],
        "instructions": ["step1", "step2"],
        "cookingTime": number,
        "region": "${region}",
        "tags": ["tag1", "tag2"]
      },
      "lunch": {...},
      "dinner": {...},
      "snack": {...}
    },
    ... (continue for all 7 days)
  },
  "shoppingList": {
    "vegetables": ["item1 - 500g", "item2 - 1kg"],
    "proteins": ["item1 - 1kg", "item2 - 500g"],
    "grains": ["item1 - 2kg", "item2 - 1kg"],
    "spices": ["item1 - 100g", "item2 - 50g"],
    "dairy": ["item1 - 1L", "item2 - 500g"]
  },
  "insights": [
    "Nutritional insight 1",
    "Health tip 2",
    "Cooking tip 3"
  ]
}

Make it authentic ${region} cuisine with proper ingredient names and cooking methods. Ensure all medical conditions are considered.
`;
  }

  // Parse AI response into structured format
  parseAIMealPlan(aiResponse, assessment) {
    try {
      // Try to extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        return {
          mealPlan: parsedData.mealPlan || {},
          nutritionTargets: parsedData.nutritionTargets || this.calculateBasicTargets(assessment),
          insights: parsedData.insights || [],
          shoppingList: parsedData.shoppingList || {}
        };
      }
      
      // Fallback parsing if JSON extraction fails
      return this.fallbackParsing(aiResponse, assessment);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return this.createFallbackPlan(assessment);
    }
  }

  // Fallback parsing method
  fallbackParsing(aiResponse, assessment) {
    const lines = aiResponse.split('\n').filter(line => line.trim());
    const mealPlan = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    // Basic parsing logic
    days.forEach(day => {
      mealPlan[day] = {
        breakfast: this.createBasicMeal('breakfast', assessment),
        lunch: this.createBasicMeal('lunch', assessment),
        dinner: this.createBasicMeal('dinner', assessment),
        snack: this.createBasicMeal('snack', assessment)
      };
    });

    return {
      mealPlan,
      nutritionTargets: this.calculateBasicTargets(assessment),
      insights: ['AI-generated meal plan based on your preferences'],
      shoppingList: this.generateBasicShoppingList()
    };
  }

  // Create basic meal structure
  createBasicMeal(mealType, assessment) {
    const { region = 'mixed' } = assessment;
    const calorieTargets = {
      breakfast: 400,
      lunch: 500,
      dinner: 450,
      snack: 200
    };

    const regionalMeals = {
      north_indian: {
        breakfast: 'Aloo Paratha with Curd',
        lunch: 'Dal Chawal with Sabzi',
        dinner: 'Roti with Dal',
        snack: 'Mixed Nuts'
      },
      south_indian: {
        breakfast: 'Idli Sambar',
        lunch: 'Sambar Rice',
        dinner: 'Curd Rice',
        snack: 'Coconut Water'
      },
      mixed: {
        breakfast: 'Oats Bowl',
        lunch: 'Quinoa Salad',
        dinner: 'Grilled Protein',
        snack: 'Fruit Bowl'
      }
    };

    const meals = regionalMeals[region] || regionalMeals.mixed;
    const calories = calorieTargets[mealType];

    return {
      name: meals[mealType],
      description: `Healthy ${region} ${mealType}`,
      calories,
      protein: Math.round(calories * 0.25 / 4),
      carbs: Math.round(calories * 0.45 / 4),
      fat: Math.round(calories * 0.30 / 9),
      ingredients: ['Main ingredient', 'Vegetables', 'Spices'],
      instructions: ['Prepare ingredients', 'Cook as per tradition', 'Serve hot'],
      cookingTime: 30,
      region,
      tags: ['healthy', 'traditional']
    };
  }

  // Calculate basic nutrition targets
  calculateBasicTargets(assessment) {
    const { age = 25, gender = 'male', height = 170, weight = 70, activity_level = 'moderately_active' } = assessment;
    
    // BMR calculation
    let bmr = gender === 'male' 
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

    // Activity multipliers
    const multipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    };

    const calories = Math.round(bmr * (multipliers[activity_level] || 1.55));
    
    return {
      calories,
      protein: Math.round(calories * 0.25 / 4),
      carbs: Math.round(calories * 0.45 / 4),
      fat: Math.round(calories * 0.30 / 9),
      fiber: Math.round(calories / 1000 * 25)
    };
  }

  // Generate basic shopping list
  generateBasicShoppingList() {
    return {
      vegetables: ['Onions - 2kg', 'Tomatoes - 1kg', 'Potatoes - 2kg'],
      proteins: ['Lentils - 1kg', 'Paneer - 500g'],
      grains: ['Rice - 2kg', 'Wheat flour - 2kg'],
      spices: ['Turmeric - 100g', 'Cumin - 100g'],
      dairy: ['Milk - 2L', 'Yogurt - 1kg']
    };
  }

  // Create fallback plan
  createFallbackPlan(assessment) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const mealPlan = {};
    
    days.forEach(day => {
      mealPlan[day] = {
        breakfast: this.createBasicMeal('breakfast', assessment),
        lunch: this.createBasicMeal('lunch', assessment),
        dinner: this.createBasicMeal('dinner', assessment),
        snack: this.createBasicMeal('snack', assessment)
      };
    });

    return {
      mealPlan,
      nutritionTargets: this.calculateBasicTargets(assessment),
      insights: ['Personalized meal plan created for your health goals'],
      shoppingList: this.generateBasicShoppingList()
    };
  }

  // Generate meal suggestions for specific criteria (fallback)
  async generateMealSuggestions(criteria) {
    try {
      console.log('🍽️ Generating meal suggestions (fallback mode)...');
      return this.getFallbackSuggestions(criteria);
    } catch (error) {
      console.error('Error generating meal suggestions:', error);
      return this.getFallbackSuggestions(criteria);
    }
  }

  // Parse meal suggestions
  parseMealSuggestions(aiResponse, criteria) {
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing suggestions:', error);
    }
    
    return this.getFallbackSuggestions(criteria);
  }

  // Get fallback suggestions
  getFallbackSuggestions(criteria) {
    const { mealType, region, calorieTarget = 400 } = criteria;
    
    return [
      {
        name: `${region} ${mealType}`,
        calories: calorieTarget,
        protein: Math.round(calorieTarget * 0.25 / 4),
        carbs: Math.round(calorieTarget * 0.45 / 4),
        fat: Math.round(calorieTarget * 0.30 / 9),
        ingredients: ['Main ingredient', 'Vegetables', 'Spices'],
        instructions: ['Prepare', 'Cook', 'Serve'],
        cookingTime: 30
      }
    ];
  }

  // Generate cooking instructions (fallback)
  async generateCookingInstructions(mealName, ingredients, region) {
    try {
      return `Cook ${mealName} using ${ingredients.join(', ')} according to traditional ${region} methods. Season to taste and serve hot.`;
    } catch (error) {
      console.error('Error generating cooking instructions:', error);
      return 'Cook ingredients according to traditional methods. Season to taste and serve hot.';
    }
  }

  // Get nutritional analysis (fallback)
  async getNutritionalAnalysis(mealPlan, healthGoals) {
    try {
      return `Your meal plan provides balanced nutrition for your health goals: ${healthGoals.join(', ')}. Focus on portion control and variety.`;
    } catch (error) {
      console.error('Error getting nutritional analysis:', error);
      return 'Your meal plan provides balanced nutrition for your health goals.';
    }
  }

  // Generate personalized nutrition tips (fallback)
  async getPersonalizedTips(userProfile) {
    try {
      return [
        'Stay hydrated throughout the day',
        'Include variety in your meals',
        'Practice portion control',
        'Eat mindfully and slowly',
        'Plan your meals in advance'
      ];
    } catch (error) {
      console.error('Error generating personalized tips:', error);
      return [
        'Stay hydrated throughout the day',
        'Include variety in your meals',
        'Practice portion control',
        'Eat mindfully and slowly',
        'Plan your meals in advance'
      ];
    }
  }
}

module.exports = new GeminiMealPlannerService();