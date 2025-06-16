require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const { sendWelcomeEmail } = require('./services/emailService');

// Handle Redis connection gracefully for Vercel
let redisClient = null;
try {
  if (process.env.REDIS_URL) {
    const redis = require('./services/redis');
    redisClient = redis;
  }
} catch (error) {
  console.log('Redis not available, using memory sessions:', error.message);
}

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session Configuration - Updated for Vercel
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24, // 24 hours (longer for serverless)
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
  // For serverless environments, we need to handle sessions differently
  name: 'fit-with-ai-session'
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

// Debug route to check session (remove in production)
app.get('/debug-session', (req, res) => {
  res.json({
    session: req.session,
    user: req.session.user,
    sessionID: req.sessionID
  });
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

// Custom Onboarding Route - Enhanced for serverless
app.get('/CustomOnboarding', (req, res) => {
  console.log('Accessing onboarding - Session:', req.session.user); // Debug log
  console.log('Query params:', req.query); // Debug log
  
  // Allow access if user is in session OR if email is provided in query
  const email = req.session.user?.email || req.query.email;
  
  if (!email) {
    console.log('No email found, redirecting to home');
    return res.redirect('/');
  }
  
  // Create or update session for serverless compatibility
  if (!req.session.user) {
    req.session.user = {
      email: email,
      fullName: '', 
      onboardingCompleted: false,
      tempUser: true // Mark as temporary until onboarding is complete
    };
  }
  
  // Generate a simple token for this session (for serverless compatibility)
  const userToken = Buffer.from(JSON.stringify({
    email: email,
    timestamp: Date.now(),
    sessionId: req.sessionID
  })).toString('base64');
  
  res.render('customonboarding', {
    user: {
      email: email,
      fullName: req.session.user?.fullName || '',
      token: userToken
    }
  });
});

// Complete Onboarding Route - Enhanced for serverless with token support
app.post('/CustomOnboarding/complete', async (req, res) => {
  try {
    const { onboardingData, token } = req.body;
    console.log('Received onboarding data:', onboardingData); // Debug log
    console.log('Received token:', token); // Debug log
    console.log('Current session user:', req.session.user); // Debug log

    if (!onboardingData) {
      return res.status(400).json({
        success: false,
        error: 'Onboarding data is required'
      });
    }

    let userEmail = null;
    
    // Try to get user from session first
    if (req.session.user) {
      userEmail = req.session.user.email;
    } 
    // If no session, try to decode token
    else if (token) {
      try {
        const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
        userEmail = tokenData.email;
        console.log('Decoded token data:', tokenData);
        
        // Create session from token
        req.session.user = {
          email: userEmail,
          fullName: '',
          onboardingCompleted: false,
          tempUser: true
        };
      } catch (tokenError) {
        console.error('Token decode error:', tokenError);
      }
    }

    if (!userEmail) {
      return res.status(401).json({
        success: false,
        error: 'No user session found'
      });
    }

    // Update user session with onboarding data
    const fullName = `${onboardingData.personalInfo?.firstName || ''} ${onboardingData.personalInfo?.lastName || ''}`.trim();
    
    req.session.user = {
      ...req.session.user,
      email: userEmail,
      onboardingCompleted: true, // IMPORTANT: Mark as completed
      onboardingData: onboardingData,
      fullName: fullName || req.session.user?.fullName || 'User',
      tempUser: false // No longer temporary
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
        message: 'Onboarding completed successfully',
        redirectUrl: '/dashboard'
      });
    });

    // Here you would typically save to database
    // await UserService.completeOnboarding(userEmail, onboardingData);

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
  '/meal-planner',
  '/nutrition',
  '/health',
  '/challenges',
  '/biometrics',
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});