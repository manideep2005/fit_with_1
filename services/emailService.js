const nodemailer = require('nodemailer');

// Create a transporter using Gmail with enhanced configuration
const createTransporter = () => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    if (!emailUser || !emailPass) {
        throw new Error('Email configuration is missing. Please set EMAIL_USER and EMAIL_PASS environment variables.');
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
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Your Fit-With-AI Profile</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
                        body { font-family: 'Poppins', Arial, sans-serif; background-color: #f7f9fc; margin: 0; padding: 0; color: #333; }
                        .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
                        .header { background: linear-gradient(135deg, #6C63FF 0%, #4A42E8 100%); padding: 40px 20px; text-align: center; color: white; }
                        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
                        .content { padding: 30px; }
                        .section { background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0; }
                        .section h3 { color: #6C63FF; margin-top: 0; font-size: 18px; margin-bottom: 15px; }
                        .section p { margin: 8px 0; font-size: 15px; line-height: 1.5; }
                        .cta-button { display: inline-block; background: linear-gradient(135deg, #6C63FF 0%, #4A42E8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 16px; margin: 20px 0; text-align: center; box-shadow: 0 4px 15px rgba(108, 99, 255, 0.3); }
                        .footer { text-align: center; padding: 20px; border-top: 1px solid #eee; font-size: 14px; color: #999; }
                        .divider { height: 3px; background: linear-gradient(90deg, #6C63FF, #FF6584, #6C63FF); margin: 25px 0; border-radius: 3px; }
                    </style>
                </head>
                <body>
                    <div class="email-container">
                        <div class="header">
                            <h1>Your Profile is Ready! 🎉</h1>
                        </div>
                        
                        <div class="content">
                            <p>Hi ${userName},</p>
                            
                            <p>Thank you for completing your Fit-With-AI profile! We're excited to have you on board and can't wait to help you achieve your fitness goals.</p>
                            
                            <div class="divider"></div>
                            
                            <h2>Your Profile Summary</h2>
                            
                            <div class="section">
                                <h3>👤 Personal Information</h3>
                                <p>Name: ${onboardingData.personalInfo.firstName} ${onboardingData.personalInfo.lastName}</p>
                                <p>Age: ${onboardingData.personalInfo.age}</p>
                                <p>Gender: ${onboardingData.personalInfo.gender}</p>
                            </div>
                            
                            <div class="section">
                                <h3>📏 Body Metrics</h3>
                                <p>Height: ${onboardingData.bodyMetrics.height} cm</p>
                                <p>Current Weight: ${onboardingData.bodyMetrics.weight} kg</p>
                                ${onboardingData.bodyMetrics.targetWeight ? `<p>Target Weight: ${onboardingData.bodyMetrics.targetWeight} kg</p>` : ''}
                                <p>Activity Level: ${onboardingData.bodyMetrics.activityLevel}</p>
                                <p>Workout Frequency: ${onboardingData.bodyMetrics.workoutFrequency}</p>
                            </div>
                            
                            <div class="section">
                                <h3>🎯 Health Goals</h3>
                                <p>Goals: ${onboardingData.healthGoals.goals.join(', ')}</p>
                                ${onboardingData.healthGoals.timeline ? `<p>Timeline: ${onboardingData.healthGoals.timeline}</p>` : ''}
                            </div>
                            
                            <div class="section">
                                <h3>🍽️ Dietary Preferences</h3>
                                <p>Diet Type: ${onboardingData.dietaryPreferences.dietType}</p>
                                ${onboardingData.dietaryPreferences.allergies.length > 0 ? 
                                    `<p>Allergies: ${onboardingData.dietaryPreferences.allergies.join(', ')}</p>` : ''}
                                <p>Water Intake: ${onboardingData.dietaryPreferences.waterIntake}</p>
                            </div>
                            
                            <div class="section">
                                <h3>🌿 Lifestyle</h3>
                                <p>Sleep Quality: ${onboardingData.lifestyle.sleepQuality}</p>
                                <p>Smoking Status: ${onboardingData.lifestyle.smokingStatus}</p>
                                <p>Alcohol Consumption: ${onboardingData.lifestyle.alcoholConsumption}</p>
                                ${onboardingData.lifestyle.stressLevel ? `<p>Stress Level: ${onboardingData.lifestyle.stressLevel}/10</p>` : ''}
                            </div>
                            
                            <div style="text-align: center;">
                                <a href="https://fit-with-ai-1.vercel.app/dashboard" class="cta-button">
                                    Go to Your Dashboard
                                </a>
                            </div>
                            
                            <p>We've already started creating your personalized fitness plan based on your preferences. You'll find it in your dashboard along with:</p>
                            
                            <ul>
                                <li>Customized workout routines</li>
                                <li>Personalized nutrition recommendations</li>
                                <li>Progress tracking tools</li>
                                <li>AI-powered form correction</li>
                            </ul>
                            
                            <p>If you need to make any changes to your profile, you can do so anytime from your dashboard settings.</p>
                            
                            <div class="divider"></div>
                            
                            <p>Ready to start your fitness journey? Click the button above to access your dashboard!</p>
                        </div>
                        
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} Fit-With-AI. All rights reserved.</p>
                            <p>This email was sent to ${userEmail}</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
Hi ${userName},

Thank you for completing your Fit-With-AI profile! We're excited to have you on board and can't wait to help you achieve your fitness goals.

Your Profile Summary:

Personal Information:
- Name: ${onboardingData.personalInfo.firstName} ${onboardingData.personalInfo.lastName}
- Age: ${onboardingData.personalInfo.age}
- Gender: ${onboardingData.personalInfo.gender}

Body Metrics:
- Height: ${onboardingData.bodyMetrics.height} cm
- Current Weight: ${onboardingData.bodyMetrics.weight} kg
${onboardingData.bodyMetrics.targetWeight ? `- Target Weight: ${onboardingData.bodyMetrics.targetWeight} kg` : ''}
- Activity Level: ${onboardingData.bodyMetrics.activityLevel}
- Workout Frequency: ${onboardingData.bodyMetrics.workoutFrequency}

Health Goals:
- Goals: ${onboardingData.healthGoals.goals.join(', ')}
${onboardingData.healthGoals.timeline ? `- Timeline: ${onboardingData.healthGoals.timeline}` : ''}

Dietary Preferences:
- Diet Type: ${onboardingData.dietaryPreferences.dietType}
${onboardingData.dietaryPreferences.allergies.length > 0 ? `- Allergies: ${onboardingData.dietaryPreferences.allergies.join(', ')}` : ''}
- Water Intake: ${onboardingData.dietaryPreferences.waterIntake}

Lifestyle:
- Sleep Quality: ${onboardingData.lifestyle.sleepQuality}
- Smoking Status: ${onboardingData.lifestyle.smokingStatus}
- Alcohol Consumption: ${onboardingData.lifestyle.alcoholConsumption}
${onboardingData.lifestyle.stressLevel ? `- Stress Level: ${onboardingData.lifestyle.stressLevel}/10` : ''}

We've already started creating your personalized fitness plan based on your preferences. You'll find it in your dashboard along with:
- Customized workout routines
- Personalized nutrition recommendations
- Progress tracking tools
- AI-powered form correction

If you need to make any changes to your profile, you can do so anytime from your dashboard settings.

Ready to start your fitness journey? Visit your dashboard: https://fit-with-ai-1.vercel.app/dashboard

© ${new Date().getFullYear()} Fit-With-AI. All rights reserved.
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
    sendOnboardingCompletionEmail
};