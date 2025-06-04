require('dotenv').config();
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

// View Engine
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
  console.log('Auth check - Session user:', req.session.user); // Debug log
  if (!req.session.user) {
    if (req.accepts('html')) {
      return res.redirect('/');
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Onboarding Check Middleware - FIXED
const checkOnboarding = (req, res, next) => {
  console.log('Onboarding check - User:', req.session.user); // Debug log
  
  // Check if user exists and onboarding is completed
  if (!req.session.user || !req.session.user.onboardingCompleted) {
    const email = req.session.user?.email || '';
    return res.redirect(`/CustomOnboarding?sessionId=undefined&email=${encodeURIComponent(email)}`);
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

    // Create user session
    req.session.user = {
      email: email.trim(),
      fullName: fullName.trim(),
      onboardingCompleted: false
    };

    // Save session before responding
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Session creation failed' 
        });
      }
      
      res.json({
        success: true,
        redirectUrl: `/CustomOnboarding?sessionId=undefined&email=${encodeURIComponent(email.trim())}`
      });
    });

    // Send welcome email (async, don't wait for it)
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

// Login Route - FIXED
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  // In a real app, you'd verify credentials against database
  req.session.user = {
    email: email.trim(),
    fullName: 'User Name', // In real app, get from DB
    onboardingCompleted: false // Set based on DB data
  };
  
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Login failed' 
      });
    }
    
    res.json({ 
      success: true,
      redirectUrl: `/CustomOnboarding?sessionId=undefined&email=${encodeURIComponent(email.trim())}`
    });
  });
});

// Custom Onboarding Route
app.get('/CustomOnboarding', isAuthenticated, (req, res) => {
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

// Complete Onboarding Route - FIXED
app.post('/CustomOnboarding/complete', isAuthenticated, async (req, res) => {
  try {
    const { onboardingData } = req.body;
    console.log('Received onboarding data:', onboardingData); // Debug log

    if (!onboardingData) {
      return res.status(400).json({
        success: false,
        error: 'Onboarding data is required'
      });
    }

    // Update user session with onboarding data
    req.session.user = {
      ...req.session.user,
      onboardingCompleted: true, // IMPORTANT: Mark as completed
      onboardingData: onboardingData
    };

    console.log('Updated user session:', req.session.user); // Debug log

    // Save session and respond
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to save session'
        });
      }
      
      console.log('Session saved successfully'); // Debug log
      res.json({
        success: true,
        message: 'Onboarding completed successfully'
      });
    });

    // Here you would typically save to database
    // await UserService.completeOnboarding(req.session.user.email, onboardingData);

  } catch (error) {
    console.error('Onboarding completion error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to complete onboarding' 
    });
  }
});

// Protected Routes
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
  app.get(route, isAuthenticated, checkOnboarding, (req, res) => {
    const viewName = route.substring(1); // Remove leading slash
    console.log(`Accessing ${route} for user:`, req.session.user?.email); // Debug log
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
  
  res.status(statusCode).json({
    success: false,
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
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});