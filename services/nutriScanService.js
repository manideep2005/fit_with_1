const fetch = require('node-fetch');

class NutriScanService {
  constructor() {
   
    this.openFoodFactsBaseUrl = 'https://world.openfoodfacts.org/api/v0/product';
   
    this.fallbackNutritionData = {
   
      '8901030895559': { // Example: Maggi Noodles
        product_name: 'Maggi 2-Minute Noodles',
        brands: 'Maggi',
        nutriments: {
          'energy-kcal_100g': 444,
          'proteins_100g': 9.8,
          'carbohydrates_100g': 60.1,
          'fat_100g': 17.1,
          'fiber_100g': 3.2,
          'sodium_100g': 1.2,
          'sugars_100g': 2.5
        },
        serving_size: '70g',
        categories: 'Instant noodles'
      },
      '8901030827365': { // Example: Britannia Biscuits
        product_name: 'Britannia Good Day Cookies',
        brands: 'Britannia',
        nutriments: {
          'energy-kcal_100g': 480,
          'proteins_100g': 7.5,
          'carbohydrates_100g': 65.2,
          'fat_100g': 20.8,
          'fiber_100g': 2.1,
          'sodium_100g': 0.8,
          'sugars_100g': 25.3
        },
        serving_size: '100g',
        categories: 'Biscuits and cookies'
      },
      '8901030827372': { // Example: Amul Milk
        product_name: 'Amul Toned Milk',
        brands: 'Amul',
        nutriments: {
          'energy-kcal_100g': 58,
          'proteins_100g': 3.2,
          'carbohydrates_100g': 4.7,
          'fat_100g': 3.0,
          'fiber_100g': 0,
          'sodium_100g': 0.05,
          'sugars_100g': 4.7
        },
        serving_size: '250ml',
        categories: 'Dairy products'
      }
    };
  }

  /**
   * Get nutrition information for a product by barcode
   * @param {string} barcode - The product barcode
   * @returns {Promise<Object>} Nutrition information
   */
  async getNutritionByBarcode(barcode) {
    try {
      console.log(`Fetching nutrition data for barcode: ${barcode}`);
      
      // First try OpenFoodFacts API
      const nutritionData = await this.fetchFromOpenFoodFacts(barcode);
      
      if (nutritionData && nutritionData.status === 1) {
        return this.formatNutritionData(nutritionData.product);
      }
      
      // If not found in OpenFoodFacts, try fallback data
      const fallbackData = this.fallbackNutritionData[barcode];
      if (fallbackData) {
        console.log(`Using fallback data for barcode: ${barcode}`);
        return this.formatNutritionData(fallbackData);
      }
      
      // If no data found, return null
      console.log(`No nutrition data found for barcode: ${barcode}`);
      return null;
      
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
      
      // Try fallback data on error
      const fallbackData = this.fallbackNutritionData[barcode];
      if (fallbackData) {
        console.log(`Using fallback data due to error for barcode: ${barcode}`);
        return this.formatNutritionData(fallbackData);
      }
      
      throw error;
    }
  }

  /**
   * Fetch nutrition data from OpenFoodFacts API
   * @param {string} barcode - The product barcode
   * @returns {Promise<Object>} API response
   */
  async fetchFromOpenFoodFacts(barcode) {
    const url = `${this.openFoodFactsBaseUrl}/${barcode}.json`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'FitWithAI-NutriScan/1.0 (https://fitwith.ai)',
        'Accept': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`OpenFoodFacts API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Format nutrition data into a consistent structure
   * @param {Object} product - Raw product data
   * @returns {Object} Formatted nutrition data
   */
  formatNutritionData(product) {
    if (!product) return null;

    const nutriments = product.nutriments || {};
    
    return {
      barcode: product.code || product._id,
      productName: product.product_name || 'Unknown Product',
      brand: product.brands || 'Unknown Brand',
      category: product.categories || 'Food',
      servingSize: product.serving_size || '100g',
      imageUrl: product.image_url || product.image_front_url || null,
      
      // Nutrition per 100g
      nutritionPer100g: {
        calories: this.safeParseFloat(nutriments['energy-kcal_100g']) || 0,
        protein: this.safeParseFloat(nutriments['proteins_100g']) || 0,
        carbohydrates: this.safeParseFloat(nutriments['carbohydrates_100g']) || 0,
        fat: this.safeParseFloat(nutriments['fat_100g']) || 0,
        fiber: this.safeParseFloat(nutriments['fiber_100g']) || 0,
        sodium: this.safeParseFloat(nutriments['sodium_100g']) || 0,
        sugar: this.safeParseFloat(nutriments['sugars_100g']) || 0,
        saturatedFat: this.safeParseFloat(nutriments['saturated-fat_100g']) || 0,
        cholesterol: this.safeParseFloat(nutriments['cholesterol_100g']) || 0,
        calcium: this.safeParseFloat(nutriments['calcium_100g']) || 0,
        iron: this.safeParseFloat(nutriments['iron_100g']) || 0,
        vitaminC: this.safeParseFloat(nutriments['vitamin-c_100g']) || 0
      },
      
      // Additional product information
      ingredients: product.ingredients_text || '',
      allergens: product.allergens || '',
      nutritionGrade: product.nutrition_grades || null,
      novaGroup: product.nova_group || null,
      
      // Timestamps
      scannedAt: new Date(),
      lastUpdated: product.last_modified_t ? new Date(product.last_modified_t * 1000) : new Date()
    };
  }

  /**
   * Calculate nutrition for a specific serving size
   * @param {Object} nutritionData - Formatted nutrition data
   * @param {number} servingGrams - Serving size in grams
   * @returns {Object} Nutrition for the specific serving
   */
  calculateServingNutrition(nutritionData, servingGrams = 100) {
    if (!nutritionData || !nutritionData.nutritionPer100g) {
      return null;
    }

    const multiplier = servingGrams / 100;
    const per100g = nutritionData.nutritionPer100g;

    return {
      servingSize: `${servingGrams}g`,
      calories: Math.round(per100g.calories * multiplier),
      protein: Math.round(per100g.protein * multiplier * 10) / 10,
      carbohydrates: Math.round(per100g.carbohydrates * multiplier * 10) / 10,
      fat: Math.round(per100g.fat * multiplier * 10) / 10,
      fiber: Math.round(per100g.fiber * multiplier * 10) / 10,
      sodium: Math.round(per100g.sodium * multiplier * 1000) / 1000, // Keep in grams
      sugar: Math.round(per100g.sugar * multiplier * 10) / 10,
      saturatedFat: Math.round(per100g.saturatedFat * multiplier * 10) / 10,
      cholesterol: Math.round(per100g.cholesterol * multiplier * 10) / 10,
      calcium: Math.round(per100g.calcium * multiplier * 10) / 10,
      iron: Math.round(per100g.iron * multiplier * 10) / 10,
      vitaminC: Math.round(per100g.vitaminC * multiplier * 10) / 10
    };
  }

  /**
   * Search for products by name (for manual entry)
   * @param {string} query - Search query
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} Array of product results
   */
  async searchProducts(query, limit = 10) {
    try {
      const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}`;
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'FitWithAI-NutriScan/1.0 (https://fitwith.ai)',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.products && data.products.length > 0) {
        return data.products.map(product => this.formatNutritionData(product)).filter(p => p !== null);
      }

      return [];
      
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  /**
   * Get popular/trending food products
   * @returns {Array} Array of popular products
   */
  getPopularProducts() {
    return Object.keys(this.fallbackNutritionData).map(barcode => {
      const product = this.fallbackNutritionData[barcode];
      return this.formatNutritionData({ ...product, code: barcode });
    });
  }

  /**
   * Validate barcode format
   * @param {string} barcode - Barcode to validate
   * @returns {boolean} Whether barcode is valid
   */
  validateBarcode(barcode) {
    if (!barcode || typeof barcode !== 'string') {
      return false;
    }

    // Remove any spaces or special characters
    const cleanBarcode = barcode.replace(/\D/g, '');
    
    // Check length (most barcodes are 8, 12, 13, or 14 digits)
    const validLengths = [8, 12, 13, 14];
    return validLengths.includes(cleanBarcode.length);
  }

  /**
   * Safely parse float values
   * @param {any} value - Value to parse
   * @returns {number} Parsed float or 0
   */
  safeParseFloat(value) {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Add more fallback nutrition data
   * @param {string} barcode - Product barcode
   * @param {Object} nutritionData - Nutrition data to add
   */
  addFallbackData(barcode, nutritionData) {
    this.fallbackNutritionData[barcode] = nutritionData;
  }

  /**
   * Get nutrition recommendations based on user goals
   * @param {Object} userGoals - User's fitness goals
   * @param {Object} nutritionData - Product nutrition data
   * @returns {Object} Recommendations and warnings
   */
  getNutritionRecommendations(userGoals, nutritionData) {
    const recommendations = {
      suitable: true,
      warnings: [],
      suggestions: [],
      score: 100 // Out of 100
    };

    if (!nutritionData || !nutritionData.nutritionPer100g) {
      return recommendations;
    }

    const nutrition = nutritionData.nutritionPer100g;

    // Check based on user goals
    if (userGoals && userGoals.primaryGoal) {
      switch (userGoals.primaryGoal) {
        case 'weight-loss':
          if (nutrition.calories > 300) {
            recommendations.warnings.push('High calorie content - consume in moderation');
            recommendations.score -= 20;
          }
          if (nutrition.fat > 15) {
            recommendations.warnings.push('High fat content');
            recommendations.score -= 15;
          }
          if (nutrition.sugar > 10) {
            recommendations.warnings.push('High sugar content');
            recommendations.score -= 15;
          }
          break;

        case 'muscle-gain':
          if (nutrition.protein < 10) {
            recommendations.suggestions.push('Consider pairing with protein-rich foods');
            recommendations.score -= 10;
          }
          if (nutrition.protein > 20) {
            recommendations.suggestions.push('Great protein source for muscle building');
          }
          break;

        case 'general-fitness':
          if (nutrition.fiber > 5) {
            recommendations.suggestions.push('Good fiber content for digestive health');
          }
          if (nutrition.sodium > 1.5) {
            recommendations.warnings.push('High sodium content');
            recommendations.score -= 10;
          }
          break;
      }
    }

  
    if (nutrition.saturatedFat > 5) {
      recommendations.warnings.push('High saturated fat content');
      recommendations.score -= 10;
    }

    if (nutrition.fiber > 3) {
      recommendations.suggestions.push('Good source of dietary fiber');
    }

    if (nutrition.protein > 15) {
      recommendations.suggestions.push('High protein content');
    }

    // Set suitability based on score
    recommendations.suitable = recommendations.score >= 60;

    return recommendations;
  }
}

module.exports = new NutriScanService();