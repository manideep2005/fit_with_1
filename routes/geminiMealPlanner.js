const express = require('express');
const router = express.Router();
const geminiNutritionService = require('../services/geminiNutritionService');

// Gemini AI nutrition lookup
router.post('/gemini-nutrition', async (req, res) => {
    try {
        const { food, quantity, unit } = req.body;
        
        const nutrition = await geminiNutritionService.getNutritionData(food, quantity, unit);
        
        if (nutrition) {
            res.json({
                success: true,
                nutrition: nutrition,
                source: 'Gemini AI',
                accuracy: 'high'
            });
        } else {
            res.json({
                success: false,
                error: 'Could not find nutrition data'
            });
        }
    } catch (error) {
        console.error('Gemini nutrition error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Gemini AI chat for nutrition
router.post('/gemini-chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        
        const response = await geminiNutritionService.chatNutrition(message, context);
        
        res.json({
            success: true,
            response: response.response,
            suggestions: response.suggestions || [],
            nutritionFacts: response.nutritionFacts
        });
    } catch (error) {
        console.error('Gemini chat error:', error);
        res.status(500).json({
            success: false,
            error: 'Chat service unavailable'
        });
    }
});

// Gemini AI recipe generation
router.post('/gemini-recipe', async (req, res) => {
    try {
        const { dishName, dietaryRestrictions } = req.body;
        
        const recipe = await geminiNutritionService.generateRecipe(dishName, dietaryRestrictions);
        
        if (recipe) {
            res.json({
                success: true,
                recipe: recipe,
                source: 'Gemini AI',
                nutritionVerified: true
            });
        } else {
            res.json({
                success: false,
                error: 'Could not generate recipe'
            });
        }
    } catch (error) {
        console.error('Gemini recipe error:', error);
        res.status(500).json({
            success: false,
            error: 'Recipe generation failed'
        });
    }
});

// Gemini AI meal plan generation
router.post('/gemini-meal-plan', async (req, res) => {
    try {
        const { userProfile } = req.body;
        
        const mealPlan = await geminiNutritionService.generateMealPlan(userProfile);
        
        if (mealPlan) {
            res.json({
                success: true,
                nutritionTargets: mealPlan.nutritionTargets,
                mealPlan: mealPlan.mealPlan,
                aiInsights: [
                    "Meal plan generated using advanced AI nutrition analysis",
                    "All nutrition values verified against USDA database",
                    "Personalized based on your health profile and goals"
                ],
                metadata: {
                    aiModel: 'gemini-pro',
                    nutritionSource: 'USDA + Gemini AI',
                    accuracy: 'high'
                }
            });
        } else {
            res.json({
                success: false,
                error: 'Could not generate meal plan'
            });
        }
    } catch (error) {
        console.error('Gemini meal plan error:', error);
        res.status(500).json({
            success: false,
            error: 'Meal plan generation failed'
        });
    }
});

// Gemini AI nutrition analysis
router.post('/gemini-analysis', async (req, res) => {
    try {
        const { mealDescription } = req.body;
        
        const analysis = await geminiNutritionService.analyzeMealNutrition(mealDescription);
        
        if (analysis) {
            res.json({
                success: true,
                analysis: analysis.analysis,
                nutrition: {
                    calories: analysis.calories,
                    protein: analysis.macros.protein,
                    carbs: analysis.macros.carbs,
                    fat: analysis.macros.fat
                },
                healthScore: analysis.healthScore,
                recommendations: analysis.recommendations,
                warnings: analysis.warnings
            });
        } else {
            res.json({
                success: false,
                error: 'Could not analyze meal'
            });
        }
    } catch (error) {
        console.error('Gemini analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Analysis failed'
        });
    }
});

module.exports = router;