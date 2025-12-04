#!/usr/bin/env node

// Installation script for Fit-With-AI dependencies
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Installing Fit-With-AI Dependencies...\n');

// Check if package.json exists
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found!');
    process.exit(1);
}

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
console.log('📦 Project:', packageJson.name);
console.log('📝 Version:', packageJson.version);

// List of critical dependencies for the gamification system
const criticalDeps = [
    'axios',
    'bcrypt', 
    'body-parser',
    'cors',
    'dotenv',
    'ejs',
    'express',
    'express-session',
    'jsonwebtoken',
    'mongoose',
    'nodemailer',
    'socket.io'
];

const optionalDeps = [
    'redis',
    'uuid',
    'node-cron',
    'crypto'
];

console.log('\n🔧 Installing dependencies...');

try {
    // Install all dependencies
    console.log('Installing all packages from package.json...');
    execSync('npm install', { stdio: 'inherit' });
    
    console.log('\n✅ All dependencies installed successfully!');
    
    // Verify critical dependencies
    console.log('\n🔍 Verifying critical dependencies...');
    let allGood = true;
    
    for (const dep of criticalDeps) {
        try {
            require.resolve(dep);
            console.log(`✅ ${dep}`);
        } catch (error) {
            console.log(`❌ ${dep} - MISSING`);
            allGood = false;
        }
    }
    
    console.log('\n🔍 Checking optional dependencies...');
    for (const dep of optionalDeps) {
        try {
            require.resolve(dep);
            console.log(`✅ ${dep}`);
        } catch (error) {
            console.log(`⚠️  ${dep} - Optional (not critical)`);
        }
    }
    
    if (allGood) {
        console.log('\n🎉 All critical dependencies are installed!');
        console.log('\n📋 Next steps:');
        console.log('1. Set up your .env file with database credentials');
        console.log('2. Start the server: npm start');
        console.log('3. Test the gamification system in the dashboard');
        
        console.log('\n🏆 Gamification Features Available:');
        console.log('- XP System (50 XP per workout, 25 XP per nutrition log)');
        console.log('- Level Progression (20+ levels)');
        console.log('- Streak Tracking (Workout & Nutrition streaks)');
        console.log('- Achievement System (10+ achievements)');
        console.log('- Health Rewards (Free checkups, discounts)');
        console.log('- Character Stats (Strength, Endurance, etc.)');
        console.log('- Interactive Widget (Click trophy icon in dashboard)');
    } else {
        console.log('\n❌ Some critical dependencies are missing. Please run:');
        console.log('npm install --save ' + criticalDeps.join(' '));
    }
    
} catch (error) {
    console.error('\n❌ Installation failed:', error.message);
    console.log('\n🔧 Try these troubleshooting steps:');
    console.log('1. Delete node_modules: rm -rf node_modules');
    console.log('2. Delete package-lock.json: rm package-lock.json');
    console.log('3. Clear npm cache: npm cache clean --force');
    console.log('4. Reinstall: npm install');
    process.exit(1);
}