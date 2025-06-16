const nodemailer = require('nodemailer');

// Create a transporter using Gmail with enhanced configuration
const createTransporter = () => {
    const emailUser = process.env.EMAIL_USER || 'fitwithai18@gmail.com';
    const emailPass = process.env.EMAIL_PASS || 'degdrtnvusbxadvx';
    
    console.log('Email configuration:', {
        user: emailUser,
        passLength: emailPass ? emailPass.length : 0,
        hasPass: !!emailPass,
        nodeEnv: process.env.NODE_ENV
    });
    
    return nodemailer.createTransporter({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: emailUser,
            pass: emailPass
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

// Test email connection
const testEmailConnection = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('Email server connection verified successfully');
        return true;
    } catch (error) {
        console.error('Email server connection failed:', error.message);
        return false;
    }
};

// Function to send welcome email
const sendWelcomeEmail = async (userEmail, userName) => {
    // Validate inputs
    if (!userEmail) {
        throw new Error('Email address is required');
    }
    if (!userName) {
        userName = 'Valued Member'; // Default name if not provided
    }

    try {
        console.log('Attempting to send email to:', userEmail);
        
        // Create transporter for each email to ensure fresh connection
        const transporter = createTransporter();
        
        // Test connection first
        const connectionTest = await testEmailConnection();
        if (!connectionTest) {
            console.warn('Email connection test failed, but attempting to send anyway...');
        }
        
        const mailOptions = {
            from: {
                name: 'Fit-With-AI',
                address: process.env.EMAIL_USER || 'fitwithai18@gmail.com'
            },
            to: userEmail,
            subject: 'Welcome to Fit-With-AI! 🎉',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #6C63FF; margin-bottom: 10px;">Welcome to Fit-With-AI! 🎉</h1>
                        <div style="width: 50px; height: 3px; background: #6C63FF; margin: 0 auto;"></div>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #333;">Dear ${userName},</p>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #333;">
                        Thank you for joining Fit-With-AI! We're excited to have you as part of our fitness community.
                    </p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #6C63FF; margin-top: 0;">With Fit-With-AI, you'll have access to:</h3>
                        <ul style="font-size: 16px; line-height: 1.8; color: #333; padding-left: 20px;">
                            <li>🏋️ Personalized AI-generated workout plans</li>
                            <li>🥗 Custom nutrition guidance</li>
                            <li>📊 Real-time exercise feedback</li>
                            <li>📈 Progress tracking tools</li>
                            <li>👥 A supportive fitness community</li>
                        </ul>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #333;">
                        Get started by completing your profile and setting your fitness goals!
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://fit-with-ai-1.vercel.app/CustomOnboarding" 
                           style="background-color: #6C63FF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                            Complete Your Profile
                        </a>
                    </div>
                    
                    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
                        <p style="font-size: 14px; line-height: 1.6; color: #666;">
                            If you have any questions, feel free to reach out to our support team.
                        </p>
                        <p style="font-size: 16px; line-height: 1.6; color: #333;">
                            Best regards,<br>
                            <strong>The Fit-With-AI Team</strong>
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="font-size: 12px; color: #999;">
                            This email was sent to ${userEmail}. If you didn't sign up for Fit-With-AI, please ignore this email.
                        </p>
                    </div>
                </div>
            `,
            text: `
Welcome to Fit-With-AI!

Dear ${userName},

Thank you for joining Fit-With-AI! We're excited to have you as part of our fitness community.

With Fit-With-AI, you'll have access to:
- Personalized AI-generated workout plans
- Custom nutrition guidance
- Real-time exercise feedback
- Progress tracking tools
- A supportive fitness community

Get started by completing your profile and setting your fitness goals!

Visit: https://fit-with-ai-1.vercel.app/CustomOnboarding

If you have any questions, feel free to reach out to our support team.

Best regards,
The Fit-With-AI Team
            `
        };

        console.log('Sending email with options:', {
            to: mailOptions.to,
            subject: mailOptions.subject,
            from: mailOptions.from
        });

        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent successfully:', {
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected
        });
        return {
            success: true,
            messageId: info.messageId,
            response: info.response
        };
    } catch (error) {
        console.error('Error sending welcome email:', {
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response
        });
        
        // Don't throw error in production to avoid breaking signup flow
        if (process.env.NODE_ENV === 'production') {
            console.warn('Email sending failed in production, but continuing...');
            return {
                success: false,
                error: error.message
            };
        } else {
            throw error;
        }
    }
};

// Function to send test email (for debugging)
const sendTestEmail = async (testEmail = 'test@example.com') => {
    try {
        console.log('Sending test email...');
        const result = await sendWelcomeEmail(testEmail, 'Test User');
        console.log('Test email result:', result);
        return result;
    } catch (error) {
        console.error('Test email failed:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendWelcomeEmail,
    sendTestEmail,
    testEmailConnection
};