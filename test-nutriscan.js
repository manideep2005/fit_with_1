const nutriScanService = require('./services/nutriScanService');

async function testNutriScan() {
    console.log('🧪 Testing NutriScan Service...\n');
    
    // Test 1: Validate barcode
    console.log('1. Testing barcode validation:');
    console.log('Valid barcode (8901030895559):', nutriScanService.validateBarcode('8901030895559'));
    console.log('Invalid barcode (123):', nutriScanService.validateBarcode('123'));
    console.log('Invalid barcode (null):', nutriScanService.validateBarcode(null));
    console.log('');
    
    // Test 2: Get fallback nutrition data
    console.log('2. Testing fallback nutrition data:');
    try {
        const nutrition = await nutriScanService.getNutritionByBarcode('8901030895559');
        if (nutrition) {
            console.log('✅ Found nutrition data for Maggi Noodles:');
            console.log(`   Product: ${nutrition.productName}`);
            console.log(`   Brand: ${nutrition.brand}`);
            console.log(`   Calories per 100g: ${nutrition.nutritionPer100g.calories}`);
            console.log(`   Protein per 100g: ${nutrition.nutritionPer100g.protein}g`);
        } else {
            console.log('❌ No nutrition data found');
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    console.log('');
    
    // Test 3: Calculate serving nutrition
    console.log('3. Testing serving calculation:');
    try {
        const nutrition = await nutriScanService.getNutritionByBarcode('8901030895559');
        if (nutrition) {
            const serving = nutriScanService.calculateServingNutrition(nutrition, 70); // 70g serving
            console.log('✅ Nutrition for 70g serving:');
            console.log(`   Calories: ${serving.calories}`);
            console.log(`   Protein: ${serving.protein}g`);
            console.log(`   Carbs: ${serving.carbohydrates}g`);
            console.log(`   Fat: ${serving.fat}g`);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    console.log('');
    
    // Test 4: Get popular products
    console.log('4. Testing popular products:');
    try {
        const popular = nutriScanService.getPopularProducts();
        console.log(`✅ Found ${popular.length} popular products:`);
        popular.forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.productName} (${product.brand})`);
        });
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    console.log('');
    
    // Test 5: Search products (this will likely fail without internet, but we can test the function)
    console.log('5. Testing product search:');
    try {
        const searchResults = await nutriScanService.searchProducts('milk', 3);
        if (searchResults.length > 0) {
            console.log(`✅ Found ${searchResults.length} products for "milk":`);
            searchResults.forEach((product, index) => {
                console.log(`   ${index + 1}. ${product.productName} (${product.brand})`);
            });
        } else {
            console.log('⚠️  No search results (this is expected without internet connection)');
        }
    } catch (error) {
        console.log('⚠️  Search failed (this is expected without internet connection):', error.message);
    }
    console.log('');
    
    // Test 6: Get nutrition recommendations
    console.log('6. Testing nutrition recommendations:');
    try {
        const nutrition = await nutriScanService.getNutritionByBarcode('8901030895559');
        if (nutrition) {
            const userGoals = { primaryGoal: 'weight-loss' };
            const recommendations = nutriScanService.getNutritionRecommendations(userGoals, nutrition);
            console.log('✅ Recommendations for weight-loss goal:');
            console.log(`   Suitable: ${recommendations.suitable}`);
            console.log(`   Score: ${recommendations.score}/100`);
            console.log(`   Warnings: ${recommendations.warnings.length}`);
            console.log(`   Suggestions: ${recommendations.suggestions.length}`);
            if (recommendations.warnings.length > 0) {
                recommendations.warnings.forEach(warning => {
                    console.log(`     ⚠️  ${warning}`);
                });
            }
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    console.log('\n🎉 NutriScan testing completed!');
}

// Run the test
testNutriScan().catch(console.error);