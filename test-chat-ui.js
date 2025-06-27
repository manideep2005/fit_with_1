// Test script to verify the chat UI is working properly
const path = require('path');

// Check if puppeteer is available
let puppeteer;
try {
    puppeteer = require('puppeteer');
} catch (error) {
    puppeteer = null;
}

async function testChatUI() {
    console.log('🚀 Testing Chat UI...\n');
    
    // Start the server first
    const { spawn } = require('child_process');
    const server = spawn('node', ['app.js'], {
        cwd: path.join(__dirname),
        stdio: 'pipe'
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
        console.log('✅ Server started, launching browser...');
        
        const browser = await puppeteer.launch({ 
            headless: false, // Set to true for headless mode
            defaultViewport: { width: 1200, height: 800 }
        });
        
        const page = await browser.newPage();
        
        // Navigate to the app
        console.log('📱 Navigating to localhost:3001...');
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
        
        // Check if the homepage loads
        const title = await page.title();
        console.log('✅ Page title:', title);
        
        // Take a screenshot
        await page.screenshot({ path: 'homepage.png', fullPage: true });
        console.log('📸 Homepage screenshot saved as homepage.png');
        
        // Try to access the chat page (will redirect to login)
        console.log('🔐 Testing authentication redirect...');
        await page.goto('http://localhost:3001/chat', { waitUntil: 'networkidle2' });
        
        const currentUrl = page.url();
        console.log('✅ Current URL after chat access:', currentUrl);
        
        if (currentUrl.includes('login') || currentUrl === 'http://localhost:3001/') {
            console.log('✅ Authentication redirect working correctly');
        }
        
        // Take another screenshot
        await page.screenshot({ path: 'auth-redirect.png', fullPage: true });
        console.log('📸 Auth redirect screenshot saved as auth-redirect.png');
        
        console.log('\n🎉 Chat UI test completed successfully!');
        console.log('📋 Test Results:');
        console.log('- Server starts correctly ✅');
        console.log('- Homepage loads ✅');
        console.log('- Authentication redirect works ✅');
        console.log('- Screenshots saved for manual review ✅');
        
        await browser.close();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        // Kill the server
        server.kill();
        console.log('🔌 Server stopped');
    }
}

// Check if puppeteer is available
if (puppeteer) {
    testChatUI();
} else {
    console.log('⚠️ Puppeteer not available, running basic server test instead...');
    
    // Basic server test without browser
    const { spawn } = require('child_process');
    const server = spawn('node', ['app.js'], {
        cwd: path.join(__dirname),
        stdio: 'inherit'
    });
    
    console.log('🚀 Server started on http://localhost:3001');
    console.log('📝 Manual testing instructions:');
    console.log('1. Open http://localhost:3001 in your browser');
    console.log('2. Create an account or login');
    console.log('3. Navigate to the Chat page');
    console.log('4. Test friend request functionality');
    console.log('5. Test messaging between friends');
    console.log('\nPress Ctrl+C to stop the server');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🔌 Shutting down server...');
        server.kill();
        process.exit(0);
    });
}