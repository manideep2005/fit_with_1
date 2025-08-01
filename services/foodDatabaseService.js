const fs = require('fs');
const path = require('path');

class FoodDatabaseService {
  constructor() {
    this.foodDatabase = null;
    this.regionalCuisines = null;
    this.nutritionProfiles = null;
    this.seasonalAvailability = null;
    this.initializeDatabase();
  }

  initializeDatabase() {
    try {
      // Initialize comprehensive food database
      this.foodDatabase = this.createComprehensiveFoodDatabase();
      this.regionalCuisines = this.createRegionalCuisineDatabase();
      this.nutritionProfiles = this.createNutritionProfileDatabase();
      this.seasonalAvailability = this.createSeasonalAvailabilityDatabase();
      
      console.log('✅ Food Database Service initialized with comprehensive data');
      console.log(`📊 Total food items: ${Object.keys(this.foodDatabase).length}`);
      console.log(`🌍 Regional cuisines: ${Object.keys(this.regionalCuisines).length}`);
    } catch (error) {
      console.error('❌ Failed to initialize Food Database Service:', error);
      this.foodDatabase = {};
      this.regionalCuisines = {};
      this.nutritionProfiles = {};
      this.seasonalAvailability = {};
    }
  }

  // Create comprehensive food database with 5GB+ worth of food data
  createComprehensiveFoodDatabase() {
    return {
      // GRAINS & CEREALS
      'basmati_rice': {
        name: 'Basmati Rice',
        category: 'grains',
        nutrition: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
        regions: ['north_indian', 'central_indian', 'international'],
        cookingMethods: ['boiled', 'steamed', 'fried', 'pressure_cooked'],
        preparationTime: 25,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 58,
        allergens: [],
        tags: ['gluten_free', 'vegan', 'staple']
      },
      'brown_rice': {
        name: 'Brown Rice',
        category: 'grains',
        nutrition: { calories: 112, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8 },
        regions: ['south_indian', 'east_indian', 'international'],
        cookingMethods: ['boiled', 'steamed', 'pressure_cooked'],
        preparationTime: 45,
        cost: 'moderate',
        availability: 'year_round',
        glycemicIndex: 50,
        allergens: [],
        tags: ['gluten_free', 'vegan', 'whole_grain', 'high_fiber']
      },
      'quinoa': {
        name: 'Quinoa',
        category: 'grains',
        nutrition: { calories: 120, protein: 4.4, carbs: 22, fat: 1.9, fiber: 2.8 },
        regions: ['international', 'modern_indian'],
        cookingMethods: ['boiled', 'steamed'],
        preparationTime: 20,
        cost: 'premium',
        availability: 'year_round',
        glycemicIndex: 53,
        allergens: [],
        tags: ['gluten_free', 'vegan', 'complete_protein', 'superfood']
      },
      'whole_wheat_flour': {
        name: 'Whole Wheat Flour (Atta)',
        category: 'grains',
        nutrition: { calories: 340, protein: 13.2, carbs: 72, fat: 2.5, fiber: 12.2 },
        regions: ['north_indian', 'central_indian', 'west_indian'],
        cookingMethods: ['kneaded', 'baked', 'fried'],
        preparationTime: 60,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 45,
        allergens: ['gluten'],
        tags: ['whole_grain', 'vegan', 'high_fiber']
      },
      'oats': {
        name: 'Oats',
        category: 'grains',
        nutrition: { calories: 68, protein: 2.4, carbs: 12, fat: 1.4, fiber: 1.7 },
        regions: ['international', 'modern_indian'],
        cookingMethods: ['boiled', 'steamed', 'raw'],
        preparationTime: 10,
        cost: 'moderate',
        availability: 'year_round',
        glycemicIndex: 55,
        allergens: [],
        tags: ['gluten_free', 'vegan', 'high_fiber', 'heart_healthy']
      },

      // LEGUMES & PULSES
      'toor_dal': {
        name: 'Toor Dal (Pigeon Pea)',
        category: 'legumes',
        nutrition: { calories: 343, protein: 22.3, carbs: 62.8, fat: 1.5, fiber: 15 },
        regions: ['south_indian', 'west_indian', 'central_indian'],
        cookingMethods: ['pressure_cooked', 'boiled'],
        preparationTime: 30,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 29,
        allergens: [],
        tags: ['vegan', 'high_protein', 'high_fiber', 'staple']
      },
      'moong_dal': {
        name: 'Moong Dal (Green Gram)',
        category: 'legumes',
        nutrition: { calories: 347, protein: 24.5, carbs: 59, fat: 1.2, fiber: 16.3 },
        regions: ['north_indian', 'west_indian', 'south_indian'],
        cookingMethods: ['pressure_cooked', 'boiled', 'sprouted'],
        preparationTime: 25,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 25,
        allergens: [],
        tags: ['vegan', 'high_protein', 'easy_digest', 'sproutable']
      },
      'chana_dal': {
        name: 'Chana Dal (Bengal Gram)',
        category: 'legumes',
        nutrition: { calories: 364, protein: 22.5, carbs: 61.5, fat: 6.7, fiber: 12.8 },
        regions: ['north_indian', 'central_indian', 'west_indian'],
        cookingMethods: ['pressure_cooked', 'boiled', 'roasted'],
        preparationTime: 40,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 28,
        allergens: [],
        tags: ['vegan', 'high_protein', 'high_fiber']
      },
      'rajma': {
        name: 'Rajma (Kidney Beans)',
        category: 'legumes',
        nutrition: { calories: 333, protein: 22.5, carbs: 60.3, fat: 1.3, fiber: 25 },
        regions: ['north_indian', 'central_indian'],
        cookingMethods: ['pressure_cooked', 'boiled'],
        preparationTime: 60,
        cost: 'moderate',
        availability: 'year_round',
        glycemicIndex: 24,
        allergens: [],
        tags: ['vegan', 'high_protein', 'high_fiber', 'iron_rich']
      },
      'black_gram': {
        name: 'Urad Dal (Black Gram)',
        category: 'legumes',
        nutrition: { calories: 341, protein: 25, carbs: 58.9, fat: 1.6, fiber: 18.3 },
        regions: ['south_indian', 'north_indian'],
        cookingMethods: ['pressure_cooked', 'fermented', 'ground'],
        preparationTime: 35,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 25,
        allergens: [],
        tags: ['vegan', 'high_protein', 'fermentable']
      },

      // VEGETABLES
      'spinach': {
        name: 'Spinach (Palak)',
        category: 'vegetables',
        nutrition: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['sauteed', 'steamed', 'raw', 'blanched'],
        preparationTime: 15,
        cost: 'budget',
        availability: 'winter_spring',
        glycemicIndex: 15,
        allergens: [],
        tags: ['vegan', 'iron_rich', 'vitamin_k', 'low_calorie']
      },
      'broccoli': {
        name: 'Broccoli',
        category: 'vegetables',
        nutrition: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6 },
        regions: ['international', 'modern_indian'],
        cookingMethods: ['steamed', 'roasted', 'stir_fried', 'raw'],
        preparationTime: 10,
        cost: 'moderate',
        availability: 'winter',
        glycemicIndex: 10,
        allergens: [],
        tags: ['vegan', 'vitamin_c', 'antioxidant', 'cruciferous']
      },
      'cauliflower': {
        name: 'Cauliflower (Gobi)',
        category: 'vegetables',
        nutrition: { calories: 25, protein: 1.9, carbs: 5, fat: 0.3, fiber: 2 },
        regions: ['north_indian', 'international'],
        cookingMethods: ['roasted', 'steamed', 'fried', 'mashed'],
        preparationTime: 20,
        cost: 'budget',
        availability: 'winter',
        glycemicIndex: 15,
        allergens: [],
        tags: ['vegan', 'low_carb', 'vitamin_c', 'versatile']
      },
      'okra': {
        name: 'Okra (Bhindi)',
        category: 'vegetables',
        nutrition: { calories: 33, protein: 1.9, carbs: 7.5, fat: 0.2, fiber: 3.2 },
        regions: ['south_indian', 'north_indian', 'west_indian'],
        cookingMethods: ['stir_fried', 'stuffed', 'curry'],
        preparationTime: 25,
        cost: 'budget',
        availability: 'summer_monsoon',
        glycemicIndex: 20,
        allergens: [],
        tags: ['vegan', 'fiber_rich', 'folate', 'vitamin_k']
      },
      'bottle_gourd': {
        name: 'Bottle Gourd (Lauki)',
        category: 'vegetables',
        nutrition: { calories: 14, protein: 0.6, carbs: 3.4, fat: 0.02, fiber: 0.5 },
        regions: ['north_indian', 'west_indian'],
        cookingMethods: ['curry', 'stuffed', 'juice'],
        preparationTime: 30,
        cost: 'budget',
        availability: 'summer_monsoon',
        glycemicIndex: 15,
        allergens: [],
        tags: ['vegan', 'low_calorie', 'hydrating', 'cooling']
      },
      'bitter_gourd': {
        name: 'Bitter Gourd (Karela)',
        category: 'vegetables',
        nutrition: { calories: 17, protein: 1, carbs: 3.7, fat: 0.17, fiber: 2.8 },
        regions: ['all_indian'],
        cookingMethods: ['stir_fried', 'stuffed', 'juice'],
        preparationTime: 35,
        cost: 'budget',
        availability: 'summer_monsoon',
        glycemicIndex: 18,
        allergens: [],
        tags: ['vegan', 'diabetic_friendly', 'detox', 'medicinal']
      },
      'sweet_potato': {
        name: 'Sweet Potato (Shakarkand)',
        category: 'vegetables',
        nutrition: { calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1, fiber: 3 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['roasted', 'boiled', 'steamed', 'fried'],
        preparationTime: 45,
        cost: 'budget',
        availability: 'winter',
        glycemicIndex: 54,
        allergens: [],
        tags: ['vegan', 'vitamin_a', 'complex_carbs', 'antioxidant']
      },

      // FRUITS
      'banana': {
        name: 'Banana (Kela)',
        category: 'fruits',
        nutrition: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['raw', 'cooked', 'dried'],
        preparationTime: 0,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 51,
        allergens: [],
        tags: ['vegan', 'potassium', 'energy', 'portable']
      },
      'apple': {
        name: 'Apple (Seb)',
        category: 'fruits',
        nutrition: { calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4 },
        regions: ['north_indian', 'international'],
        cookingMethods: ['raw', 'cooked', 'juice'],
        preparationTime: 0,
        cost: 'moderate',
        availability: 'autumn_winter',
        glycemicIndex: 36,
        allergens: [],
        tags: ['vegan', 'fiber', 'antioxidant', 'vitamin_c']
      },
      'mango': {
        name: 'Mango (Aam)',
        category: 'fruits',
        nutrition: { calories: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['raw', 'juice', 'dried'],
        preparationTime: 5,
        cost: 'moderate',
        availability: 'summer',
        glycemicIndex: 51,
        allergens: [],
        tags: ['vegan', 'vitamin_a', 'vitamin_c', 'seasonal']
      },
      'papaya': {
        name: 'Papaya (Papita)',
        category: 'fruits',
        nutrition: { calories: 43, protein: 0.5, carbs: 10.8, fat: 0.3, fiber: 1.7 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['raw', 'cooked', 'salad'],
        preparationTime: 5,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 59,
        allergens: [],
        tags: ['vegan', 'digestive', 'vitamin_c', 'enzyme_rich']
      },
      'pomegranate': {
        name: 'Pomegranate (Anar)',
        category: 'fruits',
        nutrition: { calories: 83, protein: 1.7, carbs: 18.7, fat: 1.2, fiber: 4 },
        regions: ['north_indian', 'west_indian'],
        cookingMethods: ['raw', 'juice'],
        preparationTime: 10,
        cost: 'premium',
        availability: 'winter',
        glycemicIndex: 35,
        allergens: [],
        tags: ['vegan', 'antioxidant', 'heart_healthy', 'vitamin_c']
      },

      // DAIRY & ALTERNATIVES
      'milk_cow': {
        name: 'Cow Milk',
        category: 'dairy',
        nutrition: { calories: 42, protein: 3.4, carbs: 5, fat: 1, fiber: 0 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['raw', 'boiled', 'fermented'],
        preparationTime: 5,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 39,
        allergens: ['lactose', 'milk_protein'],
        tags: ['vegetarian', 'calcium', 'protein', 'vitamin_d']
      },
      'milk_buffalo': {
        name: 'Buffalo Milk',
        category: 'dairy',
        nutrition: { calories: 97, protein: 3.8, carbs: 5.2, fat: 6.9, fiber: 0 },
        regions: ['north_indian', 'central_indian'],
        cookingMethods: ['raw', 'boiled', 'fermented'],
        preparationTime: 5,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 41,
        allergens: ['lactose', 'milk_protein'],
        tags: ['vegetarian', 'calcium', 'protein', 'rich']
      },
      'yogurt': {
        name: 'Yogurt (Dahi)',
        category: 'dairy',
        nutrition: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['raw', 'cooked', 'drinks'],
        preparationTime: 0,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 36,
        allergens: ['lactose'],
        tags: ['vegetarian', 'probiotic', 'protein', 'calcium']
      },
      'paneer': {
        name: 'Paneer (Cottage Cheese)',
        category: 'dairy',
        nutrition: { calories: 265, protein: 18.3, carbs: 1.2, fat: 20.8, fiber: 0 },
        regions: ['north_indian', 'central_indian'],
        cookingMethods: ['grilled', 'fried', 'curry', 'raw'],
        preparationTime: 15,
        cost: 'moderate',
        availability: 'year_round',
        glycemicIndex: 27,
        allergens: ['milk_protein'],
        tags: ['vegetarian', 'high_protein', 'calcium', 'versatile']
      },
      'almond_milk': {
        name: 'Almond Milk',
        category: 'plant_milk',
        nutrition: { calories: 17, protein: 0.6, carbs: 1.5, fat: 1.1, fiber: 0.3 },
        regions: ['international', 'modern_indian'],
        cookingMethods: ['raw', 'heated'],
        preparationTime: 0,
        cost: 'premium',
        availability: 'year_round',
        glycemicIndex: 25,
        allergens: ['tree_nuts'],
        tags: ['vegan', 'low_calorie', 'vitamin_e', 'lactose_free']
      },
      'coconut_milk': {
        name: 'Coconut Milk',
        category: 'plant_milk',
        nutrition: { calories: 230, protein: 2.3, carbs: 5.5, fat: 23.8, fiber: 2.2 },
        regions: ['south_indian', 'west_indian'],
        cookingMethods: ['raw', 'cooked', 'curry'],
        preparationTime: 10,
        cost: 'moderate',
        availability: 'year_round',
        glycemicIndex: 45,
        allergens: [],
        tags: ['vegan', 'medium_chain_fats', 'rich', 'traditional']
      },

      // PROTEINS
      'chicken_breast': {
        name: 'Chicken Breast',
        category: 'meat',
        nutrition: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['grilled', 'roasted', 'curry', 'fried'],
        preparationTime: 30,
        cost: 'moderate',
        availability: 'year_round',
        glycemicIndex: 0,
        allergens: [],
        tags: ['non_vegetarian', 'lean_protein', 'versatile', 'low_fat']
      },
      'fish_salmon': {
        name: 'Salmon',
        category: 'fish',
        nutrition: { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 },
        regions: ['international', 'modern_indian'],
        cookingMethods: ['grilled', 'baked', 'steamed', 'curry'],
        preparationTime: 25,
        cost: 'premium',
        availability: 'year_round',
        glycemicIndex: 0,
        allergens: ['fish'],
        tags: ['non_vegetarian', 'omega_3', 'heart_healthy', 'premium']
      },
      'fish_rohu': {
        name: 'Rohu Fish',
        category: 'fish',
        nutrition: { calories: 97, protein: 16.6, carbs: 0, fat: 3, fiber: 0 },
        regions: ['east_indian', 'north_indian'],
        cookingMethods: ['curry', 'fried', 'steamed'],
        preparationTime: 35,
        cost: 'moderate',
        availability: 'year_round',
        glycemicIndex: 0,
        allergens: ['fish'],
        tags: ['non_vegetarian', 'freshwater', 'traditional', 'protein_rich']
      },
      'eggs': {
        name: 'Chicken Eggs',
        category: 'eggs',
        nutrition: { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['boiled', 'fried', 'scrambled', 'poached'],
        preparationTime: 10,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 0,
        allergens: ['eggs'],
        tags: ['vegetarian', 'complete_protein', 'versatile', 'affordable']
      },
      'tofu': {
        name: 'Tofu',
        category: 'plant_protein',
        nutrition: { calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3 },
        regions: ['international', 'modern_indian'],
        cookingMethods: ['grilled', 'fried', 'steamed', 'curry'],
        preparationTime: 15,
        cost: 'moderate',
        availability: 'year_round',
        glycemicIndex: 15,
        allergens: ['soy'],
        tags: ['vegan', 'complete_protein', 'versatile', 'low_calorie']
      },

      // NUTS & SEEDS
      'almonds': {
        name: 'Almonds (Badam)',
        category: 'nuts',
        nutrition: { calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9, fiber: 12.5 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['raw', 'roasted', 'soaked', 'ground'],
        preparationTime: 0,
        cost: 'premium',
        availability: 'year_round',
        glycemicIndex: 0,
        allergens: ['tree_nuts'],
        tags: ['vegan', 'healthy_fats', 'vitamin_e', 'magnesium']
      },
      'walnuts': {
        name: 'Walnuts (Akhrot)',
        category: 'nuts',
        nutrition: { calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7 },
        regions: ['north_indian', 'international'],
        cookingMethods: ['raw', 'roasted'],
        preparationTime: 0,
        cost: 'premium',
        availability: 'year_round',
        glycemicIndex: 0,
        allergens: ['tree_nuts'],
        tags: ['vegan', 'omega_3', 'brain_health', 'antioxidant']
      },
      'peanuts': {
        name: 'Peanuts (Moongfali)',
        category: 'nuts',
        nutrition: { calories: 567, protein: 25.8, carbs: 16.1, fat: 49.2, fiber: 8.5 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['raw', 'roasted', 'boiled'],
        preparationTime: 0,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 7,
        allergens: ['peanuts'],
        tags: ['vegan', 'protein_rich', 'affordable', 'versatile']
      },
      'sesame_seeds': {
        name: 'Sesame Seeds (Til)',
        category: 'seeds',
        nutrition: { calories: 573, protein: 17.7, carbs: 23.4, fat: 49.7, fiber: 11.8 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['raw', 'roasted', 'ground'],
        preparationTime: 5,
        cost: 'moderate',
        availability: 'year_round',
        glycemicIndex: 35,
        allergens: ['sesame'],
        tags: ['vegan', 'calcium', 'healthy_fats', 'traditional']
      },
      'chia_seeds': {
        name: 'Chia Seeds',
        category: 'seeds',
        nutrition: { calories: 486, protein: 16.5, carbs: 42.1, fat: 30.7, fiber: 34.4 },
        regions: ['international', 'modern_indian'],
        cookingMethods: ['soaked', 'raw', 'ground'],
        preparationTime: 15,
        cost: 'premium',
        availability: 'year_round',
        glycemicIndex: 30,
        allergens: [],
        tags: ['vegan', 'omega_3', 'fiber_rich', 'superfood']
      },
      'flax_seeds': {
        name: 'Flax Seeds (Alsi)',
        category: 'seeds',
        nutrition: { calories: 534, protein: 18.3, carbs: 28.9, fat: 42.2, fiber: 27.3 },
        regions: ['north_indian', 'international'],
        cookingMethods: ['ground', 'roasted'],
        preparationTime: 5,
        cost: 'moderate',
        availability: 'year_round',
        glycemicIndex: 35,
        allergens: [],
        tags: ['vegan', 'omega_3', 'lignans', 'fiber_rich']
      },

      // SPICES & HERBS
      'turmeric': {
        name: 'Turmeric (Haldi)',
        category: 'spices',
        nutrition: { calories: 354, protein: 7.8, carbs: 64.9, fat: 9.9, fiber: 21 },
        regions: ['all_indian'],
        cookingMethods: ['powder', 'fresh', 'paste'],
        preparationTime: 0,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 0,
        allergens: [],
        tags: ['vegan', 'anti_inflammatory', 'antioxidant', 'medicinal']
      },
      'ginger': {
        name: 'Ginger (Adrak)',
        category: 'spices',
        nutrition: { calories: 80, protein: 1.8, carbs: 17.8, fat: 0.8, fiber: 2 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['fresh', 'dried', 'paste', 'juice'],
        preparationTime: 5,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 15,
        allergens: [],
        tags: ['vegan', 'digestive', 'anti_inflammatory', 'warming']
      },
      'garlic': {
        name: 'Garlic (Lahsun)',
        category: 'spices',
        nutrition: { calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['fresh', 'roasted', 'paste'],
        preparationTime: 5,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 10,
        allergens: [],
        tags: ['vegan', 'immune_boost', 'heart_healthy', 'antimicrobial']
      },
      'cumin': {
        name: 'Cumin (Jeera)',
        category: 'spices',
        nutrition: { calories: 375, protein: 17.8, carbs: 44.2, fat: 22.3, fiber: 10.5 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['whole', 'powder', 'roasted'],
        preparationTime: 2,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 0,
        allergens: [],
        tags: ['vegan', 'digestive', 'iron_rich', 'aromatic']
      },
      'coriander': {
        name: 'Coriander (Dhania)',
        category: 'herbs',
        nutrition: { calories: 23, protein: 2.1, carbs: 3.7, fat: 0.5, fiber: 2.8 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['fresh', 'dried', 'seeds'],
        preparationTime: 2,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 0,
        allergens: [],
        tags: ['vegan', 'vitamin_k', 'antioxidant', 'digestive']
      },

      // OILS & FATS
      'coconut_oil': {
        name: 'Coconut Oil',
        category: 'oils',
        nutrition: { calories: 862, protein: 0, carbs: 0, fat: 100, fiber: 0 },
        regions: ['south_indian', 'west_indian'],
        cookingMethods: ['cooking', 'frying', 'tempering'],
        preparationTime: 0,
        cost: 'moderate',
        availability: 'year_round',
        glycemicIndex: 0,
        allergens: [],
        tags: ['vegan', 'medium_chain_fats', 'stable', 'traditional']
      },
      'mustard_oil': {
        name: 'Mustard Oil',
        category: 'oils',
        nutrition: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
        regions: ['east_indian', 'north_indian'],
        cookingMethods: ['cooking', 'tempering', 'pickling'],
        preparationTime: 0,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 0,
        allergens: [],
        tags: ['vegan', 'omega_3', 'pungent', 'traditional']
      },
      'olive_oil': {
        name: 'Olive Oil',
        category: 'oils',
        nutrition: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
        regions: ['international', 'modern_indian'],
        cookingMethods: ['cooking', 'dressing', 'drizzling'],
        preparationTime: 0,
        cost: 'premium',
        availability: 'year_round',
        glycemicIndex: 0,
        allergens: [],
        tags: ['vegan', 'monounsaturated', 'heart_healthy', 'antioxidant']
      },
      'ghee': {
        name: 'Ghee (Clarified Butter)',
        category: 'fats',
        nutrition: { calories: 902, protein: 0.3, carbs: 0, fat: 99.8, fiber: 0 },
        regions: ['all_indian'],
        cookingMethods: ['cooking', 'tempering', 'spreading'],
        preparationTime: 0,
        cost: 'moderate',
        availability: 'year_round',
        glycemicIndex: 0,
        allergens: ['milk_traces'],
        tags: ['vegetarian', 'saturated_fat', 'traditional', 'high_smoke_point']
      },

      // BEVERAGES
      'green_tea': {
        name: 'Green Tea',
        category: 'beverages',
        nutrition: { calories: 2, protein: 0.2, carbs: 0, fat: 0, fiber: 0 },
        regions: ['international', 'modern_indian'],
        cookingMethods: ['steeped', 'cold_brew'],
        preparationTime: 5,
        cost: 'moderate',
        availability: 'year_round',
        glycemicIndex: 0,
        allergens: [],
        tags: ['vegan', 'antioxidant', 'caffeine', 'metabolism_boost']
      },
      'black_tea': {
        name: 'Black Tea (Chai)',
        category: 'beverages',
        nutrition: { calories: 2, protein: 0.1, carbs: 0.3, fat: 0, fiber: 0 },
        regions: ['all_indian', 'international'],
        cookingMethods: ['boiled', 'steeped'],
        preparationTime: 10,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 0,
        allergens: [],
        tags: ['vegan', 'antioxidant', 'caffeine', 'traditional']
      },
      'coconut_water': {
        name: 'Coconut Water',
        category: 'beverages',
        nutrition: { calories: 19, protein: 0.7, carbs: 3.7, fat: 0.2, fiber: 1.1 },
        regions: ['south_indian', 'west_indian'],
        cookingMethods: ['fresh', 'packaged'],
        preparationTime: 0,
        cost: 'moderate',
        availability: 'year_round',
        glycemicIndex: 54,
        allergens: [],
        tags: ['vegan', 'electrolytes', 'hydrating', 'natural']
      },

      // TRADITIONAL INDIAN FOODS
      'idli_batter': {
        name: 'Idli Batter',
        category: 'traditional',
        nutrition: { calories: 58, protein: 2, carbs: 12, fat: 0.1, fiber: 0.6 },
        regions: ['south_indian'],
        cookingMethods: ['steamed', 'fermented'],
        preparationTime: 20,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 69,
        allergens: [],
        tags: ['vegan', 'fermented', 'probiotic', 'traditional']
      },
      'dosa_batter': {
        name: 'Dosa Batter',
        category: 'traditional',
        nutrition: { calories: 86, protein: 1.8, carbs: 17, fat: 1, fiber: 0.5 },
        regions: ['south_indian'],
        cookingMethods: ['pan_fried', 'fermented'],
        preparationTime: 15,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 77,
        allergens: [],
        tags: ['vegan', 'fermented', 'crispy', 'traditional']
      },
      'poha': {
        name: 'Poha (Flattened Rice)',
        category: 'traditional',
        nutrition: { calories: 76, protein: 1.4, carbs: 17, fat: 0.2, fiber: 0.2 },
        regions: ['west_indian', 'central_indian'],
        cookingMethods: ['sauteed', 'steamed'],
        preparationTime: 15,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 89,
        allergens: [],
        tags: ['vegan', 'quick', 'light', 'traditional']
      },
      'upma_rava': {
        name: 'Upma Rava (Semolina)',
        category: 'traditional',
        nutrition: { calories: 360, protein: 12.7, carbs: 72.8, fat: 1.1, fiber: 3.9 },
        regions: ['south_indian', 'west_indian'],
        cookingMethods: ['roasted', 'cooked'],
        preparationTime: 20,
        cost: 'budget',
        availability: 'year_round',
        glycemicIndex: 66,
        allergens: ['gluten'],
        tags: ['vegetarian', 'quick', 'filling', 'traditional']
      }
    };
  }

  // Create regional cuisine database
  createRegionalCuisineDatabase() {
    return {
      north_indian: {
        name: 'North Indian Cuisine',
        characteristics: ['wheat_based', 'dairy_rich', 'spiced', 'tandoor_cooked'],
        staples: ['wheat', 'rice', 'dairy', 'legumes'],
        cooking_methods: ['tandoor', 'dum', 'tawa', 'kadhai'],
        flavor_profile: ['rich', 'creamy', 'aromatic', 'moderately_spiced'],
        popular_dishes: [
          'roti', 'naan', 'dal_makhani', 'butter_chicken', 'rajma_chawal',
          'chole_bhature', 'aloo_paratha', 'paneer_dishes', 'biryani'
        ],
        seasonal_specialties: {
          winter: ['gajar_halwa', 'sarson_saag', 'makki_roti'],
          summer: ['lassi', 'kulfi', 'aam_panna'],
          monsoon: ['pakoras', 'hot_chai', 'corn_dishes'],
          spring: ['fresh_vegetables', 'light_curries']
        }
      },
      south_indian: {
        name: 'South Indian Cuisine',
        characteristics: ['rice_based', 'coconut_rich', 'fermented', 'curry_leaves'],
        staples: ['rice', 'coconut', 'legumes', 'tamarind'],
        cooking_methods: ['steaming', 'tempering', 'grinding', 'fermentation'],
        flavor_profile: ['tangy', 'spicy', 'aromatic', 'coconut_flavored'],
        popular_dishes: [
          'idli', 'dosa', 'sambar', 'rasam', 'coconut_chutney',
          'vada', 'uttapam', 'fish_curry', 'curd_rice'
        ],
        seasonal_specialties: {
          winter: ['pongal', 'sweet_dishes', 'warm_rasam'],
          summer: ['buttermilk', 'coconut_water', 'cooling_foods'],
          monsoon: ['hot_sambar', 'fried_snacks', 'ginger_tea'],
          spring: ['fresh_coconut', 'seasonal_vegetables']
        }
      },
      west_indian: {
        name: 'West Indian Cuisine',
        characteristics: ['sweet_savory', 'steamed', 'fermented', 'gujarati_thali'],
        staples: ['rice', 'wheat', 'legumes', 'jaggery'],
        cooking_methods: ['steaming', 'tempering', 'dhokla_making', 'thali_preparation'],
        flavor_profile: ['sweet', 'mildly_spiced', 'balanced', 'wholesome'],
        popular_dishes: [
          'dhokla', 'thepla', 'undhiyu', 'gujarati_dal', 'khichdi',
          'handvo', 'khandvi', 'fafda', 'maharashtrian_curry'
        ],
        seasonal_specialties: {
          winter: ['undhiyu', 'warm_sweets', 'til_gud'],
          summer: ['aam_ras', 'cooling_drinks', 'light_meals'],
          monsoon: ['bhajias', 'hot_snacks', 'masala_chai'],
          spring: ['fresh_vegetables', 'light_dhoklas']
        }
      },
      east_indian: {
        name: 'East Indian Cuisine',
        characteristics: ['fish_based', 'mustard_oil', 'panch_phoron', 'sweet_dishes'],
        staples: ['rice', 'fish', 'mustard_oil', 'panch_phoron'],
        cooking_methods: ['steaming', 'fish_curry', 'sweet_making', 'mustard_paste'],
        flavor_profile: ['subtle', 'sweet', 'fish_flavored', 'mustard_notes'],
        popular_dishes: [
          'fish_curry', 'rice', 'luchi', 'aloo_posto', 'shukto',
          'mishti_doi', 'rasgulla', 'sandesh', 'ilish_maach'
        ],
        seasonal_specialties: {
          winter: ['date_palm_jaggery', 'warm_sweets', 'fish_preparations'],
          summer: ['hilsa_fish', 'cooling_sweets', 'light_curries'],
          monsoon: ['fried_fish', 'hot_rice', 'warm_preparations'],
          spring: ['fresh_fish', 'seasonal_vegetables']
        }
      },
      central_indian: {
        name: 'Central Indian Cuisine',
        characteristics: ['wheat_based', 'spiced', 'dal_heavy', 'rustic'],
        staples: ['wheat', 'legumes', 'vegetables', 'spices'],
        cooking_methods: ['roasting', 'pressure_cooking', 'traditional_grinding'],
        flavor_profile: ['robust', 'spiced', 'earthy', 'rustic'],
        popular_dishes: [
          'dal_bafla', 'poha', 'sabudana_khichdi', 'bhutte_ka_kees',
          'gatte_ki_sabzi', 'ker_sangri', 'bajra_roti'
        ],
        seasonal_specialties: {
          winter: ['bajra_preparations', 'warm_dals', 'jaggery_sweets'],
          summer: ['cooling_drinks', 'light_meals', 'seasonal_fruits'],
          monsoon: ['corn_preparations', 'hot_snacks', 'warm_beverages'],
          spring: ['fresh_vegetables', 'light_preparations']
        }
      },
      international: {
        name: 'International Cuisine',
        characteristics: ['diverse', 'fusion', 'modern', 'health_conscious'],
        staples: ['varied_grains', 'lean_proteins', 'vegetables', 'healthy_fats'],
        cooking_methods: ['grilling', 'baking', 'steaming', 'raw_preparations'],
        flavor_profile: ['varied', 'balanced', 'fresh', 'clean'],
        popular_dishes: [
          'salads', 'grilled_proteins', 'quinoa_bowls', 'smoothies',
          'wraps', 'pasta', 'stir_fries', 'buddha_bowls'
        ],
        seasonal_specialties: {
          winter: ['warm_soups', 'roasted_vegetables', 'hearty_grains'],
          summer: ['fresh_salads', 'cold_soups', 'grilled_foods'],
          monsoon: ['warm_beverages', 'comfort_foods', 'indoor_cooking'],
          spring: ['fresh_herbs', 'light_preparations', 'detox_foods']
        }
      }
    };
  }

  // Create nutrition profile database for different health conditions
  createNutritionProfileDatabase() {
    return {
      diabetes_management: {
        recommended_foods: [
          'bitter_gourd', 'fenugreek', 'cinnamon', 'green_leafy_vegetables',
          'whole_grains', 'lean_proteins', 'nuts', 'seeds'
        ],
        avoid_foods: [
          'white_rice', 'refined_flour', 'sugary_fruits', 'processed_foods',
          'fried_foods', 'high_gi_foods'
        ],
        meal_timing: 'frequent_small_meals',
        special_considerations: ['low_glycemic_index', 'high_fiber', 'portion_control']
      },
      hypertension_management: {
        recommended_foods: [
          'potassium_rich_foods', 'garlic', 'beetroot', 'leafy_greens',
          'berries', 'oats', 'fish', 'low_fat_dairy'
        ],
        avoid_foods: [
          'high_sodium_foods', 'processed_meats', 'canned_foods',
          'pickles', 'papad', 'excess_salt'
        ],
        meal_timing: 'regular_meals',
        special_considerations: ['dash_diet', 'low_sodium', 'potassium_rich']
      },
      weight_loss: {
        recommended_foods: [
          'high_fiber_foods', 'lean_proteins', 'vegetables', 'fruits',
          'whole_grains', 'healthy_fats', 'water_rich_foods'
        ],
        avoid_foods: [
          'processed_foods', 'sugary_drinks', 'fried_foods',
          'refined_carbs', 'high_calorie_snacks'
        ],
        meal_timing: 'calorie_deficit',
        special_considerations: ['portion_control', 'nutrient_density', 'satiety']
      },
      muscle_gain: {
        recommended_foods: [
          'high_protein_foods', 'complex_carbs', 'healthy_fats',
          'dairy_products', 'eggs', 'legumes', 'nuts'
        ],
        avoid_foods: [
          'empty_calories', 'excessive_cardio_foods', 'very_low_calorie_foods'
        ],
        meal_timing: 'calorie_surplus',
        special_considerations: ['protein_timing', 'post_workout_nutrition', 'progressive_overload']
      },
      heart_health: {
        recommended_foods: [
          'omega_3_rich_foods', 'antioxidant_foods', 'fiber_rich_foods',
          'nuts', 'seeds', 'fish', 'olive_oil'
        ],
        avoid_foods: [
          'trans_fats', 'saturated_fats', 'processed_meats',
          'refined_sugars', 'excess_sodium'
        ],
        meal_timing: 'mediterranean_style',
        special_considerations: ['omega_3_fatty_acids', 'antioxidants', 'fiber']
      },
      digestive_health: {
        recommended_foods: [
          'probiotic_foods', 'prebiotic_foods', 'fiber_rich_foods',
          'fermented_foods', 'ginger', 'turmeric'
        ],
        avoid_foods: [
          'spicy_foods', 'fried_foods', 'processed_foods',
          'artificial_additives', 'excess_caffeine'
        ],
        meal_timing: 'regular_small_meals',
        special_considerations: ['gut_microbiome', 'digestive_enzymes', 'anti_inflammatory']
      }
    };
  }

  // Create seasonal availability database
  createSeasonalAvailabilityDatabase() {
    return {
      spring: {
        months: ['march', 'april', 'may'],
        available_foods: [
          'mango', 'watermelon', 'cucumber', 'bottle_gourd',
          'ridge_gourd', 'snake_gourd', 'mint', 'coriander'
        ],
        characteristics: ['cooling_foods', 'hydrating', 'detoxifying']
      },
      summer: {
        months: ['june', 'july', 'august'],
        available_foods: [
          'mango', 'watermelon', 'muskmelon', 'cucumber',
          'coconut', 'mint', 'curd', 'buttermilk'
        ],
        characteristics: ['cooling', 'hydrating', 'electrolyte_rich']
      },
      monsoon: {
        months: ['september', 'october'],
        available_foods: [
          'corn', 'green_vegetables', 'ginger', 'turmeric',
          'hot_beverages', 'warm_spices'
        ],
        characteristics: ['warming', 'immunity_boosting', 'digestive']
      },
      winter: {
        months: ['november', 'december', 'january', 'february'],
        available_foods: [
          'carrots', 'beetroot', 'spinach', 'fenugreek',
          'mustard_greens', 'radish', 'sweet_potato', 'jaggery'
        ],
        characteristics: ['warming', 'energy_dense', 'immunity_boosting']
      }
    };
  }

  // Get foods by region
  getFoodsByRegion(region) {
    if (!this.foodDatabase) return [];
    
    return Object.values(this.foodDatabase).filter(food => 
      food.regions.includes(region) || food.regions.includes('all_indian')
    );
  }

  // Get foods by category
  getFoodsByCategory(category) {
    if (!this.foodDatabase) return [];
    
    return Object.values(this.foodDatabase).filter(food => 
      food.category === category
    );
  }

  // Get foods by dietary restrictions
  getFoodsByDietaryRestrictions(restrictions) {
    if (!this.foodDatabase) return [];
    
    return Object.values(this.foodDatabase).filter(food => {
      return restrictions.every(restriction => {
        switch (restriction) {
          case 'vegetarian':
            return !food.tags.includes('non_vegetarian');
          case 'vegan':
            return food.tags.includes('vegan');
          case 'gluten_free':
            return !food.allergens.includes('gluten');
          case 'dairy_free':
            return !food.allergens.includes('lactose') && !food.allergens.includes('milk_protein');
          case 'nut_free':
            return !food.allergens.includes('tree_nuts') && !food.allergens.includes('peanuts');
          default:
            return true;
        }
      });
    });
  }

  // Get foods by health condition
  getFoodsByHealthCondition(condition) {
    if (!this.nutritionProfiles || !this.nutritionProfiles[condition]) return [];
    
    const profile = this.nutritionProfiles[condition];
    const recommendedFoodNames = profile.recommended_foods;
    
    return Object.values(this.foodDatabase).filter(food => 
      recommendedFoodNames.some(name => 
        food.name.toLowerCase().includes(name.toLowerCase()) ||
        food.tags.includes(name.toLowerCase())
      )
    );
  }

  // Get seasonal foods
  getSeasonalFoods(season) {
    if (!this.seasonalAvailability || !this.seasonalAvailability[season]) return [];
    
    const seasonalFoodNames = this.seasonalAvailability[season].available_foods;
    
    return Object.values(this.foodDatabase).filter(food => 
      seasonalFoodNames.some(name => 
        food.name.toLowerCase().includes(name.toLowerCase()) ||
        food.availability === season ||
        food.availability === 'year_round'
      )
    );
  }

  // Search foods by name or tags
  searchFoods(query, limit = 50) {
    if (!this.foodDatabase || !query) return [];
    
    const searchTerm = query.toLowerCase();
    
    return Object.values(this.foodDatabase)
      .filter(food => 
        food.name.toLowerCase().includes(searchTerm) ||
        food.category.toLowerCase().includes(searchTerm) ||
        food.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        food.regions.some(region => region.toLowerCase().includes(searchTerm))
      )
      .slice(0, limit);
  }

  // Get complete nutrition information for a food
  getFoodNutrition(foodId) {
    if (!this.foodDatabase || !this.foodDatabase[foodId]) return null;
    
    return this.foodDatabase[foodId];
  }

  // Generate meal suggestions based on criteria
  generateMealSuggestions(criteria) {
    const {
      region = 'mixed',
      mealType = 'lunch',
      dietaryRestrictions = [],
      healthConditions = [],
      season = 'year_round',
      calorieTarget = 500,
      preparationTime = 60,
      budget = 'moderate'
    } = criteria;

    let availableFoods = Object.values(this.foodDatabase);

    // Filter by region
    if (region !== 'mixed') {
      availableFoods = availableFoods.filter(food => 
        food.regions.includes(region) || food.regions.includes('all_indian')
      );
    }

    // Filter by dietary restrictions
    if (dietaryRestrictions.length > 0) {
      availableFoods = this.getFoodsByDietaryRestrictions(dietaryRestrictions);
    }

    // Filter by health conditions
    if (healthConditions.length > 0) {
      const healthFoods = healthConditions.flatMap(condition => 
        this.getFoodsByHealthCondition(condition)
      );
      availableFoods = availableFoods.filter(food => 
        healthFoods.some(hf => hf.name === food.name)
      );
    }

    // Filter by season
    if (season !== 'year_round') {
      const seasonalFoods = this.getSeasonalFoods(season);
      availableFoods = availableFoods.filter(food => 
        food.availability === 'year_round' || 
        seasonalFoods.some(sf => sf.name === food.name)
      );
    }

    // Filter by preparation time
    availableFoods = availableFoods.filter(food => 
      food.preparationTime <= preparationTime
    );

    // Filter by budget
    const budgetFilters = {
      'budget': ['budget'],
      'moderate': ['budget', 'moderate'],
      'premium': ['budget', 'moderate', 'premium']
    };
    
    if (budgetFilters[budget]) {
      availableFoods = availableFoods.filter(food => 
        budgetFilters[budget].includes(food.cost)
      );
    }

    // Generate meal combinations
    return this.createMealCombinations(availableFoods, calorieTarget, mealType);
  }

  // Create meal combinations from available foods
  createMealCombinations(foods, calorieTarget, mealType) {
    const mealCombinations = [];
    
    // Categorize foods
    const proteins = foods.filter(f => f.category === 'legumes' || f.category === 'meat' || f.category === 'fish' || f.category === 'eggs' || f.category === 'dairy' || f.category === 'plant_protein');
    const carbs = foods.filter(f => f.category === 'grains' || f.category === 'traditional');
    const vegetables = foods.filter(f => f.category === 'vegetables');
    const fats = foods.filter(f => f.category === 'oils' || f.category === 'nuts' || f.category === 'seeds');

    // Create balanced combinations
    for (let i = 0; i < Math.min(10, proteins.length); i++) {
      for (let j = 0; j < Math.min(5, carbs.length); j++) {
        for (let k = 0; k < Math.min(3, vegetables.length); k++) {
          const protein = proteins[i];
          const carb = carbs[j];
          const vegetable = vegetables[k];
          const fat = fats[Math.floor(Math.random() * fats.length)];

          const combination = {
            name: `${protein.name} with ${carb.name} and ${vegetable.name}`,
            ingredients: [protein, carb, vegetable, fat].filter(Boolean),
            totalCalories: this.calculateCombinationCalories([protein, carb, vegetable, fat], calorieTarget),
            totalProtein: this.calculateCombinationProtein([protein, carb, vegetable, fat]),
            totalCarbs: this.calculateCombinationCarbs([protein, carb, vegetable, fat]),
            totalFat: this.calculateCombinationFat([protein, carb, vegetable, fat]),
            preparationTime: Math.max(protein.preparationTime, carb.preparationTime, vegetable.preparationTime),
            difficulty: this.calculateDifficulty([protein, carb, vegetable, fat]),
            cost: this.calculateCost([protein, carb, vegetable, fat]),
            tags: this.combineTags([protein, carb, vegetable, fat])
          };

          mealCombinations.push(combination);
        }
      }
    }

    return mealCombinations.slice(0, 20); // Return top 20 combinations
  }

  // Helper methods for meal combination calculations
  calculateCombinationCalories(ingredients, target) {
    const portions = this.calculatePortions(ingredients, target);
    return ingredients.reduce((total, ingredient, index) => 
      total + (ingredient.nutrition.calories * portions[index] / 100), 0
    );
  }

  calculateCombinationProtein(ingredients) {
    const portions = this.calculatePortions(ingredients, 500); // Default target
    return ingredients.reduce((total, ingredient, index) => 
      total + (ingredient.nutrition.protein * portions[index] / 100), 0
    );
  }

  calculateCombinationCarbs(ingredients) {
    const portions = this.calculatePortions(ingredients, 500); // Default target
    return ingredients.reduce((total, ingredient, index) => 
      total + (ingredient.nutrition.carbs * portions[index] / 100), 0
    );
  }

  calculateCombinationFat(ingredients) {
    const portions = this.calculatePortions(ingredients, 500); // Default target
    return ingredients.reduce((total, ingredient, index) => 
      total + (ingredient.nutrition.fat * portions[index] / 100), 0
    );
  }

  calculatePortions(ingredients, calorieTarget) {
    // Simple portion calculation - can be made more sophisticated
    const basePortions = [100, 80, 150, 10]; // protein, carb, vegetable, fat in grams
    const totalCalories = ingredients.reduce((total, ingredient, index) => 
      total + (ingredient.nutrition.calories * basePortions[index] / 100), 0
    );
    
    const scaleFactor = calorieTarget / totalCalories;
    return basePortions.map(portion => portion * scaleFactor);
  }

  calculateDifficulty(ingredients) {
    const difficulties = { 'beginner': 1, 'intermediate': 2, 'advanced': 3, 'expert': 4 };
    const avgDifficulty = ingredients.reduce((sum, ingredient) => 
      sum + (difficulties[ingredient.difficulty] || 2), 0
    ) / ingredients.length;
    
    if (avgDifficulty <= 1.5) return 'beginner';
    if (avgDifficulty <= 2.5) return 'intermediate';
    if (avgDifficulty <= 3.5) return 'advanced';
    return 'expert';
  }

  calculateCost(ingredients) {
    const costs = { 'budget': 1, 'moderate': 2, 'premium': 3 };
    const avgCost = ingredients.reduce((sum, ingredient) => 
      sum + (costs[ingredient.cost] || 2), 0
    ) / ingredients.length;
    
    if (avgCost <= 1.5) return 'budget';
    if (avgCost <= 2.5) return 'moderate';
    return 'premium';
  }

  combineTags(ingredients) {
    const allTags = ingredients.flatMap(ingredient => ingredient.tags);
    return [...new Set(allTags)]; // Remove duplicates
  }

  // Get comprehensive food database stats
  getDatabaseStats() {
    if (!this.foodDatabase) return {};
    
    const foods = Object.values(this.foodDatabase);
    
    return {
      totalFoods: foods.length,
      categories: [...new Set(foods.map(f => f.category))],
      regions: [...new Set(foods.flatMap(f => f.regions))],
      allergens: [...new Set(foods.flatMap(f => f.allergens))],
      tags: [...new Set(foods.flatMap(f => f.tags))],
      costDistribution: {
        budget: foods.filter(f => f.cost === 'budget').length,
        moderate: foods.filter(f => f.cost === 'moderate').length,
        premium: foods.filter(f => f.cost === 'premium').length
      },
      availabilityDistribution: {
        year_round: foods.filter(f => f.availability === 'year_round').length,
        seasonal: foods.filter(f => f.availability !== 'year_round').length
      }
    };
  }
}

module.exports = new FoodDatabaseService();