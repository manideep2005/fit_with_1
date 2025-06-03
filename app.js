require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const { sendWelcomeEmail } = require('./services/emailService');

const app = express();

// Middleware Configuration
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Cache Control Middleware
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 30, // 30 minutes
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// Authentication Middleware
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    if (req.accepts('html')) {
      return res.redirect('/');
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Onboarding Check Middleware
const checkOnboarding = (req, res, next) => {
  if (!req.session.user?.onboardingCompleted) {
    return res.redirect(`/CustomOnboarding?sessionId=undefined&email=${encodeURIComponent(req.session.user?.email || '')}`);
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

// Signup Route
app.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!email || !fullName || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    req.session.user = {
      email: email.trim(),
      fullName: fullName.trim(),
      onboardingCompleted: false
    };

    res.json({
      success: true,
      redirectUrl: `/CustomOnboarding?sessionId=undefined&email=${encodeURIComponent(email.trim())}`
    });

    try {
      await sendWelcomeEmail(email.trim(), fullName.trim());
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Custom Onboarding Route
app.get('/CustomOnboarding', (req, res) => {
  const email = req.session.user?.email || req.query.email;
  if (!email) return res.redirect('/');
  
  res.render('customonboarding', {
    user: {
      email: email,
      fullName: req.session.user?.fullName || '',
      sessionId: undefined
    }
  });
});

// Complete Onboarding Route
app.post('/CustomOnboarding/complete', isAuthenticated, async (req, res) => {
  try {
    const { onboardingData } = req.body;

    if (!onboardingData) {
      return res.status(400).render('customonboarding', {
        error: 'Onboarding data is required',
        user: req.session.user
      });
    }

    // Validate required fields
    if (!onboardingData.personalInfo?.firstName || 
        !onboardingData.personalInfo?.lastName ||
        !onboardingData.bodyMetrics?.height ||
        !onboardingData.bodyMetrics?.weight) {
      return res.status(400).render('customonboarding', {
        error: 'Required fields are missing',
        user: req.session.user
      });
    }

    // Update user session
    req.session.user.onboardingCompleted = true;
    req.session.user.onboardingData = onboardingData;

    // Save session and redirect
    req.session.save(() => {
      res.redirect('/dashboard');
    });

  } catch (error) {
    console.error('Onboarding completion error:', error);
    res.status(500).render('customonboarding', {
      error: 'Failed to complete onboarding',
      user: req.session.user
    });
  }
});

// Dashboard Route
app.get('/dashboard', isAuthenticated, checkOnboarding, (req, res) => {
  res.render('dashboard', {
    user: req.session.user,
    currentPath: '/dashboard'
  });
});

// Login Route
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  req.session.user = {
    email: email.trim(),
    fullName: 'User Name', // In real app, get from DB
    onboardingCompleted: false
  };
  
  res.json({ 
    success: true,
    redirectUrl: '/CustomOnboarding?sessionId=undefined'
  });
});

// Protected Routes
const protectedRoutes = [
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
  app.get(route, isAuthenticated, checkOnboarding, (req, res) => {
    const viewName = route.substring(1); // Remove leading slash
    res.render(viewName, { 
      user: req.session.user,
      currentPath: route
    });
  });
});

// Logout Route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  const statusCode = err.status || 500;
  const message = err.message || 'Something went wrong!';
  
  res.status(statusCode).render('error', {
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404', {
    path: req.path
  });
});

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});