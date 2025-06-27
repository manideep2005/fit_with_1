const nutriScanService = require('./services/nutriScanService');

async function test50Products() {
    console.log('🧪 Testing NutriScan with 50+ Products...\n');
    
    // List of 50+ popular products to test
    const testProducts = [
        // Chocolates & Confectionery
        'Milky Bar',
        'Kit Kat',
        'Dairy Milk',
        'Snickers',
        'Mars Bar',
        'Twix',
        'Bounty',
        'Ferrero Rocher',
        'Toblerone',
        'Hersheys',
        
        // Biscuits & Cookies
        'Oreo',
        'Parle G',
        'Britannia Good Day',
        'Monaco',
        'Marie Gold',
        'Digestive',
        'Bourbon',
        'Hide and Seek',
        'Tiger',
        'Krackjack',
        
        // Beverages
        'Coca Cola',
        'Pepsi',
        'Sprite',
        'Fanta',
        'Mountain Dew',
        'Red Bull',
        'Monster Energy',
        'Tropicana',
        'Real Juice',
        'Frooti',
        
        // Dairy Products
        'Amul Milk',
        'Mother Dairy',
        'Nestle Milk',
        'Amul Butter',
        'Britannia Cheese',
        'Amul Cheese',
        'Yogurt',
        'Paneer',
        'Cream',
        'Ghee',
        
        // Instant Foods
        'Maggi Noodles',
        'Top Ramen',
        'Yippee Noodles',
        'Pasta',
        'Cornflakes',
        'Chocos',
        'Oats',
        'Poha',
        'Upma Mix',
        'Idli Mix',
        
        // Snacks
        'Lays Chips',
        'Kurkure',
        'Cheetos',
        'Pringles',
        'Haldirams Namkeen',
        'Bikaji',
        'Uncle Chips',
        'Bingo',
        'Too Yumm',
        'Balaji Wafers'
    ];
    
    console.log(`Testing ${testProducts.length} products:\n`);
    
    let successCount = 0;
    let failureCount = 0;
    const results = [];
    
    for (let i = 0; i < testProducts.length; i++) {
        const product = testProducts[i];
        console.log(`${i + 1}. Testing: ${product}`);
        
        try {
            // Search for the product
            const searchResults = await nutriScanService.searchProducts(product, 3);
            
            if (searchResults && searchResults.length > 0) {
                console.log(`   ✅ Found ${searchResults.length} results`);
                
                // Display first result details
                const firstResult = searchResults[0];
                console.log(`   📦 Product: ${firstResult.productName}`);
                console.log(`   🏷️  Brand: ${firstResult.brand}`);
                console.log(`   🔥 Calories: ${firstResult.nutritionPer100g.calories}/100g`);
                console.log(`   🥩 Protein: ${firstResult.nutritionPer100g.protein}g/100g`);
                console.log(`   🍞 Carbs: ${firstResult.nutritionPer100g.carbohydrates}g/100g`);
                console.log(`   🧈 Fat: ${firstResult.nutritionPer100g.fat}g/100g`);
                
                // Test serving calculation
                const serving = nutriScanService.calculateServingNutrition(firstResult, 50);
                if (serving) {
                    console.log(`   📊 For 50g: ${serving.calories} cal, ${serving.protein}g protein`);
                }
                
                // Test recommendations
                const userGoals = { primaryGoal: 'weight-loss' };
                const recommendations = nutriScanService.getNutritionRecommendations(userGoals, firstResult);
                console.log(`   💡 Health Score: ${recommendations.score}/100`);
                
                results.push({
                    query: product,
                    success: true,
                    productName: firstResult.productName,
                    brand: firstResult.brand,
                    calories: firstResult.nutritionPer100g.calories,
                    protein: firstResult.nutritionPer100g.protein,
                    healthScore: recommendations.score
                });
                
                successCount++;
            } else {
                console.log(`   ❌ No results found`);
                results.push({
                    query: product,
                    success: false,
                    reason: 'No results found'
                });
                failureCount++;
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            results.push({
                query: product,
                success: false,
                reason: error.message
            });
            failureCount++;
        }
        
        console.log(''); // Empty line for readability
        
        // Add small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary Report
    console.log('📊 SUMMARY REPORT');
    console.log('='.repeat(50));
    console.log(`Total Products Tested: ${testProducts.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📈 Success Rate: ${((successCount / testProducts.length) * 100).toFixed(1)}%`);
    
    // Top 10 Highest Calorie Products
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length > 0) {
        console.log('\n🔥 TOP 10 HIGHEST CALORIE PRODUCTS:');
        const sortedByCalories = successfulResults
            .sort((a, b) => b.calories - a.calories)
            .slice(0, 10);
        
        sortedByCalories.forEach((result, index) => {
            console.log(`${index + 1}. ${result.productName} (${result.brand}) - ${result.calories} cal/100g`);
        });
        
        // Top 10 Highest Protein Products
        console.log('\n🥩 TOP 10 HIGHEST PROTEIN PRODUCTS:');
        const sortedByProtein = successfulResults
            .sort((a, b) => b.protein - a.protein)
            .slice(0, 10);
        
        sortedByProtein.forEach((result, index) => {
            console.log(`${index + 1}. ${result.productName} (${result.brand}) - ${result.protein}g protein/100g`);
        });
        
        // Top 10 Healthiest Products (by health score)
        console.log('\n💚 TOP 10 HEALTHIEST PRODUCTS:');
        const sortedByHealth = successfulResults
            .sort((a, b) => b.healthScore - a.healthScore)
            .slice(0, 10);
        
        sortedByHealth.forEach((result, index) => {
            console.log(`${index + 1}. ${result.productName} (${result.brand}) - Score: ${result.healthScore}/100`);
        });
    }
    
    // Failed Products Report
    const failedResults = results.filter(r => !r.success);
    if (failedResults.length > 0) {
        console.log('\n❌ FAILED PRODUCTS:');
        failedResults.forEach((result, index) => {
            console.log(`${index + 1}. ${result.query} - ${result.reason}`);
        });
        
        console.log('\n💡 Note: Some failures are expected due to:');
        console.log('   - Regional products not in OpenFoodFacts database');
        console.log('   - Network connectivity issues');
        console.log('   - Spelling variations in product names');
        console.log('   - API rate limiting');
    }
    
    console.log('\n🎉 Testing completed!');
    console.log('\n📝 Recommendations for improving results:');
    console.log('   1. Add more fallback data for popular Indian products');
    console.log('   2. Implement fuzzy search for better matching');
    console.log('   3. Add barcode database for instant recognition');
    console.log('   4. Cache successful searches for faster responses');
    
    return {
        totalTested: testProducts.length,
        successful: successCount,
        failed: failureCount,
        successRate: ((successCount / testProducts.length) * 100).toFixed(1),
        results: results
    };
}

// Special test for Milky Bar specifically
async function testMilkyBarSpecifically() {
    console.log('🍫 SPECIAL TEST: Milky Bar Search\n');
    
    const milkyBarVariations = [
        'Milky Bar',
        'Milkybar',
        'Nestle Milky Bar',
        'Milky Bar White Chocolate',
        'Milky Bar Buttons',
        'Milky Bar Mini'
    ];
    
    for (const variation of milkyBarVariations) {
        console.log(`Testing: "${variation}"`);
        try {
            const results = await nutriScanService.searchProducts(variation, 5);
            if (results && results.length > 0) {
                console.log(`✅ Found ${results.length} results:`);
                results.forEach((product, index) => {
                    console.log(`   ${index + 1}. ${product.productName} (${product.brand})`);
                    console.log(`      Calories: ${product.nutritionPer100g.calories}/100g`);
                    console.log(`      Sugar: ${product.nutritionPer100g.sugar}g/100g`);
                });
            } else {
                console.log('❌ No results found');
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        console.log('');
    }
}

// Run the tests
async function runAllTests() {
    try {
        // First test Milky Bar specifically
        await testMilkyBarSpecifically();
        
        console.log('\n' + '='.repeat(60) + '\n');
        
        // Then run the comprehensive 50+ product test
        const summary = await test50Products();
        
        // Save results to file
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `nutriscan-test-results-${timestamp}.json`;
        
        fs.writeFileSync(filename, JSON.stringify(summary, null, 2));
        console.log(`\n💾 Results saved to: ${filename}`);
        
    } catch (error) {
        console.error('Test execution error:', error);
    }
}

// Execute the tests
runAllTests().catch(console.error);