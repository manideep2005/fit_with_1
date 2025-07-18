const express = require('express');
const router = express.Router();
const smartMealPlannerService = require('../services/smartMealPlannerService');

// Get health assessment questions
router.get('/health-questions', (req, res) => {
    try {
        const questions = smartMealPlannerService.getHealthQuestions();
        res.json({
            success: true,
            questions: questions
        });
    } catch (error) {
        console.error('Error getting health questions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get health questions'
        });
    }
});

// Generate personalized meal plan
router.post('/generate', async (req, res) => {
    try {
        const { healthData } = req.body;
        const userId = req.session.user._id;

        if (!healthData) {
            return res.status(400).json({
                success: false,
                error: 'Health data is required'
            });
        }

        console.log('Generating meal plan for user:', userId);
        console.log('Health data received:', healthData);

        // Generate meal plan using the smart service
        const result = await smartMealPlannerService.generateMealPlan(userId, healthData);

        if (result.success) {
            res.json({
                success: true,
                mealPlan: result.mealPlan
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('Error generating meal plan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate meal plan'
        });
    }
});

// Get user's current meal plan
router.get('/current', async (req, res) => {
    try {
        const userId = req.session.user._id;
        const UserService = require('../services/userService');
        
        const user = await UserService.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get the most recent active meal plan
        const activeMealPlan = user.mealPlans?.find(plan => plan.isActive);

        if (activeMealPlan) {
            res.json({
                success: true,
                mealPlan: activeMealPlan
            });
        } else {
            res.json({
                success: false,
                error: 'No active meal plan found'
            });
        }

    } catch (error) {
        console.error('Error getting current meal plan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get current meal plan'
        });
    }
});

// Update meal plan preferences
router.put('/preferences', async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { preferences } = req.body;
        const UserService = require('../services/userService');

        if (!preferences) {
            return res.status(400).json({
                success: false,
                error: 'Preferences are required'
            });
        }

        const user = await UserService.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Update user preferences
        user.preferences = { ...user.preferences, ...preferences };
        await user.save();

        res.json({
            success: true,
            message: 'Preferences updated successfully',
            preferences: user.preferences
        });

    } catch (error) {
        console.error('Error updating meal plan preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update preferences'
        });
    }
});

// Get meal suggestions based on current nutrition
router.get('/suggestions', async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { mealType, currentNutrition } = req.query;
        const UserService = require('../services/userService');

        const user = await UserService.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get user's active meal plan
        const activeMealPlan = user.mealPlans?.find(plan => plan.isActive);
        
        if (!activeMealPlan) {
            return res.status(404).json({
                success: false,
                error: 'No active meal plan found'
            });
        }

        // Generate suggestions based on current nutrition and goals
        const suggestions = generateMealSuggestions(
            activeMealPlan.healthProfile,
            activeMealPlan.nutritionTargets,
            mealType,
            currentNutrition ? JSON.parse(currentNutrition) : null
        );

        res.json({
            success: true,
            suggestions: suggestions
        });

    } catch (error) {
        console.error('Error getting meal suggestions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get meal suggestions'
        });
    }
});

// Helper function to generate meal suggestions
function generateMealSuggestions(healthProfile, nutritionTargets, mealType, currentNutrition) {
    const suggestions = [];
    
    // Calculate remaining nutrition needs
    const remaining = {
        calories: nutritionTargets.targetCalories - (currentNutrition?.calories || 0),
        protein: nutritionTargets.macros.protein - (currentNutrition?.protein || 0),
        carbs: nutritionTargets.macros.carbs - (currentNutrition?.carbs || 0),
        fat: nutritionTargets.macros.fat - (currentNutrition?.fat || 0)
    };

    // Base suggestions by meal type
    const baseSuggestions = {
        breakfast: [
            {
                name: 'Protein Oatmeal',
                calories: 300,
                protein: 20,
                carbs: 40,
                fat: 8,
                reason: 'High protein start to your day'
            },
            {
                name: 'Greek Yogurt Parfait',
                calories: 250,
                protein: 18,
                carbs: 25,
                fat: 6,
                reason: 'Probiotics and protein for digestive health'
            }
        ],
        lunch: [
            {
                name: 'Grilled Chicken Salad',
                calories: 350,
                protein: 30,
                carbs: 15,
                fat: 18,
                reason: 'Lean protein with healthy fats'
            },
            {
                name: 'Quinoa Buddha Bowl',
                calories: 400,
                protein: 16,
                carbs: 55,
                fat: 12,
                reason: 'Complete plant-based nutrition'
            }
        ],
        dinner: [
            {
                name: 'Baked Salmon with Vegetables',
                calories: 450,
                protein: 35,
                carbs: 20,
                fat: 25,
                reason: 'Omega-3 rich for recovery'
            },
            {
                name: 'Lean Beef Stir-fry',
                calories: 380,
                protein: 28,
                carbs: 30,
                fat: 15,
                reason: 'Iron and protein for muscle building'
            }
        ],
        snack: [
            {
                name: 'Mixed Nuts',
                calories: 180,
                protein: 6,
                carbs: 8,
                fat: 15,
                reason: 'Healthy fats for sustained energy'
            },
            {
                name: 'Apple with Almond Butter',
                calories: 200,
                protein: 8,
                carbs: 20,
                fat: 12,
                reason: 'Natural sugars with protein'
            }
        ]
    };

    // Get base suggestions for meal type
    const mealSuggestions = baseSuggestions[mealType] || baseSuggestions.snack;

    // Filter and customize based on health profile and remaining nutrition
    mealSuggestions.forEach(suggestion => {
        // Adjust for dietary preferences
        if (healthProfile.dietaryPreferences === 'vegetarian' && 
            (suggestion.name.includes('Chicken') || suggestion.name.includes('Beef') || suggestion.name.includes('Salmon'))) {
            return; // Skip non-vegetarian options
        }

        // Adjust for medical conditions
        if (healthProfile.medicalConditions?.includes('diabetes_type2') && suggestion.carbs > 30) {
            suggestion.carbs = Math.round(suggestion.carbs * 0.7);
            suggestion.calories = Math.round(suggestion.calories * 0.9);
            suggestion.reason += ' (adjusted for diabetes management)';
        }

        // Adjust for remaining nutrition needs
        if (remaining.protein > 20 && suggestion.protein < 15) {
            suggestion.reason = 'Boost protein intake to meet daily goals';
        }

        suggestions.push(suggestion);
    });

    return suggestions.slice(0, 4); // Return top 4 suggestions
}

module.exports = router;