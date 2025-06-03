const nodemailer = require('nodemailer');

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'fitwithai18@gmail.com',
        pass: 'degdrtnvusbxadvx'
    }
});

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
        
        const mailOptions = {
            from: 'fitwithai18@gmail.com',
            to: userEmail,
            subject: 'Welcome to Fit-With-AI!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333; text-align: center;">Welcome to Fit-With-AI! 🎉</h1>
                    <p style="font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
                    <p style="font-size: 16px; line-height: 1.6;">Thank you for joining Fit-With-AI! We're excited to have you as part of our fitness community.</p>
                    <p style="font-size: 16px; line-height: 1.6;">With Fit-With-AI, you'll have access to:</p>
                    <ul style="font-size: 16px; line-height: 1.6;">
                        <li>Personalized AI-generated workout plans</li>
                        <li>Custom nutrition guidance</li>
                        <li>Real-time exercise feedback</li>
                        <li>Progress tracking tools</li>
                        <li>A supportive fitness community</li>
                    </ul>
                    <p style="font-size: 16px; line-height: 1.6;">Get started by completing your profile and setting your fitness goals!</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://fit-with-ai.com/CustomOnboarding" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Complete Your Profile</a>
                    </div>
                    <p style="font-size: 16px; line-height: 1.6;">If you have any questions, feel free to reach out to our support team.</p>
                    <p style="font-size: 16px; line-height: 1.6;">Best regards,<br>The Fit-With-AI Team</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent successfully:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        throw error;
    }
};

module.exports = {
    sendWelcomeEmail
}; 