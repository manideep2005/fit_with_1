#!/usr/bin/env node

/**
 * Payment Service Test Script
 * This script tests the payment service functionality
 */

const paymentService = require('./services/paymentService');

async function testPaymentService() {
  console.log('🧪 Testing Payment Service...\n');

  try {
    // Test 1: Check subscription plans
    console.log('1. Testing subscription plans:');
    const plans = Object.values(paymentService.subscriptionPlans);
    plans.forEach(plan => {
      console.log(`   - ${plan.name}: ₹${plan.price}/${plan.duration}`);
    });
    console.log('   ✅ Plans loaded successfully\n');

    // Test 2: Test UPI URL generation
    console.log('2. Testing UPI URL generation:');
    try {
      const upiUrl = paymentService.createUPIPaymentURL({
        payeeVPA: '8885800887@ptaxis',
        payeeName: 'Fit With AI',
        amount: 199,
        transactionId: 'TEST123',
        transactionNote: 'Test Payment'
      });
      console.log(`   UPI URL: ${upiUrl}`);
      console.log('   ✅ UPI URL generated successfully\n');
    } catch (error) {
      console.log(`   ❌ UPI URL generation failed: ${error.message}\n`);
    }

    // Test 3: Test QR code generation
    console.log('3. Testing QR code generation:');
    try {
      const qrResult = await paymentService.generatePaymentQR('test-user-123', 'basic', 199, 'RAZORPAY');
      console.log(`   Payment ID: ${qrResult.paymentId}`);
      console.log(`   Amount: ₹${qrResult.amount}`);
      console.log(`   Plan: ${qrResult.plan}`);
      console.log(`   QR Code: ${qrResult.qrCode ? 'Generated' : 'Failed'}`);
      console.log('   ✅ QR code generated successfully\n');

      // Test 4: Test payment verification
      console.log('4. Testing payment verification:');
      const verificationResult = await paymentService.verifyPayment(qrResult.paymentId, '123456');
      console.log(`   Verification result: ${verificationResult.success ? 'Success' : 'Failed'}`);
      if (verificationResult.success) {
        console.log(`   Transaction ID: ${verificationResult.transactionId}`);
        console.log('   ✅ Payment verification successful\n');
      } else {
        console.log(`   Error: ${verificationResult.error}\n`);
      }

    } catch (error) {
      console.log(`   ❌ QR code generation failed: ${error.message}\n`);
    }

    // Test 5: Test subscription status
    console.log('5. Testing subscription status:');
    const mockUser = {
      subscription: {
        plan: 'basic',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    };
    const status = paymentService.getSubscriptionStatus(mockUser);
    console.log(`   Plan: ${status.plan.name}`);
    console.log(`   Status: ${status.status}`);
    console.log(`   Active: ${status.isActive}`);
    console.log(`   Days remaining: ${status.daysRemaining}`);
    console.log('   ✅ Subscription status retrieved successfully\n');

    console.log('🎉 All payment service tests completed successfully!');

  } catch (error) {
    console.error('❌ Payment service test failed:', error);
    console.error('Error details:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testPaymentService();
}

module.exports = testPaymentService;