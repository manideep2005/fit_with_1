const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const aiService = require('../services/aiService');

// Get user's meal plans
router.get('/plans', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const { startDate, endDate } = req.query;
    
    const user = await UserService.getUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const mealPlans = user.mealPlans || [];
    let filteredPlans = mealPlans;

    if (startDate && endDate) {
      filteredPlans = mealPlans.filter(plan => {
        const planDate = new Date(plan.date);
        return planDate >= new Date(startDate) && planDate <= new Date(endDate);
      });
    }

    res.json({ success: true, mealPlans: filteredPlans });
  } catch (error) {
    console.error('Get meal plans error:', error);
    res.status(500).json({ success: false, error: 'Failed to get meal plans' });
  }
});

// Add meal to plan
router.post('/meals', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const { date, mealType, name, calories, protein, carbs, fat, notes } = req.body;

    if (!date || !mealType || !name) {
      return res.status(400).json({
        success: false,
        error: 'Date, meal type, and name are required'
      });
    }

    const mealData = {
      id: Date.now().toString(),
      date: new Date(date),
      mealType,
      name,
      calories: parseInt(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      notes: notes || '',
      createdAt: new Date()
    };

    await UserService.addMealPlan(userEmail, mealData);

    res.json({
      success: true,
      message: 'Meal added to plan successfully',
      meal: mealData
    });
  } catch (error) {
    console.error('Add meal error:', error);
    res.status(500).json({ success: false, error: 'Failed to add meal' });
  }
});

// Update meal in plan
router.put('/meals/:mealId', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const { mealId } = req.params;
    const { mealType, name, calories, protein, carbs, fat, notes } = req.body;

    const updateData = {
      mealType,
      name,
      calories: parseInt(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      notes: notes || '',
      updatedAt: new Date()
    };

    await UserService.updateMealPlan(userEmail, mealId, updateData);

    res.json({
      success: true,
      message: 'Meal updated successfully'
    });
  } catch (error) {
    console.error('Update meal error:', error);
    res.status(500).json({ success: false, error: 'Failed to update meal' });
  }
});

// Delete meal from plan
router.delete('/meals/:mealId', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const { mealId } = req.params;

    await UserService.deleteMealPlan(userEmail, mealId);

    res.json({
      success: true,
      message: 'Meal deleted successfully'
    });
  } catch (error) {
    console.error('Delete meal error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete meal' });
  }
});

// Generate AI meal plan
router.post('/ai-generate', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const { preferences, calorieTarget, days } = req.body;

    const user = await UserService.getUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userContext = {
      fitnessGoals: user.fitnessGoals,
      healthInfo: user.healthInfo,
      preferences: user.preferences,
      personalInfo: user.personalInfo
    };

    const prompt = `Generate a ${days || 7}-day meal plan for a user with the following preferences:
    - Dietary preferences: ${preferences.join(', ')}
    - Daily calorie target: ${calorieTarget}
    - User context: ${JSON.stringify(userContext)}
    
    Please provide meals for breakfast, lunch, dinner, and snacks with nutritional information.`;

    const aiResponse = await aiService.getAIResponse(prompt, userContext);
    
    // Parse AI response and create meal plan structure
    const mealPlan = parseAIMealPlan(aiResponse, calorieTarget, preferences);

    res.json({
      success: true,
      message: 'AI meal plan generated successfully',
      mealPlan: mealPlan,
      aiResponse: aiResponse
    });
  } catch (error) {
    console.error('AI meal plan generation error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate AI meal plan' });
  }
});

// Get recipe suggestions
router.get('/recipe-suggestions', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const user = await UserService.getUserByEmail(userEmail);
    
    const userContext = {
      fitnessGoals: user.fitnessGoals,
      healthInfo: user.healthInfo,
      preferences: user.preferences
    };

    const prompt = `Suggest 6 healthy recipes based on user's fitness goals and dietary preferences: ${JSON.stringify(userContext)}. Include recipe name, cooking time, calories, and brief description.`;

    const aiResponse = await aiService.getAIResponse(prompt, userContext);
    const recipes = parseRecipeSuggestions(aiResponse);

    res.json({
      success: true,
      recipes: recipes
    });
  } catch (error) {
    console.error('Recipe suggestions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get recipe suggestions' });
  }
});

// Helper function to parse AI meal plan response
function parseAIMealPlan(aiResponse, calorieTarget, preferences) {
  // This is a simplified parser - in production, you'd want more robust parsing
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  
  const mealPlan = {};
  
  days.forEach(day => {
    mealPlan[day] = {};
    mealTypes.forEach(mealType => {
      mealPlan[day][mealType] = {
        name: `AI Generated ${mealType}`,
        calories: Math.round(calorieTarget / 4),
        protein: Math.round(calorieTarget * 0.15 / 4),
        carbs: Math.round(calorieTarget * 0.5 / 4),
        fat: Math.round(calorieTarget * 0.3 / 4),
        description: `Healthy ${mealType} tailored to your preferences`
      };
    });
  });
  
  return mealPlan;
}

// Helper function to parse recipe suggestions
function parseRecipeSuggestions(aiResponse) {
  // Simplified recipe suggestions - in production, parse AI response
  return [
    {
      id: 'recipe1',
      name: 'Protein Power Bowl',
      time: 25,
      calories: 450,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
      description: 'High-protein quinoa bowl with grilled chicken'
    },
    {
      id: 'recipe2',
      name: 'Green Smoothie Bowl',
      time: 10,
      calories: 320,
      image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061',
      description: 'Nutrient-packed smoothie bowl with fresh toppings'
    },
    {
      id: 'recipe3',
      name: 'Baked Cod with Vegetables',
      time: 30,
      calories: 380,
      image: 'https://images.unsplash.com/photo-1559847844-5315695dadae',
      description: 'Lean fish with roasted seasonal vegetables'
    }
  ];
}

module.exports = router;