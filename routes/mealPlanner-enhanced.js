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

// Enhanced health assessment questions with regional preferences
router.get('/health-questions', async (req, res) => {
  try {
    const healthQuestions = [
      {
        id: 'age',
        question: 'What is your age?',
        type: 'number',
        min: 13,
        max: 120,
        required: true
      },
      {
        id: 'gender',
        question: 'What is your gender?',
        type: 'select',
        options: [
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'other', label: 'Other' },
          { value: 'prefer_not_to_say', label: 'Prefer not to say' }
        ],
        required: true
      },
      {
        id: 'height',
        question: 'What is your height? (in cm)',
        type: 'number',
        min: 100,
        max: 250,
        required: true
      },
      {
        id: 'weight',
        question: 'What is your current weight? (in kg)',
        type: 'number',
        min: 30,
        max: 300,
        required: true
      },
      {
        id: 'target_weight',
        question: 'What is your target weight? (in kg)',
        type: 'number',
        min: 30,
        max: 300,
        required: true
      },
      {
        id: 'activity_level',
        question: 'How would you describe your current activity level?',
        type: 'select',
        options: [
          { value: 'sedentary', label: 'Sedentary (little to no exercise)' },
          { value: 'lightly_active', label: 'Lightly Active (light exercise 1-3 days/week)' },
          { value: 'moderately_active', label: 'Moderately Active (moderate exercise 3-5 days/week)' },
          { value: 'very_active', label: 'Very Active (hard exercise 6-7 days/week)' },
          { value: 'extremely_active', label: 'Extremely Active (very hard exercise, physical job)' }
        ],
        required: true
      },
      {
        id: 'fitness_goals',
        question: 'What are your primary fitness goals?',
        type: 'multiselect',
        options: [
          'lose_weight',
          'gain_muscle',
          'improve_endurance',
          'increase_strength',
          'improve_flexibility',
          'maintain_health',
          'reduce_stress',
          'improve_sleep',
          'improve_digestion',
          'boost_immunity'
        ],
        required: true
      },
      {
        id: 'region',
        question: 'Which region\'s cuisine do you prefer?',
        type: 'select',
        options: [
          { value: 'north_indian', label: 'North Indian (Punjab, Delhi, Rajasthan, UP)' },
          { value: 'south_indian', label: 'South Indian (Tamil Nadu, Kerala, Karnataka, Andhra)' },
          { value: 'west_indian', label: 'West Indian (Maharashtra, Gujarat, Goa, Rajasthan)' },
          { value: 'east_indian', label: 'East Indian (Bengal, Odisha, Assam, Jharkhand)' },
          { value: 'central_indian', label: 'Central Indian (Madhya Pradesh, Chhattisgarh)' },
          { value: 'northeast_indian', label: 'Northeast Indian (Manipur, Mizoram, Nagaland)' },
          { value: 'international', label: 'International Cuisine' },
          { value: 'mixed', label: 'Mixed - I enjoy all cuisines' }
        ],
        required: true
      },
      {
        id: 'food_preferences',
        question: 'What are your specific food preferences?',
        type: 'multiselect',
        options: [
          'spicy_food',
          'mild_food',
          'sweet_dishes',
          'savory_dishes',
          'fermented_foods',
          'raw_foods',
          'grilled_foods',
          'steamed_foods',
          'fried_foods_occasionally',
          'home_cooked_style',
          'restaurant_style',
          'street_food_style',
          'traditional_recipes',
          'modern_fusion'
        ],
        required: true
      },
      {
        id: 'dietary_restrictions',
        question: 'Do you have any dietary restrictions or allergies?',
        type: 'multiselect',
        options: [
          'none',
          'vegetarian',
          'vegan',
          'jain_vegetarian',
          'eggetarian',
          'pescatarian',
          'gluten_free',
          'dairy_free',
          'lactose_intolerant',
          'nut_allergy',
          'shellfish_allergy',
          'egg_allergy',
          'soy_allergy',
          'keto',
          'paleo',
          'mediterranean',
          'low_carb',
          'low_fat',
          'diabetic_friendly',
          'heart_healthy',
          'low_sodium'
        ],
        required: true
      },
      {
        id: 'meal_timing',
        question: 'What are your preferred meal timings?',
        type: 'select',
        options: [
          { value: 'early_bird', label: 'Early Bird (6 AM breakfast, 12 PM lunch, 6 PM dinner)' },
          { value: 'regular', label: 'Regular (8 AM breakfast, 1 PM lunch, 8 PM dinner)' },
          { value: 'late_riser', label: 'Late Riser (10 AM breakfast, 3 PM lunch, 9 PM dinner)' },
          { value: 'night_owl', label: 'Night Owl (11 AM brunch, 4 PM lunch, 10 PM dinner)' },
          { value: 'flexible', label: 'Flexible - varies daily' }
        ],
        required: true
      },
      {
        id: 'cooking_time',
        question: 'How much time can you dedicate to cooking daily?',
        type: 'select',
        options: [
          { value: 'minimal', label: 'Minimal (15-30 minutes)' },
          { value: 'moderate', label: 'Moderate (30-60 minutes)' },
          { value: 'substantial', label: 'Substantial (1-2 hours)' },
          { value: 'extensive', label: 'Extensive (2+ hours)' }
        ],
        required: true
      },
      {
        id: 'budget_range',
        question: 'What is your daily food budget range?',
        type: 'select',
        options: [
          { value: 'budget', label: 'Budget-friendly (₹100-200 per day)' },
          { value: 'moderate', label: 'Moderate (₹200-400 per day)' },
          { value: 'premium', label: 'Premium (₹400-600 per day)' },
          { value: 'luxury', label: 'Luxury (₹600+ per day)' }
        ],
        required: true
      },
      {
        id: 'medical_conditions',
        question: 'Do you have any medical conditions we should be aware of?',
        type: 'multiselect',
        options: [
          'none',
          'diabetes_type1',
          'diabetes_type2',
          'hypertension',
          'heart_disease',
          'high_cholesterol',
          'arthritis',
          'asthma',
          'thyroid_hyperthyroid',
          'thyroid_hypothyroid',
          'kidney_disease',
          'liver_disease',
          'digestive_issues',
          'acid_reflux',
          'ibs',
          'depression',
          'anxiety',
          'eating_disorder',
          'pcos',
          'osteoporosis'
        ],
        required: true
      },
      {
        id: 'supplements',
        question: 'Are you currently taking any supplements or medications?',
        type: 'multiselect',
        options: [
          'none',
          'multivitamin',
          'vitamin_d',
          'vitamin_b12',
          'iron',
          'calcium',
          'omega3',
          'protein_powder',
          'probiotics',
          'diabetes_medication',
          'blood_pressure_medication',
          'thyroid_medication',
          'other_prescription'
        ],
        required: true
      },
      {
        id: 'sleep_hours',
        question: 'How many hours of sleep do you typically get per night?',
        type: 'number',
        min: 3,
        max: 12,
        required: true
      },
      {
        id: 'stress_level',
        question: 'How would you rate your current stress level?',
        type: 'select',
        options: [
          { value: 'low', label: 'Low stress' },
          { value: 'moderate', label: 'Moderate stress' },
          { value: 'high', label: 'High stress' },
          { value: 'very_high', label: 'Very high stress' }
        ],
        required: true
      },
      {
        id: 'water_intake',
        question: 'How many glasses of water do you drink per day?',
        type: 'number',
        min: 0,
        max: 20,
        required: true
      },
      {
        id: 'meal_frequency',
        question: 'How many meals do you typically eat per day?',
        type: 'select',
        options: [
          { value: '2', label: '2 meals (Intermittent fasting style)' },
          { value: '3', label: '3 meals (Traditional)' },
          { value: '4', label: '4 meals (3 main + 1 snack)' },
          { value: '5', label: '5 meals (3 main + 2 snacks)' },
          { value: '6', label: '6+ meals (Small frequent meals)' }
        ],
        required: true
      },
      {
        id: 'cooking_experience',
        question: 'How would you describe your cooking experience?',
        type: 'select',
        options: [
          { value: 'beginner', label: 'Beginner (basic cooking skills)' },
          { value: 'intermediate', label: 'Intermediate (comfortable with most recipes)' },
          { value: 'advanced', label: 'Advanced (experienced cook)' },
          { value: 'expert', label: 'Expert (professional level)' }
        ],
        required: true
      },
      {
        id: 'kitchen_equipment',
        question: 'What kitchen equipment do you have access to?',
        type: 'multiselect',
        options: [
          'gas_stove',
          'electric_stove',
          'induction_cooktop',
          'microwave',
          'oven',
          'air_fryer',
          'pressure_cooker',
          'slow_cooker',
          'blender',
          'food_processor',
          'steamer',
          'grill',
          'rice_cooker',
          'mixer_grinder',
          'tandoor',
          'clay_pot'
        ],
        required: true
      },
      {
        id: 'lifestyle',
        question: 'Which best describes your lifestyle?',
        type: 'select',
        options: [
          { value: 'student', label: 'Student' },
          { value: 'working_professional', label: 'Working Professional' },
          { value: 'work_from_home', label: 'Work from Home' },
          { value: 'homemaker', label: 'Homemaker' },
          { value: 'retired', label: 'Retired' },
          { value: 'athlete', label: 'Athlete/Fitness Professional' },
          { value: 'frequent_traveler', label: 'Frequent Traveler' }
        ],
        required: true
      },
      {
        id: 'family_size',
        question: 'How many people are you cooking for?',
        type: 'select',
        options: [
          { value: '1', label: 'Just myself' },
          { value: '2', label: '2 people (couple)' },
          { value: '3-4', label: '3-4 people (small family)' },
          { value: '5-6', label: '5-6 people (large family)' },
          { value: '7+', label: '7+ people (joint family)' }
        ],
        required: true
      }
    ];

    res.json({
      success: true,
      questions: healthQuestions
    });
  } catch (error) {
    console.error('Get health questions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get health questions' });
  }
});

// Submit health assessment and generate comprehensive meal plan
router.post('/health-assessment', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const { answers } = req.body;

    if (!answers || Object.keys(answers).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Health assessment answers are required'
      });
    }

    const user = await UserService.getUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Calculate nutritional targets based on assessment
    const nutritionTargets = calculateAdvancedNutritionTargets(answers);
    
    // Generate comprehensive personalized meal plan
    const mealPlan = await generateComprehensiveMealPlan(answers, nutritionTargets);

    // Save assessment results to user profile
    const assessmentData = {
      answers: answers,
      nutritionTargets: nutritionTargets,
      completedAt: new Date(),
      version: '2.0'
    };

    await UserService.updateHealthAssessment(userEmail, assessmentData);

    res.json({
      success: true,
      message: 'Health assessment completed successfully',
      nutritionTargets: nutritionTargets,
      mealPlan: mealPlan,
      assessment: assessmentData
    });
  } catch (error) {
    console.error('Health assessment submission error:', error);
    res.status(500).json({ success: false, error: 'Failed to process health assessment' });
  }
});

// Get today's nutrition data
router.get('/nutrition/today', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const user = await UserService.getUserByEmail(userEmail);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Get today's nutrition logs
    const todayNutritionLogs = (user.nutritionLogs || []).filter(log => 
      new Date(log.date) >= todayStart && new Date(log.date) < todayEnd
    );

    // Sum up nutrition for today
    const todayNutrition = todayNutritionLogs.reduce((total, log) => ({
      totalCalories: (total.totalCalories || 0) + (log.totalCalories || 0),
      totalProtein: (total.totalProtein || 0) + (log.totalProtein || 0),
      totalCarbs: (total.totalCarbs || 0) + (log.totalCarbs || 0),
      totalFat: (total.totalFat || 0) + (log.totalFat || 0),
      meals: [...(total.meals || []), ...(log.meals || [])]
    }), {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      meals: []
    });

    res.json({
      success: true,
      nutrition: todayNutrition,
      date: today.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Get today nutrition error:', error);
    res.status(500).json({ success: false, error: 'Failed to get today\'s nutrition data' });
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

// Enhanced nutrition calculation with medical conditions and regional preferences
function calculateAdvancedNutritionTargets(answers) {
  const age = parseInt(answers.age) || 25;
  const gender = answers.gender || 'male';
  const height = parseInt(answers.height) || 170; // cm
  const weight = parseInt(answers.weight) || 70; // kg
  const targetWeight = parseInt(answers.target_weight) || weight;
  const activityLevel = answers.activity_level || 'moderately_active';
  const fitnessGoals = answers.fitness_goals || ['maintain_health'];
  const medicalConditions = answers.medical_conditions || ['none'];
  const region = answers.region || 'mixed';

  // Calculate BMR using Mifflin-St Jeor Equation
  let bmr;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // Activity multipliers
  const activityMultipliers = {
    'sedentary': 1.2,
    'lightly_active': 1.375,
    'moderately_active': 1.55,
    'very_active': 1.725,
    'extremely_active': 1.9
  };

  const activityMultiplier = activityMultipliers[activityLevel] || 1.55;
  let tdee = bmr * activityMultiplier;

  // Adjust calories based on goals
  if (fitnessGoals.includes('lose_weight')) {
    tdee -= 500; // 500 calorie deficit for 1 lb/week loss
  } else if (fitnessGoals.includes('gain_muscle')) {
    tdee += 300; // 300 calorie surplus for muscle gain
  }

  // Medical condition adjustments
  if (medicalConditions.includes('diabetes_type1') || medicalConditions.includes('diabetes_type2')) {
    // Lower carb ratio for diabetics
    var proteinRatio = 0.25;
    var carbRatio = 0.35;
    var fatRatio = 0.40;
  } else if (medicalConditions.includes('heart_disease') || medicalConditions.includes('high_cholesterol')) {
    // Heart-healthy ratios
    var proteinRatio = 0.20;
    var carbRatio = 0.55;
    var fatRatio = 0.25;
  } else if (medicalConditions.includes('kidney_disease')) {
    // Lower protein for kidney issues
    var proteinRatio = 0.15;
    var carbRatio = 0.60;
    var fatRatio = 0.25;
  } else {
    // Standard ratios
    var proteinRatio = 0.25;
    var carbRatio = 0.45;
    var fatRatio = 0.30;
  }

  // Adjust for specific goals
  if (fitnessGoals.includes('gain_muscle')) {
    proteinRatio = Math.max(proteinRatio, 0.30);
    carbRatio = 0.40;
    fatRatio = 0.30;
  } else if (fitnessGoals.includes('lose_weight')) {
    proteinRatio = Math.max(proteinRatio, 0.30);
    carbRatio = 0.35;
    fatRatio = 0.35;
  }

  // Ensure minimum calories
  tdee = Math.max(tdee, 1200);

  const calories = Math.round(tdee);
  const protein = Math.round((calories * proteinRatio) / 4); // 4 cal per gram
  const carbs = Math.round((calories * carbRatio) / 4); // 4 cal per gram
  const fat = Math.round((calories * fatRatio) / 9); // 9 cal per gram

  return {
    calories,
    protein,
    carbs,
    fat,
    water: 2500, // ml per day
    fiber: Math.round(calories / 1000 * 14), // 14g per 1000 calories
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    region: region,
    medicalAdjustments: getMedicalAdjustments(medicalConditions)
  };
}

// Get medical condition specific adjustments
function getMedicalAdjustments(conditions) {
  const adjustments = [];
  
  if (conditions.includes('diabetes_type1') || conditions.includes('diabetes_type2')) {
    adjustments.push('Low glycemic index foods', 'Complex carbohydrates', 'Regular meal timing');
  }
  
  if (conditions.includes('hypertension')) {
    adjustments.push('Low sodium foods', 'DASH diet principles', 'Potassium-rich foods');
  }
  
  if (conditions.includes('heart_disease')) {
    adjustments.push('Omega-3 rich foods', 'Low saturated fat', 'High fiber foods');
  }
  
  if (conditions.includes('thyroid_hypothyroid')) {
    adjustments.push('Iodine-rich foods', 'Selenium sources', 'Avoid goitrogenic foods');
  }
  
  return adjustments;
}

// Generate comprehensive meal plan based on region and preferences
async function generateComprehensiveMealPlan(answers, nutritionTargets) {
  const region = answers.region || 'mixed';
  const dietaryRestrictions = answers.dietary_restrictions || ['none'];
  const foodPreferences = answers.food_preferences || [];
  const medicalConditions = answers.medical_conditions || ['none'];
  const mealFrequency = parseInt(answers.meal_frequency) || 3;
  const cookingExperience = answers.cooking_experience || 'intermediate';
  const cookingTime = answers.cooking_time || 'moderate';
  const budgetRange = answers.budget_range || 'moderate';
  const kitchenEquipment = answers.kitchen_equipment || [];

  // Create meal distribution based on frequency
  const mealDistribution = distributeMeals(mealFrequency, nutritionTargets.calories);

  // Generate 7-day meal plan
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const mealPlan = {};

  days.forEach((day, dayIndex) => {
    mealPlan[day] = {};
    
    Object.keys(mealDistribution).forEach(mealType => {
      const mealCalories = mealDistribution[mealType];
      const mealProtein = Math.round((mealCalories * 0.25) / 4);
      const mealCarbs = Math.round((mealCalories * 0.45) / 4);
      const mealFat = Math.round((mealCalories * 0.30) / 9);

      mealPlan[day][mealType] = generateRegionalMeal(
        mealType, 
        region, 
        dietaryRestrictions, 
        foodPreferences,
        medicalConditions,
        cookingExperience,
        cookingTime,
        budgetRange,
        kitchenEquipment,
        {
          calories: mealCalories,
          protein: mealProtein,
          carbs: mealCarbs,
          fat: mealFat
        },
        dayIndex
      );
    });
  });

  return mealPlan;
}

// Generate regional specific meals
function generateRegionalMeal(mealType, region, dietaryRestrictions, foodPreferences, medicalConditions, cookingExperience, cookingTime, budgetRange, kitchenEquipment, nutrition, dayIndex) {
  const regionalMeals = getRegionalMealDatabase();
  const regionMeals = regionalMeals[region] || regionalMeals['mixed'];
  const mealOptions = regionMeals[mealType] || [];
  
  // Filter based on dietary restrictions
  let filteredMeals = mealOptions.filter(meal => {
    return dietaryRestrictions.every(restriction => {
      if (restriction === 'none') return true;
      if (restriction === 'vegetarian' && meal.nonVeg) return false;
      if (restriction === 'vegan' && (meal.dairy || meal.eggs || meal.nonVeg)) return false;
      if (restriction === 'gluten_free' && meal.gluten) return false;
      if (restriction === 'dairy_free' && meal.dairy) return false;
      return true;
    });
  });

  // Filter based on medical conditions
  if (medicalConditions.includes('diabetes_type1') || medicalConditions.includes('diabetes_type2')) {
    filteredMeals = filteredMeals.filter(meal => meal.lowGI !== false);
  }
  
  if (medicalConditions.includes('hypertension')) {
    filteredMeals = filteredMeals.filter(meal => meal.lowSodium !== false);
  }

  // Filter based on cooking time
  const timeFilters = {
    'minimal': meal => meal.cookingTime <= 30,
    'moderate': meal => meal.cookingTime <= 60,
    'substantial': meal => meal.cookingTime <= 120,
    'extensive': meal => true
  };
  
  if (timeFilters[cookingTime]) {
    filteredMeals = filteredMeals.filter(timeFilters[cookingTime]);
  }

  // Select meal (rotate through options)
  const selectedMeal = filteredMeals[dayIndex % filteredMeals.length] || filteredMeals[0] || getDefaultMeal(mealType, nutrition);

  return {
    name: selectedMeal.name,
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
    description: selectedMeal.description,
    ingredients: selectedMeal.ingredients,
    instructions: selectedMeal.instructions,
    cookingTime: selectedMeal.cookingTime,
    difficulty: selectedMeal.difficulty,
    cost: selectedMeal.cost,
    region: region,
    tags: selectedMeal.tags || []
  };
}

// Regional meal database
function getRegionalMealDatabase() {
  return {
    north_indian: {
      breakfast: [
        {
          name: 'Aloo Paratha with Curd',
          description: 'Stuffed potato flatbread with yogurt',
          ingredients: ['whole wheat flour', 'potatoes', 'onions', 'spices', 'yogurt'],
          instructions: ['Make dough', 'Prepare potato filling', 'Stuff and roll paratha', 'Cook on tawa', 'Serve with curd'],
          cookingTime: 45,
          difficulty: 'intermediate',
          cost: 'budget',
          dairy: true,
          gluten: true,
          tags: ['traditional', 'filling']
        },
        {
          name: 'Poha with Peanuts',
          description: 'Flattened rice with vegetables and peanuts',
          ingredients: ['poha', 'onions', 'peanuts', 'curry leaves', 'turmeric'],
          instructions: ['Wash poha', 'Sauté vegetables', 'Mix with poha', 'Garnish with peanuts'],
          cookingTime: 20,
          difficulty: 'beginner',
          cost: 'budget',
          gluten: false,
          tags: ['quick', 'light']
        }
      ],
      lunch: [
        {
          name: 'Dal Chawal with Sabzi',
          description: 'Lentil curry with rice and vegetable curry',
          ingredients: ['basmati rice', 'toor dal', 'seasonal vegetables', 'spices'],
          instructions: ['Cook rice', 'Prepare dal', 'Make vegetable curry', 'Serve together'],
          cookingTime: 60,
          difficulty: 'intermediate',
          cost: 'budget',
          tags: ['complete meal', 'nutritious']
        },
        {
          name: 'Rajma Chawal',
          description: 'Kidney bean curry with rice',
          ingredients: ['kidney beans', 'basmati rice', 'onions', 'tomatoes', 'spices'],
          instructions: ['Soak and cook rajma', 'Prepare masala', 'Cook rice', 'Serve together'],
          cookingTime: 90,
          difficulty: 'intermediate',
          cost: 'moderate',
          tags: ['protein-rich', 'comfort food']
        }
      ],
      dinner: [
        {
          name: 'Roti with Dal and Sabzi',
          description: 'Whole wheat bread with lentils and vegetables',
          ingredients: ['whole wheat flour', 'mixed dal', 'seasonal vegetables'],
          instructions: ['Make roti dough', 'Prepare dal', 'Cook vegetables', 'Serve hot'],
          cookingTime: 75,
          difficulty: 'intermediate',
          cost: 'budget',
          gluten: true,
          tags: ['traditional', 'balanced']
        }
      ]
    },
    south_indian: {
      breakfast: [
        {
          name: 'Idli Sambar',
          description: 'Steamed rice cakes with lentil curry',
          ingredients: ['idli batter', 'toor dal', 'vegetables', 'sambar powder'],
          instructions: ['Steam idlis', 'Prepare sambar', 'Serve hot with chutney'],
          cookingTime: 30,
          difficulty: 'intermediate',
          cost: 'budget',
          gluten: false,
          tags: ['fermented', 'healthy']
        },
        {
          name: 'Dosa with Chutney',
          description: 'Crispy rice crepe with coconut chutney',
          ingredients: ['dosa batter', 'coconut', 'green chilies', 'ginger'],
          instructions: ['Prepare chutney', 'Make dosa on tawa', 'Serve hot'],
          cookingTime: 25,
          difficulty: 'intermediate',
          cost: 'budget',
          gluten: false,
          tags: ['crispy', 'traditional']
        }
      ],
      lunch: [
        {
          name: 'Sambar Rice with Rasam',
          description: 'Rice with lentil curry and spiced soup',
          ingredients: ['rice', 'toor dal', 'vegetables', 'tamarind', 'spices'],
          instructions: ['Cook rice', 'Prepare sambar', 'Make rasam', 'Serve together'],
          cookingTime: 60,
          difficulty: 'intermediate',
          cost: 'budget',
          tags: ['complete meal', 'digestive']
        }
      ],
      dinner: [
        {
          name: 'Curd Rice with Pickle',
          description: 'Yogurt rice with South Indian pickle',
          ingredients: ['rice', 'yogurt', 'curry leaves', 'mustard seeds', 'pickle'],
          instructions: ['Cook rice', 'Mix with curd', 'Temper with spices', 'Serve with pickle'],
          cookingTime: 20,
          difficulty: 'beginner',
          cost: 'budget',
          dairy: true,
          tags: ['cooling', 'probiotic']
        }
      ]
    },
    west_indian: {
      breakfast: [
        {
          name: 'Dhokla',
          description: 'Steamed gram flour cake',
          ingredients: ['gram flour', 'yogurt', 'ginger-green chili paste', 'eno'],
          instructions: ['Make batter', 'Steam in dhokla pan', 'Temper and serve'],
          cookingTime: 35,
          difficulty: 'intermediate',
          cost: 'budget',
          gluten: false,
          tags: ['steamed', 'light']
        }
      ],
      lunch: [
        {
          name: 'Gujarati Thali',
          description: 'Complete Gujarati meal with dal, sabzi, roti',
          ingredients: ['various lentils', 'vegetables', 'whole wheat flour', 'jaggery'],
          instructions: ['Prepare multiple dishes', 'Serve in thali style'],
          cookingTime: 120,
          difficulty: 'advanced',
          cost: 'moderate',
          tags: ['complete meal', 'variety']
        }
      ]
    },
    east_indian: {
      breakfast: [
        {
          name: 'Luchi with Aloo Dum',
          description: 'Fried bread with spiced potatoes',
          ingredients: ['refined flour', 'potatoes', 'panch phoron', 'oil'],
          instructions: ['Make luchi dough', 'Fry luchis', 'Prepare aloo dum', 'Serve hot'],
          cookingTime: 45,
          difficulty: 'intermediate',
          cost: 'moderate',
          gluten: true,
          tags: ['fried', 'festive']
        }
      ],
      lunch: [
        {
          name: 'Fish Curry with Rice',
          description: 'Bengali fish curry with steamed rice',
          ingredients: ['fish', 'mustard oil', 'panch phoron', 'rice'],
          instructions: ['Marinate fish', 'Prepare curry', 'Cook rice', 'Serve together'],
          cookingTime: 60,
          difficulty: 'intermediate',
          cost: 'moderate',
          nonVeg: true,
          tags: ['traditional', 'flavorful']
        }
      ]
    },
    mixed: {
      breakfast: [
        {
          name: 'Oats Upma',
          description: 'Healthy oats cooked with vegetables',
          ingredients: ['oats', 'mixed vegetables', 'mustard seeds', 'curry leaves'],
          instructions: ['Roast oats', 'Sauté vegetables', 'Mix and cook', 'Serve hot'],
          cookingTime: 20,
          difficulty: 'beginner',
          cost: 'budget',
          gluten: false,
          tags: ['healthy', 'quick']
        }
      ],
      lunch: [
        {
          name: 'Quinoa Bowl',
          description: 'Nutritious quinoa with vegetables and protein',
          ingredients: ['quinoa', 'mixed vegetables', 'protein source', 'herbs'],
          instructions: ['Cook quinoa', 'Prepare vegetables', 'Combine and season'],
          cookingTime: 30,
          difficulty: 'beginner',
          cost: 'premium',
          gluten: false,
          tags: ['modern', 'nutritious']
        }
      ],
      dinner: [
        {
          name: 'Grilled Protein with Salad',
          description: 'Grilled protein with fresh vegetable salad',
          ingredients: ['protein source', 'mixed greens', 'vegetables', 'dressing'],
          instructions: ['Grill protein', 'Prepare salad', 'Make dressing', 'Serve together'],
          cookingTime: 25,
          difficulty: 'beginner',
          cost: 'moderate',
          tags: ['light', 'protein-rich']
        }
      ]
    }
  };
}

// Helper function to distribute calories across meals
function distributeMeals(frequency, totalCalories) {
  const distributions = {
    2: { // 2 meals
      breakfast: Math.round(totalCalories * 0.4),
      dinner: Math.round(totalCalories * 0.6)
    },
    3: { // 3 meals
      breakfast: Math.round(totalCalories * 0.25),
      lunch: Math.round(totalCalories * 0.35),
      dinner: Math.round(totalCalories * 0.40)
    },
    4: { // 4 meals
      breakfast: Math.round(totalCalories * 0.25),
      lunch: Math.round(totalCalories * 0.30),
      snack: Math.round(totalCalories * 0.15),
      dinner: Math.round(totalCalories * 0.30)
    },
    5: { // 5 meals
      breakfast: Math.round(totalCalories * 0.20),
      morning_snack: Math.round(totalCalories * 0.15),
      lunch: Math.round(totalCalories * 0.25),
      afternoon_snack: Math.round(totalCalories * 0.15),
      dinner: Math.round(totalCalories * 0.25)
    },
    6: { // 6 meals
      breakfast: Math.round(totalCalories * 0.20),
      morning_snack: Math.round(totalCalories * 0.10),
      lunch: Math.round(totalCalories * 0.25),
      afternoon_snack: Math.round(totalCalories * 0.10),
      dinner: Math.round(totalCalories * 0.25),
      evening_snack: Math.round(totalCalories * 0.10)
    }
  };

  return distributions[frequency] || distributions[3];
}

// Default meal fallback
function getDefaultMeal(mealType, nutrition) {
  const defaults = {
    breakfast: {
      name: 'Healthy Breakfast Bowl',
      description: 'Nutritious breakfast with balanced macros',
      ingredients: ['oats', 'fruits', 'nuts', 'milk'],
      instructions: ['Combine ingredients', 'Mix well', 'Serve fresh'],
      cookingTime: 10,
      difficulty: 'beginner',
      cost: 'budget'
    },
    lunch: {
      name: 'Balanced Lunch Plate',
      description: 'Complete meal with protein, carbs, and vegetables',
      ingredients: ['protein source', 'whole grains', 'vegetables'],
      instructions: ['Cook protein', 'Prepare grains', 'Steam vegetables', 'Serve together'],
      cookingTime: 45,
      difficulty: 'intermediate',
      cost: 'moderate'
    },
    dinner: {
      name: 'Light Dinner',
      description: 'Easy to digest evening meal',
      ingredients: ['lean protein', 'vegetables', 'light carbs'],
      instructions: ['Prepare protein', 'Cook vegetables', 'Serve with carbs'],
      cookingTime: 30,
      difficulty: 'beginner',
      cost: 'moderate'
    }
  };

  return defaults[mealType] || defaults.lunch;
}

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