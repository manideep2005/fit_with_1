require('dotenv').config();

async function testOTPGeneration() {
    try {
        console.log('🧪 Testing OTP generation and email sending...');
        
        // Test 1: Check environment variables
        console.log('\n1. Environment Check:');
        console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
        console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
        
        // Test 2: Generate OTP
        const { generateOTP } = require('./services/emailService');
        const otp = generateOTP();
        console.log('\n2. Generated OTP:', otp);
        
        // Test 3: Test email connection
        const { testEmailConnection } = require('./services/emailService');
        console.log('\n3. Testing email connection...');
        const connectionResult = await testEmailConnection();
        console.log('Connection result:', connectionResult);
        
        if (!connectionResult) {
            console.log('❌ Email connection failed - cannot send OTP');
            return;
        }
        
        // Test 4: Send OTP email
        console.log('\n4. Sending OTP email...');
        const { sendEmailVerificationOTP } = require('./services/emailService');
        const emailResult = await sendEmailVerificationOTP(
            'manideepgonugunta2004@gmail.com',
            'Test User',
            otp
        );
        
        console.log('Email result:', emailResult);
        
        if (emailResult.success) {
            console.log('✅ OTP email sent successfully!');
            console.log('Check your email for the OTP:', otp);
        } else {
            console.log('❌ Failed to send OTP email');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testOTPGeneration();