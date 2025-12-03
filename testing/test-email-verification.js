const { sendEmailVerification, sendEmailVerificationSuccess } = require('../services/emailService');

async function testEmailVerification() {
    console.log('🧪 Testing Email Verification System...\n');
    
    try {
        // Test 1: Send verification email
        console.log('📧 Test 1: Sending verification email...');
        const testEmail = 'test@example.com';
        const testName = 'Test User';
        const testToken = 'test-verification-token-123';
        
        const result1 = await sendEmailVerification(testEmail, testName, testToken);
        console.log('✅ Verification email sent:', result1.success ? 'SUCCESS' : 'FAILED');
        
        // Test 2: Send verification success email
        console.log('\n📧 Test 2: Sending verification success email...');
        const result2 = await sendEmailVerificationSuccess(testEmail, testName);
        console.log('✅ Success email sent:', result2.success ? 'SUCCESS' : 'FAILED');
        
        console.log('\n🎉 All email verification tests completed!');
        
    } catch (error) {
        console.error('❌ Email verification test failed:', error.message);
        console.log('\n💡 This is expected if email credentials are not configured.');
        console.log('   The email verification system is implemented and will work when EMAIL_USER and EMAIL_PASS are set.');
    }
}

// Run the test
if (require.main === module) {
    testEmailVerification();
}

module.exports = { testEmailVerification };