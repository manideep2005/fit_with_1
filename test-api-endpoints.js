const fetch = require('node-fetch');

async function testAPIEndpoints() {
    console.log('🧪 Testing NutriScan API Endpoints...\n');
    
    const baseUrl = 'http://localhost:3007';
    
    // Test data
    const testBarcode = '8901030895559'; // Maggi Noodles
    const testQuery = 'Milky Bar';
    
    console.log('1. Testing Barcode API Endpoint');
    console.log('================================');
    
    try {
        const barcodeUrl = `${baseUrl}/api/nutriscan/barcode/${testBarcode}`;
        console.log(`Making request to: ${barcodeUrl}`);
        
        const response = await fetch(barcodeUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'fit-with-ai-session=test-session' // Mock session
            }
        });
        
        console.log(`Response Status: ${response.status}`);
        console.log(`Response Headers:`, response.headers.raw());
        
        if (response.status === 401) {
            console.log('❌ Authentication required - this is expected');
            console.log('   The API requires user authentication');
        } else if (response.status === 200) {
            const data = await response.json();
            console.log('✅ Success! Response:', JSON.stringify(data, null, 2));
        } else {
            const text = await response.text();
            console.log(`❌ Error ${response.status}:`, text);
        }
        
    } catch (error) {
        console.log('❌ Network Error:', error.message);
    }
    
    console.log('\n2. Testing Search API Endpoint');
    console.log('==============================');
    
    try {
        const searchUrl = `${baseUrl}/api/nutriscan/search?q=${encodeURIComponent(testQuery)}`;
        console.log(`Making request to: ${searchUrl}`);
        
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'fit-with-ai-session=test-session'
            }
        });
        
        console.log(`Response Status: ${response.status}`);
        
        if (response.status === 401) {
            console.log('❌ Authentication required - this is expected');
        } else if (response.status === 200) {
            const data = await response.json();
            console.log('✅ Success! Response:', JSON.stringify(data, null, 2));
        } else {
            const text = await response.text();
            console.log(`❌ Error ${response.status}:`, text);
        }
        
    } catch (error) {
        console.log('❌ Network Error:', error.message);
    }
    
    console.log('\n3. Testing Popular Products API Endpoint');
    console.log('========================================');
    
    try {
        const popularUrl = `${baseUrl}/api/nutriscan/popular`;
        console.log(`Making request to: ${popularUrl}`);
        
        const response = await fetch(popularUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'fit-with-ai-session=test-session'
            }
        });
        
        console.log(`Response Status: ${response.status}`);
        
        if (response.status === 401) {
            console.log('❌ Authentication required - this is expected');
        } else if (response.status === 200) {
            const data = await response.json();
            console.log('✅ Success! Response:', JSON.stringify(data, null, 2));
        } else {
            const text = await response.text();
            console.log(`❌ Error ${response.status}:`, text);
        }
        
    } catch (error) {
        console.log('❌ Network Error:', error.message);
    }
    
    console.log('\n4. Testing Health Check Endpoint');
    console.log('================================');
    
    try {
        const healthUrl = `${baseUrl}/api/health`;
        console.log(`Making request to: ${healthUrl}`);
        
        const response = await fetch(healthUrl);
        console.log(`Response Status: ${response.status}`);
        
        if (response.status === 200) {
            const data = await response.json();
            console.log('✅ Server is running! Response:', JSON.stringify(data, null, 2));
        } else {
            const text = await response.text();
            console.log(`❌ Error ${response.status}:`, text);
        }
        
    } catch (error) {
        console.log('❌ Network Error:', error.message);
        console.log('   Server might not be running on port 3007');
    }
    
    console.log('\n📋 DIAGNOSIS:');
    console.log('=============');
    console.log('If you see 401 errors above, it means:');
    console.log('✅ The API endpoints are working correctly');
    console.log('✅ The server is running properly');
    console.log('❌ Authentication is required to access NutriScan');
    console.log('');
    console.log('To fix the web interface:');
    console.log('1. Make sure you are logged in to the app');
    console.log('2. Navigate to /nutriscan page');
    console.log('3. Check browser console for JavaScript errors');
    console.log('4. Verify the session token is being passed correctly');
}

// Run the test
testAPIEndpoints().catch(console.error);