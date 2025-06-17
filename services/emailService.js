const nodemailer = require('nodemailer');

// Create a transporter using Gmail with enhanced configuration
const createTransporter = () => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    if (!emailUser || !emailPass) {
        console.error('Email configuration missing:', {
            hasUser: !!emailUser,
            hasPass: !!emailPass,
            nodeEnv: process.env.NODE_ENV
        });
        throw new Error('Email configuration is missing. Please set EMAIL_USER and EMAIL_PASS environment variables in your Vercel project settings.');
    }
    
    console.log('Email configuration:', {
        user: emailUser,
        passLength: emailPass.length,
        hasPass: true,
        nodeEnv: process.env.NODE_ENV
    });
    
    return nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: emailUser,
            pass: emailPass
        },
        tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production'
        },
        pool: true, // Use pooled connections
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000, // How many messages to send per second
        rateLimit: 5 // Max number of messages per rateDelta
    });
};

// Test email connection with retry
const testEmailConnection = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const transporter = createTransporter();
            await transporter.verify();
            console.log('Email server connection verified successfully');
            return true;
        } catch (error) {
            console.error(`Email server connection attempt ${i + 1} failed:`, error.message);
            if (i === retries - 1) {
                return false;
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
    return false;
};

// Function to generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
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

// Function to send password reset OTP email
const sendPasswordResetOTP = async (userEmail, userName, otp) => {
    if (!userEmail) {
        throw new Error('Email address is required');
    }
    if (!otp) {
        throw new Error('OTP is required');
    }
    if (!userName) {
        userName = 'Valued Member'; // Default name if not provided
    }

    try {
        console.log('Attempting to send password reset OTP email to:', userEmail);
        
        // Create transporter for each email to ensure fresh connection
        const transporter = createTransporter();
        
        // Test connection first
        const connectionTest = await testEmailConnection();
        if (!connectionTest) {
            console.error('Email connection test failed');
            throw new Error('Failed to connect to email server');
        }
        
        const mailOptions = {
            from: {
                name: 'Fit-With-AI',
                address: process.env.EMAIL_USER || 'fitwithai18@gmail.com'
            },
            to: userEmail,
            subject: 'Your Password Reset Code - Fit-With-AI',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #6C63FF; margin-bottom: 10px;">Password Reset Code</h1>
                        <div style="width: 50px; height: 3px; background: #6C63FF; margin: 0 auto;"></div>
                        </div>
                        
                    <p style="font-size: 16px; line-height: 1.6; color: #333;">Dear ${userName},</p>
                            
                    <p style="font-size: 16px; line-height: 1.6; color: #333;">
                        We received a request to reset your password. Use the following code to reset your password:
                    </p>
                            
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                        <h2 style="color: #6C63FF; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h2>
                            </div>
                            
                    <p style="font-size: 16px; line-height: 1.6; color: #333;">
                        This code will expire in 10 minutes. If you didn't request this password reset, please ignore this email.
                    </p>
                    
                    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
                        <p style="font-size: 14px; line-height: 1.6; color: #666;">
                            If you have any questions, feel free to reach out to our support team.
                        </p>
                        <p style="font-size: 16px; line-height: 1.6; color: #333;">
                            Best regards,<br>
                            <strong>The Fit-With-AI Team</strong>
                        </p>
                    </div>
                </div>
            `,
            text: `
Password Reset Code - Fit-With-AI

Dear ${userName},

We received a request to reset your password. Use the following code to reset your password:

${otp}

This code will expire in 10 minutes. If you didn't request this password reset, please ignore this email.

Best regards,
The Fit-With-AI Team
            `
        };

        console.log('Sending password reset OTP email with options:', {
            to: mailOptions.to,
            subject: mailOptions.subject,
            from: mailOptions.from
        });

        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset OTP email sent successfully:', {
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
        console.error('Error sending password reset OTP email:', {
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response,
            stack: error.stack
        });
        throw error; // Re-throw the error to be handled by the route
    }
};

// Function to send password reset confirmation email
const sendPasswordResetConfirmation = async (userEmail, userName) => {
    if (!userEmail) {
        throw new Error('Email address is required');
    }

    try {
        console.log('Sending password reset confirmation email to:', userEmail);
        const transporter = createTransporter();
        
        const mailOptions = {
            from: {
                name: 'Fit-With-AI',
                address: process.env.EMAIL_USER
            },
            to: userEmail,
            subject: 'Password Successfully Reset - Fit-With-AI ✅',
            html: `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Password Reset Confirmation</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
                        body { font-family: 'Poppins', Arial, sans-serif; background-color: #f7f9fc; margin: 0; padding: 0; color: #333; }
                        .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
                        .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 40px 20px; text-align: center; color: white; }
                        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
                        .content { padding: 30px; }
                        .success-box { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 25px; border-radius: 15px; text-align: center; margin: 25px 0; }
                        .cta-button { display: inline-block; background: linear-gradient(135deg, #6C63FF 0%, #4A42E8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 16px; margin: 20px 0; }
                        .footer { text-align: center; padding: 20px; border-top: 1px solid #eee; font-size: 14px; color: #999; }
                        .security-tips { background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="email-container">
                        <div class="header">
                            <h1>✅ Password Reset Successful</h1>
                        </div>
                        
                        <div class="content">
                            <p>Hi ${userName || 'there'},</p>
                            
                            <div class="success-box">
                                <h2 style="margin: 0; font-size: 24px;">🎉 Success!</h2>
                                <p style="margin: 10px 0 0 0; font-size: 16px;">Your password has been successfully reset.</p>
                            </div>
                            
                            <p>Your Fit-With-AI account password has been successfully updated. You can now log in with your new password.</p>
                            
                            <div style="text-align: center;">
                                <a href="https://fit-with-ai-1.vercel.app/" class="cta-button">
                                    Log In to Your Account
                                </a>
                            </div>
                            
                            <div class="security-tips">
                                <h3>🛡️ Security Reminder</h3>
                                <p>If you didn't make this change, please contact our support team immediately. Your account security is our priority.</p>
                                <p><strong>Tips for keeping your account secure:</strong></p>
                                <ul>
                                    <li>Use a strong, unique password</li>
                                    <li>Don't share your login credentials</li>
                                    <li>Log out from shared devices</li>
                                    <li>Monitor your account for unusual activity</li>
                                </ul>
                            </div>
                            
                            <p>Thank you for using Fit-With-AI. We're here to support your fitness journey!</p>
                            
                            <p>Best regards,<br><strong>The Fit-With-AI Team</strong></p>
                        </div>
                        
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} Fit-With-AI. All rights reserved.</p>
                            <p>This email was sent to ${userEmail}</p>
                            <p>Password reset completed at: ${new Date().toLocaleString()}</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
Password Reset Successful - Fit-With-AI

Hi ${userName || 'there'},

Your Fit-With-AI account password has been successfully updated. You can now log in with your new password.

Log in to your account: https://fit-with-ai-1.vercel.app/

SECURITY REMINDER: If you didn't make this change, please contact our support team immediately. Your account security is our priority.

Tips for keeping your account secure:
- Use a strong, unique password
- Don't share your login credentials
- Log out from shared devices
- Monitor your account for unusual activity

Thank you for using Fit-With-AI. We're here to support your fitness journey!

Best regards,
The Fit-With-AI Team

© ${new Date().getFullYear()} Fit-With-AI. All rights reserved.
This email was sent to ${userEmail}
Password reset completed at: ${new Date().toLocaleString()}
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset confirmation email sent successfully:', info.messageId);
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error('Error sending password reset confirmation email:', error);
        if (process.env.NODE_ENV === 'production') {
            return { success: false, error: error.message };
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

// Function to send onboarding completion email
const sendOnboardingCompletionEmail = async (userEmail, userName, onboardingData) => {
    if (!userEmail) {
        throw new Error('Email address is required');
    }
    if (!userName) {
        userName = 'Valued Member';
    }

    try {
        console.log('Sending onboarding completion email to:', userEmail);
        const transporter = createTransporter();
        
        const mailOptions = {
            from: {
                name: 'Fit-With-AI',
                address: process.env.EMAIL_USER
            },
            to: userEmail,
            subject: 'Your Fit-With-AI Profile is Ready! 🎉',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #6C63FF; margin-bottom: 10px;">Your Profile is Ready! 🎉</h1>
                        <div style="width: 50px; height: 3px; background: #6C63FF; margin: 0 auto;"></div>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #333;">Hi ${userName},</p>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #333;">
                        Thank you for completing your Fit-With-AI profile! We're excited to have you on board and can't wait to help you achieve your fitness goals.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://fit-with-ai-1.vercel.app/dashboard" 
                           style="background-color: #6C63FF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                            Go to Your Dashboard
                        </a>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #333;">
                        We've already started creating your personalized fitness plan based on your preferences. You'll find it in your dashboard along with:
                    </p>
                    
                    <ul style="font-size: 16px; line-height: 1.8; color: #333; padding-left: 20px;">
                        <li>Customized workout routines</li>
                        <li>Personalized nutrition recommendations</li>
                        <li>Progress tracking tools</li>
                        <li>AI-powered form correction</li>
                    </ul>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #333;">
                        If you need to make any changes to your profile, you can do so anytime from your dashboard settings.
                    </p>
                    
                    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
                        <p style="font-size: 16px; line-height: 1.6; color: #333;">
                            Best regards,<br>
                            <strong>The Fit-With-AI Team</strong>
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="font-size: 12px; color: #999;">
                            This email was sent to ${userEmail}
                        </p>
                    </div>
                </div>
            `,
            text: `
Hi ${userName},

Thank you for completing your Fit-With-AI profile! We're excited to have you on board and can't wait to help you achieve your fitness goals.

We've already started creating your personalized fitness plan based on your preferences. You'll find it in your dashboard along with:
- Customized workout routines
- Personalized nutrition recommendations
- Progress tracking tools
- AI-powered form correction

If you need to make any changes to your profile, you can do so anytime from your dashboard settings.

Ready to start your fitness journey? Visit your dashboard: https://fit-with-ai-1.vercel.app/dashboard

Best regards,
The Fit-With-AI Team
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Onboarding completion email sent successfully:', info.messageId);
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error('Error sending onboarding completion email:', error);
        if (process.env.NODE_ENV === 'production') {
            return { success: false, error: error.message };
        } else {
            throw error;
        }
    }
};

module.exports = {
    sendWelcomeEmail,
    sendTestEmail,
    testEmailConnection,
    sendOnboardingCompletionEmail,
    generateOTP,
    sendPasswordResetOTP,
    sendPasswordResetConfirmation
};