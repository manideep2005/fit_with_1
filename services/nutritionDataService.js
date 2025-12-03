const axios = require('axios');

class NutritionDataService {
    constructor() {
        this.usdaApiKey = process.env.USDA_API_KEY;
        this.edamamAppId = process.env.EDAMAM_APP_ID;
        this.edamamAppKey = process.env.EDAMAM_APP_KEY;
        this.spoonacularApiKey = process.env.SPOONACULAR_API_KEY;
    }

    // Get nutrition data from USDA FoodData Central
    async getUSDANutrition(foodName, quantity = 100) {
        try {
            const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&api_key=${this.usdaApiKey}`;
            const searchResponse = await axios.get(searchUrl);
            
            if (searchResponse.data.foods && searchResponse.data.foods.length > 0) {
                const food = searchResponse.data.foods[0];
                const nutrients = food.foodNutrients;
                
                return this.parseUSDANutrients(nutrients, quantity);
            }
            return null;
        } catch (error) {
            console.error('USDA API error:', error);
            return null;
        }
    }

    // Get nutrition data from Edamam
    async getEdamamNutrition(foodName, quantity = 100) {
        try {
            const url = `https://api.edamam.com/api/nutrition-data/v2/nutrients?app_id=${this.edamamAppId}&app_key=${this.edamamAppKey}`;
            
            const response = await axios.post(url, {
                ingredients: [`${quantity}g ${foodName}`]
            });

            if (response.data && response.data.calories) {
                return {
                    calories: Math.round(response.data.calories),
                    protein: Math.round(response.data.totalNutrients?.PROCNT?.quantity || 0),
                    carbs: Math.round(response.data.totalNutrients?.CHOCDF?.quantity || 0),
                    fat: Math.round(response.data.totalNutrients?.FAT?.quantity || 0),
                    fiber: Math.round(response.data.totalNutrients?.FIBTG?.quantity || 0),
                    sugar: Math.round(response.data.totalNutrients?.SUGAR?.quantity || 0),
                    sodium: Math.round(response.data.totalNutrients?.NA?.quantity || 0),
                    source: 'Edamam'
                };
            }
            return null;
        } catch (error) {
            console.error('Edamam API error:', error);
            return null;
        }
    }

    // Get comprehensive nutrition data with fallbacks
    async getNutritionData(foodName, quantity = 100, unit = 'grams') {
        // Convert to grams if needed
        const quantityInGrams = this.convertToGrams(quantity, unit);
        
        // Try multiple sources for accuracy
        let nutrition = await this.getEdamamNutrition(foodName, quantityInGrams);
        
        if (!nutrition) {
            nutrition = await this.getUSDANutrition(foodName, quantityInGrams);
        }
        
        if (!nutrition) {
            nutrition = await this.getSpoonacularNutrition(foodName, quantityInGrams);
        }
        
        return nutrition;
    }

    // Parse USDA nutrients format
    parseUSDANutrients(nutrients, quantity) {
        const nutrientMap = {
            208: 'calories',    // Energy
            203: 'protein',     // Protein
            205: 'carbs',       // Carbohydrate
            204: 'fat',         // Total lipid (fat)
            291: 'fiber',       // Fiber
            269: 'sugar',       // Sugars
            307: 'sodium'       // Sodium
        };

        const result = {
            calories: 0, protein: 0, carbs: 0, fat: 0,
            fiber: 0, sugar: 0, sodium: 0, source: 'USDA'
        };

        nutrients.forEach(nutrient => {
            const key = nutrientMap[nutrient.nutrientId];
            if (key) {
                result[key] = Math.round((nutrient.value * quantity) / 100);
            }
        });

        return result;
    }

    // Convert different units to grams
    convertToGrams(quantity, unit) {
        const conversions = {
            'grams': 1,
            'g': 1,
            'kg': 1000,
            'oz': 28.35,
            'lb': 453.59,
            'cup': 240,     // approximate for liquids
            'tbsp': 15,
            'tsp': 5
        };

        return quantity * (conversions[unit.toLowerCase()] || 1);
    }

    // Get Spoonacular nutrition (fallback)
    async getSpoonacularNutrition(foodName, quantity) {
        try {
            const url = `https://api.spoonacular.com/food/ingredients/search?query=${encodeURIComponent(foodName)}&apiKey=${this.spoonacularApiKey}`;
            const response = await axios.get(url);
            
            if (response.data.results && response.data.results.length > 0) {
                const ingredient = response.data.results[0];
                const nutritionUrl = `https://api.spoonacular.com/food/ingredients/${ingredient.id}/information?amount=${quantity}&unit=grams&apiKey=${this.spoonacularApiKey}`;
                
                const nutritionResponse = await axios.get(nutritionUrl);
                const nutrition = nutritionResponse.data.nutrition;
                
                return {
                    calories: Math.round(nutrition.nutrients.find(n => n.name === 'Calories')?.amount || 0),
                    protein: Math.round(nutrition.nutrients.find(n => n.name === 'Protein')?.amount || 0),
                    carbs: Math.round(nutrition.nutrients.find(n => n.name === 'Carbohydrates')?.amount || 0),
                    fat: Math.round(nutrition.nutrients.find(n => n.name === 'Fat')?.amount || 0),
                    fiber: Math.round(nutrition.nutrients.find(n => n.name === 'Fiber')?.amount || 0),
                    sugar: Math.round(nutrition.nutrients.find(n => n.name === 'Sugar')?.amount || 0),
                    sodium: Math.round(nutrition.nutrients.find(n => n.name === 'Sodium')?.amount || 0),
                    source: 'Spoonacular'
                };
            }
            return null;
        } catch (error) {
            console.error('Spoonacular API error:', error);
            return null;
        }
    }

    // Validate nutrition data accuracy
    validateNutritionData(nutrition) {
        const checks = {
            hasCalories: nutrition.calories > 0,
            macrosAddUp: (nutrition.protein * 4 + nutrition.carbs * 4 + nutrition.fat * 9) <= (nutrition.calories * 1.2),
            reasonableValues: nutrition.protein <= 100 && nutrition.carbs <= 100 && nutrition.fat <= 100
        };

        return {
            isValid: Object.values(checks).every(check => check),
            checks: checks,
            confidence: Object.values(checks).filter(check => check).length / Object.keys(checks).length
        };
    }
}

module.exports = new NutritionDataService();