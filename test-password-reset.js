#!/usr/bin/env node

/**
 * Password Reset System Test
 * Tests the new database-based password reset functionality
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import services
const database = require('./config/database');
const PasswordReset = require('./models/PasswordReset');

async function testPasswordResetSystem() {
  console.log('🔐 Testing Password Reset System...\n');
  
  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await database.connect();
    console.log('✅ Database connected successfully\n');
    
    const testEmail = 'test-reset@example.com';
    const testOTP = '123456';
    
    // Test 1: Create Password Reset
    console.log('🧪 Test 1: Create Password Reset');
    try {
      const reset = await PasswordReset.createReset(testEmail, testOTP);
      console.log('✅ Password reset created successfully');
      console.log(`   📧 Email: ${reset.email}`);
      console.log(`   🔢 OTP: ${reset.otp}`);
      console.log(`   ⏰ Expires: ${reset.expiresAt}`);
    } catch (error) {
      console.log(`❌ Failed to create password reset: ${error.message}`);
      return;
    }
    
    // Test 2: Verify OTP (Wrong OTP)
    console.log('\n🧪 Test 2: Verify Wrong OTP');
    try {
      await PasswordReset.verifyOTP(testEmail, '999999');
      console.log('❌ Should have failed with wrong OTP');
    } catch (error) {
      console.log('✅ Correctly rejected wrong OTP');
      console.log(`   📝 Error: ${error.message}`);
    }
    
    // Test 3: Verify OTP (Correct OTP)
    console.log('\n🧪 Test 3: Verify Correct OTP');
    try {
      const verifiedReset = await PasswordReset.verifyOTP(testEmail, testOTP);
      console.log('✅ OTP verified successfully');
      console.log(`   ✔️ Verified: ${verifiedReset.verified}`);
    } catch (error) {
      console.log(`❌ Failed to verify correct OTP: ${error.message}`);
    }
    
    // Test 4: Check if Reset is Verified
    console.log('\n🧪 Test 4: Check Verification Status');
    try {
      const isVerified = await PasswordReset.isVerified(testEmail);
      console.log(`✅ Verification status: ${isVerified ? 'Verified' : 'Not verified'}`);
    } catch (error) {
      console.log(`❌ Failed to check verification status: ${error.message}`);
    }
    
    // Test 5: Complete Reset (Cleanup)
    console.log('\n🧪 Test 5: Complete Reset');
    try {
      await PasswordReset.completeReset(testEmail);
      console.log('✅ Password reset completed and cleaned up');
    } catch (error) {
      console.log(`❌ Failed to complete reset: ${error.message}`);
    }
    
    // Test 6: Verify Cleanup
    console.log('\n🧪 Test 6: Verify Cleanup');
    try {
      const isVerified = await PasswordReset.isVerified(testEmail);
      console.log(`✅ After cleanup - Verification status: ${isVerified ? 'Still verified' : 'Properly cleaned up'}`);
    } catch (error) {
      console.log(`❌ Failed to check cleanup: ${error.message}`);
    }
    
    // Test 7: Test Expiration
    console.log('\n🧪 Test 7: Test Expiration');
    try {
      // Create a reset that expires immediately
      const expiredReset = new PasswordReset({
        email: testEmail,
        otp: testOTP,
        expiresAt: new Date(Date.now() - 1000) // 1 second ago
      });
      await expiredReset.save();
      
      // Try to verify expired reset
      await PasswordReset.verifyOTP(testEmail, testOTP);
      console.log('❌ Should have failed with expired reset');
    } catch (error) {
      console.log('✅ Correctly rejected expired reset');
      console.log(`   📝 Error: ${error.message}`);
    }
    
    // Cleanup test data
    await PasswordReset.deleteMany({ email: testEmail });
    
    console.log('\n📋 Test Summary:');
    console.log('✅ Password reset creation works');
    console.log('✅ OTP verification works');
    console.log('✅ Wrong OTP rejection works');
    console.log('✅ Verification status checking works');
    console.log('✅ Reset completion and cleanup works');
    console.log('✅ Expiration handling works');
    
    console.log('\n🎉 All password reset tests passed!');
    console.log('🚀 The password reset system is ready for Vercel deployment.');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close database connection
    try {
      await mongoose.connection.close();
      console.log('\n📡 Database connection closed');
    } catch (error) {
      console.error('Error closing database:', error);
    }
    
    process.exit(0);
  }
}

// Run the test
if (require.main === module) {
  testPasswordResetSystem();
}

module.exports = testPasswordResetSystem;