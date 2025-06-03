const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { sendWelcomeEmail } = require('./services/emailService');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set EJS as the view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Simple session storage (in production, use a proper session store)
const sessions = new Map();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    const sessionId = req.headers.authorization || req.query.sessionId;
    if (sessions.has(sessionId)) {
        req.user = sessions.get(sessionId);
        next();
    } else {
        res.status(401).json({ success: false, error: 'Not authenticated' });
    }
};

// Middleware to check if user has completed onboarding
const hasCompletedOnboarding = (req, res, next) => {
    if (req.user && req.user.onboardingCompleted) {
        next();
    } else {
        res.redirect('/CustomOnboarding');
    }
};

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/CustomOnboarding', isAuthenticated, (req, res) => {
    res.render('customonboarding', { user: req.user });
});

app.post('/CustomOnboarding/complete', isAuthenticated, (req, res) => {
    const sessionId = req.headers.authorization;
    const user = sessions.get(sessionId);
    user.onboardingCompleted = true;
    sessions.set(sessionId, user);
    
    res.json({
        success: true,
        message: 'Onboarding completed successfully'
    });
});

app.get('/dashboard', isAuthenticated, hasCompletedOnboarding, (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to dashboard',
        user: req.user
    });
});

app.post('/signup', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        
        // Validate inputs
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        if (!fullName) {
            return res.status(400).json({
                success: false,
                error: 'Full name is required'
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                error: 'Password is required'
            });
        }

        // Create session
        const sessionId = Math.random().toString(36).substring(7);
        sessions.set(sessionId, {
            fullName,
            email,
            onboardingCompleted: false
        });

        // Send welcome email
        await sendWelcomeEmail(email, fullName);

        res.json({
            success: true,
            message: 'Signup successful! Welcome email sent.',
            sessionId: sessionId
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error during signup. Please try again.'
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});