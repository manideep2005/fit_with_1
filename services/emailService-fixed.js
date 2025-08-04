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
            rejectUnauthorized: process.env.NODE_ENV === 'production'
        },
        pool: true, // Use pooled connections
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000, // How many messages to send per second
        rateLimit: 5 // Max number of messages per rateDelta
    });
};

// Function to send email with attachments
const sendEmailWithAttachment = async (userEmail, userName, subject, htmlContent, attachments = []) => {
    if (!userEmail) {
        throw new Error('Email address is required');
    }

    try {
        console.log('Sending email with attachments to:', userEmail);
        const transporter = createTransporter();
        
        const mailOptions = {
            from: {
                name: 'Fit-With-AI',
                address: process.env.EMAIL_USER
            },
            to: userEmail,
            subject: subject,
            html: htmlContent,
            attachments: attachments
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email with attachments sent successfully:', info.messageId);
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error('Error sending email with attachments:', error);
        throw error;
    }
};

module.exports = {
    sendEmailWithAttachment,
    createTransporter
};