// Google Generative AI removed for deployment simplicity

class GeminiNutritionService {
    constructor() {
        this.genAI = new GoogleGenerativeAI('AIzaSyD45XTxnGs-dmlN_0LtMLyCy0CbfDqfcG4');
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    // Get accurate nutrition data using Gemini AI
    async getNutritionData(foodItem, quantity = 100, unit = 'grams') {
        const prompt = `
        Provide accurate nutrition data for ${quantity}${unit} of ${foodItem}.
        Return ONLY a JSON object with this exact format:
        {
            "calories": number,
            "protein": number,
            "carbs": number,
            "fat": number,
            "fiber": number,
            "sugar": number,
            "sodium": number,
            "vitamins": {"A": number, "C": number, "D": number},
            "minerals": {"calcium": number, "iron": number},
            "source": "Gemini AI"
        }
        
        Use USDA nutrition database standards. Be precise with numbers.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return null;
        } catch (error) {
            console.error('Gemini nutrition lookup error:', error);
            return null;
        }
    }

    // Generate accurate meal plan with Gemini AI
    async generateMealPlan(userProfile) {
        const prompt = `
        Create a 7-day meal plan for:
        - Age: ${userProfile.age}
        - Gender: ${userProfile.gender}
        - Weight: ${userProfile.weight}kg
        - Height: ${userProfile.height}cm
        - Activity: ${userProfile.activityLevel}
        - Goal: ${userProfile.goal}
        - Dietary restrictions: ${userProfile.dietaryRestrictions?.join(', ') || 'None'}
        - Medical conditions: ${userProfile.medicalConditions?.join(', ') || 'None'}

        Return ONLY a JSON object with accurate nutrition data:
        {
            "nutritionTargets": {
                "calories": number,
                "protein": number,
                "carbs": number,
                "fat": number
            },
            "mealPlan": {
                "monday": {
                    "breakfast": {"name": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "ingredients": ["string"], "instructions": "string"},
                    "lunch": {...},
                    "dinner": {...},
                    "snacks": {...}
                },
                // ... for all 7 days
            }
        }

        Use real foods with accurate USDA nutrition values. Ensure daily totals match targets within 5%.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return null;
        } catch (error) {
            console.error('Gemini meal plan error:', error);
            return null;
        }
    }

    // AI nutrition chat with accurate data
    async chatNutrition(message, context = {}) {
        const prompt = `
        You are a professional nutritionist AI. Answer this question with accurate, science-based information:
        "${message}"
        
        Context: ${JSON.stringify(context)}
        
        Provide accurate nutrition facts, cite reliable sources when possible, and give practical advice.
        If asked about specific foods, provide exact nutrition values per 100g using USDA standards.
        
        Format response as JSON:
        {
            "response": "detailed answer",
            "nutritionFacts": {...} (if applicable),
            "suggestions": [{"action": "string", "label": "string", "data": "string"}]
        }
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return { response: text, suggestions: [] };
        } catch (error) {
            console.error('Gemini chat error:', error);
            return { response: "I'm having trouble processing your request. Please try again.", suggestions: [] };
        }
    }

    // Generate accurate recipe with nutrition
    async generateRecipe(dishName, dietaryRestrictions = []) {
        const prompt = `
        Create a detailed recipe for "${dishName}" with dietary restrictions: ${dietaryRestrictions.join(', ') || 'None'}.
        
        Return ONLY JSON:
        {
            "name": "string",
            "servings": number,
            "prepTime": number,
            "cookTime": number,
            "ingredients": [{"name": "string", "quantity": number, "unit": "string"}],
            "instructions": ["step1", "step2", ...],
            "nutrition": {
                "calories": number,
                "protein": number,
                "carbs": number,
                "fat": number,
                "fiber": number
            },
            "tips": ["string"]
        }
        
        Use accurate nutrition calculations based on ingredient quantities. Ensure nutrition adds up correctly.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return null;
        } catch (error) {
            console.error('Gemini recipe error:', error);
            return null;
        }
    }

    // Analyze meal nutrition accuracy
    async analyzeMealNutrition(mealDescription) {
        const prompt = `
        Analyze the nutrition content of this meal: "${mealDescription}"
        
        Provide detailed breakdown and health assessment:
        {
            "analysis": "detailed nutrition analysis",
            "calories": number,
            "macros": {"protein": number, "carbs": number, "fat": number},
            "micronutrients": {"vitamins": {}, "minerals": {}},
            "healthScore": number (1-10),
            "recommendations": ["string"],
            "warnings": ["string"] (if any)
        }
        
        Base calculations on USDA nutrition data. Be accurate and specific.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return null;
        } catch (error) {
            console.error('Gemini analysis error:', error);
            return null;
        }
    }
}

module.exports = new GeminiNutritionService();