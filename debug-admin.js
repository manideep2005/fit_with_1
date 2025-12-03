#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

async function debugAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');

    // Find all admin accounts
    const admins = await Admin.find({});
    console.log('\n📋 Admin Accounts Found:', admins.length);
    
    admins.forEach((admin, index) => {
      console.log(`\n${index + 1}. Admin Account:`);
      console.log(`   ID: ${admin._id}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Active: ${admin.isActive}`);
      console.log(`   Login Attempts: ${admin.loginAttempts}`);
      console.log(`   Locked: ${admin.isLocked()}`);
      console.log(`   Last Login: ${admin.lastLogin || 'Never'}`);
      console.log(`   Created: ${admin.createdAt}`);
    });

    // Test password verification
    if (admins.length > 0) {
      const admin = admins[0];
      console.log('\n🔐 Testing Password Verification:');
      
      const testPasswords = ['admin123', 'Admin123', 'password', '123456'];
      
      for (const password of testPasswords) {
        try {
          const isMatch = await admin.comparePassword(password);
          console.log(`   "${password}": ${isMatch ? '✅ CORRECT' : '❌ Wrong'}`);
        } catch (error) {
          console.log(`   "${password}": ❌ Error - ${error.message}`);
        }
      }
    }

    console.log('\n🌐 Admin Panel URLs:');
    console.log('   Login: http://localhost:3009/admin/login');
    console.log('   Dashboard: http://localhost:3009/admin/dashboard');
    
    console.log('\n🔑 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    
    console.log('\n💡 Troubleshooting Tips:');
    console.log('   1. Clear browser cache and cookies');
    console.log('   2. Try incognito/private browsing mode');
    console.log('   3. Check browser console for JavaScript errors');
    console.log('   4. Ensure server is running on port 3009');
    console.log('   5. Try different browsers (Chrome, Firefox, Safari)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Debug error:', error);
    process.exit(1);
  }
}

debugAdmin();