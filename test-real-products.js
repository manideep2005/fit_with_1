const nutriScanService = require('./services/nutriScanService');

async function testRealProducts() {
    console.log('🧪 Testing NutriScan with Real Product Barcodes...\n');
    
    // Real product barcodes from different countries/brands
    const realBarcodes = [
        '8901030895559', // Maggi 2-Minute Noodles (India)
        '8901030827365', // Britannia Biscuits (India) 
        '8901030827372', // Amul Milk (India)
        '3017620422003', // Nutella (International)
        '5449000000996', // Coca-Cola (International)
        '8901030895566', // Another Maggi variant
        '7622210951557', // Oreo cookies (International)
        '8901030827389', // Another Amul product
    ];
    
    console.log('Testing with real product barcodes from OpenFoodFacts database:\n');
    
    for (let i = 0; i < realBarcodes.length; i++) {
        const barcode = realBarcodes[i];
        console.log(`${i + 1}. Testing barcode: ${barcode}`);
        
        try {
            const nutrition = await nutriScanService.getNutritionByBarcode(barcode);
            
            if (nutrition) {
                console.log(`   ✅ Found: ${nutrition.productName}`);
                console.log(`   🏷️  Brand: ${nutrition.brand}`);
                console.log(`   🔥 Calories: ${nutrition.nutritionPer100g.calories} per 100g`);
                console.log(`   🥩 Protein: ${nutrition.nutritionPer100g.protein}g per 100g`);
                
                if (nutrition.imageUrl) {
                    console.log(`   📸 Has product image: Yes`);
                }
                
                // Test serving calculation
                const serving = nutriScanService.calculateServingNutrition(nutrition, 50);
                console.log(`   📊 For 50g serving: ${serving.calories} calories, ${serving.protein}g protein`);
            } else {
                console.log(`   ❌ Product not found in database`);
            }
            
        } catch (error) {
            console.log(`   ⚠️  Error: ${error.message}`);
        }
        
        console.log(''); // Empty line for readability
        
        // Add small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('🎉 Real product testing completed!');
    console.log('\n📝 Note: Products not found might be:');
    console.log('   - Regional products not in OpenFoodFacts database yet');
    console.log('   - Invalid/test barcodes');
    console.log('   - Network connectivity issues');
    console.log('\n🌟 The system will work with ANY product that has nutrition data in OpenFoodFacts!');
}

// Run the test
testRealProducts().catch(console.error);