const express = require('express');
const session = require('express-session');
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

// Enhanced session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'some very secret string',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 30, // 30 minutes
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// Improved Authentication Middleware
const isAuthenticated = (req, res, next) => {
  console.log('Session check:', req.session); // Debug logging
  if (req.session?.user) {
    return next();
  }
  // Handle both API and view requests
  if (req.accepts('html')) {
    return res.redirect('/');
  }
  res.status(401).json({ success: false, error: 'Not authenticated' });
};

// Enhanced Onboarding Check Middleware
const hasCompletedOnboarding = (req, res, next) => {
  if (req.session.user?.onboardingCompleted) {
    return next();
  }
  res.redirect('/CustomOnboarding');
};

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

// Login route (you'll need to implement this)
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  // In a real app, you would verify credentials against a database
  req.session.user = {
    email,
    fullName: 'User Name', // Get from DB in real app
    onboardingCompleted: false
  };
  
  res.json({ success: true, message: 'Login successful' });
});

// Onboarding page
app.get('/CustomOnboarding', isAuthenticated, (req, res) => {
  res.render('customonboarding', { user: req.session.user });
});

// Mark onboarding complete
app.post('/dashboard/complete', isAuthenticated, (req, res) => {
  req.session.user.onboardingCompleted = true;
  res.json({
    success: true,
    message: 'Onboarding completed successfully'
  });
});

// Protected routes
const protectedRoutes = [
  '/dashboard',
  '/workouts',
  '/progress',
  '/nutrition',
  '/health',
  '/schedule',
  '/community',
  '/ai-coach',
  '/settings'
];

protectedRoutes.forEach(route => {
  app.get(route, isAuthenticated, hasCompletedOnboarding, (req, res) => {
    try {
      const viewName = route.substring(1) || 'dashboard'; // Remove leading slash
      res.render(viewName, { 
        user: req.session.user, 
        fullName: req.session.user.fullName 
      });
    } catch (error) {
      console.error(`Error rendering ${route}:`, error);
      res.status(500).send('Error loading page');
    }
  });
});

// Signup route with enhanced error handling
app.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!email || !fullName || !password) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required (Full name, Email, Password)'
      });
    }

    // In a real app, you would:
    // 1. Hash the password
    // 2. Save to database
    // 3. Handle duplicate emails

    req.session.user = {
      fullName,
      email,
      onboardingCompleted: false
    };

    await sendWelcomeEmail(email, fullName);

    res.json({
      success: true,
      message: 'Signup successful! Welcome email sent.',
      user: req.session.user // Return user data
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error during signup. Please try again.'
    });
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Logout failed');
    }
    res.clearCookie('connect.sid'); // Clear the session cookie
    res.redirect('/');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Application error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});