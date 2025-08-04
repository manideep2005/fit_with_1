const { sendTestEmail, testEmailConnection } = require('./services/emailService');
require('dotenv').config();

async function testEmailService() {
    console.log('🧪 Testing Email Service...\n');
    
    // Test 1: Check email configuration
    console.log('📧 Email Configuration:');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 'Not set');
    console.log('');
    
    // Test 2: Test email connection
    console.log('🔗 Testing email connection...');
    try {
        const connectionResult = await testEmailConnection();
        if (connectionResult) {
            console.log('✅ Email connection successful!');
        } else {
            console.log('❌ Email connection failed!');
            return;
        }
    } catch (error) {
        console.log('❌ Email connection error:', error.message);
        return;
    }
    console.log('');
    
    // Test 3: Send test email
    console.log('📤 Sending test email...');
    try {
        const testResult = await sendTestEmail('fitwithai18@gmail.com');
        if (testResult.success) {
            console.log('✅ Test email sent successfully!');
            console.log('Message ID:', testResult.messageId);
        } else {
            console.log('❌ Test email failed:', testResult.error);
        }
    } catch (error) {
        console.log('❌ Test email error:', error.message);
    }
    
    console.log('\n🎉 Email service test completed!');
}

// Run the test
testEmailService().catch(console.error);