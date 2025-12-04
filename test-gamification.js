// Simple test script to verify gamification functionality
const express = require('express');
const app = express();

// Test the gamification widget JavaScript file
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Gamification System...\n');

// 1. Check if gamification widget file exists and is complete
const widgetPath = path.join(__dirname, 'public', 'js', 'gamification-widget.js');
if (fs.existsSync(widgetPath)) {
    const widgetContent = fs.readFileSync(widgetPath, 'utf8');
    console.log('✅ Gamification widget file exists');
    console.log(`📄 File size: ${widgetContent.length} characters`);
    
    // Check for key methods
    const requiredMethods = [
        'constructor',
        'generateXPTable',
        'calculateLevel',
        'init',
        'loadGamificationData',
        'createWidget',
        'updateWidget',
        'toggle',
        'show',
        'hide'
    ];
    
    const missingMethods = requiredMethods.filter(method => !widgetContent.includes(method));
    
    if (missingMethods.length === 0) {
        console.log('✅ All required methods found in widget');
    } else {
        console.log('❌ Missing methods:', missingMethods);
    }
    
    // Check if the file is complete (should end with proper closing)
    if (widgetContent.includes('gamificationWidget = new GamificationWidget()')) {
        console.log('✅ Widget initialization code found');
    } else {
        console.log('❌ Widget initialization code missing');
    }
} else {
    console.log('❌ Gamification widget file not found');
}

// 2. Check if gamification service exists
const servicePath = path.join(__dirname, 'services', 'gamificationService.js');
if (fs.existsSync(servicePath)) {
    console.log('✅ Gamification service file exists');
    
    try {
        const gamificationService = require('./services/gamificationService');
        console.log('✅ Gamification service loaded successfully');
        
        // Test XP values
        if (gamificationService.XP_VALUES) {
            console.log('✅ XP values configured:', Object.keys(gamificationService.XP_VALUES).length, 'types');
        }
        
        // Test achievements
        if (gamificationService.ACHIEVEMENTS) {
            console.log('✅ Achievements configured:', Object.keys(gamificationService.ACHIEVEMENTS).length, 'achievements');
        }
    } catch (error) {
        console.log('❌ Error loading gamification service:', error.message);
    }
} else {
    console.log('❌ Gamification service file not found');
}

// 3. Check if dashboard includes the widget
const dashboardPath = path.join(__dirname, 'views', 'dashboard.ejs');
if (fs.existsSync(dashboardPath)) {
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    if (dashboardContent.includes('gamification-widget.js')) {
        console.log('✅ Gamification widget included in dashboard');
    } else {
        console.log('❌ Gamification widget not included in dashboard');
    }
    
    if (dashboardContent.includes('gamificationBtn')) {
        console.log('✅ Gamification button found in dashboard');
    } else {
        console.log('❌ Gamification button not found in dashboard');
    }
} else {
    console.log('❌ Dashboard file not found');
}

// 4. Test API endpoint structure
console.log('\n🔗 API Endpoints to verify:');
console.log('- GET /api/gamification-data');
console.log('- POST /api/gamification/track-visit');
console.log('- POST /api/gamification/track-action');

console.log('\n📋 Gamification Features Checklist:');
console.log('□ XP System (Workout: 50 XP, Nutrition: 25 XP)');
console.log('□ Level Progression (20+ levels)');
console.log('□ Streak Tracking (Workout & Nutrition)');
console.log('□ Achievement System (10+ achievements)');
console.log('□ Character Stats (Strength, Endurance, etc.)');
console.log('□ Reward System (Health & Fitness rewards)');
console.log('□ Widget UI (Toggle, Progress bars, etc.)');

console.log('\n🚀 To test the system:');
console.log('1. Start the server: npm start');
console.log('2. Login to dashboard');
console.log('3. Click the gamification button (trophy icon)');
console.log('4. Log a workout or nutrition entry');
console.log('5. Check for XP gain and level progression');

console.log('\n✨ Test completed!');