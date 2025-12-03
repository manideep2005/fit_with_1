require('dotenv').config();
const { sendEmailVerificationOTP, testEmailConnection, generateOTP } = require('./services/emailService');

async function testEmailDirect() {
    try {
        console.log('🧪 Testing email service directly...');
        
        // Test 1: Check environment variables
        console.log('\n1. Environment Variables:');
        console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
        console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set (length: ' + process.env.EMAIL_PASS.length + ')' : 'Not set');
        
        // Test 2: Test connection
        console.log('\n2. Testing email connection...');
        const connectionResult = await testEmailConnection();
        console.log('Connection result:', connectionResult);
        
        if (!connectionResult) {
            console.error('❌ Email connection failed - cannot proceed with email test');
            return;
        }
        
        // Test 3: Generate OTP
        console.log('\n3. Generating OTP...');
        const otp = generateOTP();
        console.log('Generated OTP:', otp);
        
        // Test 4: Send OTP email
        console.log('\n4. Sending OTP email...');
        const testEmail = 'manideepgonugunta2004@gmail.com';
        const testName = 'Test User';
        
        const emailResult = await sendEmailVerificationOTP(testEmail, testName, otp);
        console.log('Email result:', emailResult);
        
        if (emailResult.success) {
            console.log('✅ OTP email sent successfully!');
            console.log('Message ID:', emailResult.messageId);
        } else {
            console.log('❌ OTP email failed:', emailResult.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

testEmailDirect();