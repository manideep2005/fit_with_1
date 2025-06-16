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
if (!process.env.SESSION_SECRET) {
    console.error('WARNING: SESSION_SECRET environment variable is not set. Using a default secret is not secure for production.');
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here-change-in-production',
    resave: false,
    saveUninitialized: true, // Changed to true for better session handling
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        httpOnly: true,
        secure: false, // Set to false for now to fix session issues
        sameSite: 'lax' // Use lax for better compatibility
    },
    name: 'fit-with-ai-session'
}));

// Authentication Middleware - Enhanced for serverless with persistent session handling
const isAuthenticated = (req, res, next) => {
  console.log('Auth check - Session user:', req.session.user); // Debug log
  console.log('Auth check - Session ID:', req.sessionID); // Debug log
  console.log('Auth check - Query token:', req.query.token); // Debug log

  // Check if user is in session and has completed onboarding
  if (req.session.user && req.session.user.onboardingCompleted) {
    console.log('User authenticated via existing session');
    return next();
  }

  // If no session, check for token in query params
  const token = req.query.token;
  if (token) {
    try {
      const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
      console.log('Decoded token for auth:', tokenData);

      // Validate token (basic validation - in production, add expiry check)
      if (tokenData.email && tokenData.timestamp) {
        // Create/update session from token with proper fullName handling
        req.session.user = {
          email: tokenData.email,
          fullName: tokenData.fullName || tokenData.firstName || 'User',
          onboardingCompleted: true,
          fromToken: true,
          lastTokenRefresh: Date.now(),
          // Preserve onboarding data if available
          onboardingData: tokenData.onboardingData || null
        };

        console.log('Created/updated session from token:', req.session.user);
        
        // Save session immediately after creating from token
        req.session.save((err) => {
          if (err) {
            console.error('Session save error after token auth:', err);
            return res.status(500).json({ error: 'Session creation failed' });
          }
          console.log('Session saved successfully after token auth');
          return next();
        });
        return; // Don't call next() here, it's called in the callback
      }
    } catch (tokenError) {
      console.error('Token validation error:', tokenError);
    }
  }

  // No valid session or token
  console.log('No valid authentication found, redirecting to home');
  if (req.accepts('html')) {
    return res.redirect('/');
  }
  return res.status(401).json({ error: 'Unauthorized' });
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

// Debug routes - only available in development
if (process.env.NODE_ENV !== 'production') {
    app.get('/debug-session', (req, res) => {
        res.json({
            session: req.session,
            user: req.session.user,
            sessionID: req.sessionID,
            cookies: req.headers.cookie
        });
    });

    app.get('/debug-onboarding', (req, res) => {
        res.json({
            query: req.query,
            session: req.session,
            user: req.session.user,
            sessionID: req.sessionID,
            cookies: req.headers.cookie
        });
    });

    app.get('/debug-email', async (req, res) => {
        try {
            const { sendTestEmail, testEmailConnection } = require('./services/emailService');
            const testEmail = req.query.email || 'test@example.com';
            const connectionResult = await testEmailConnection();
            const emailResult = await sendTestEmail(testEmail);
            res.json({
                connection: connectionResult,
                email: emailResult,
                environment: {
                    NODE_ENV: process.env.NODE_ENV,
                    EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set',
                    EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Not set'
                }
            });
        } catch (error) {
            res.status(500).json({
                error: error.message,
                stack: error.stack
            });
        }
    });
}

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
      console.log('Attempting to send welcome email...');
      const emailResult = await sendWelcomeEmail(email.trim(), fullName.trim());
      console.log('Welcome email result:', emailResult);
    } catch (emailError) {
      console.error('Email sending failed in production, but continuing...', emailError);
      // Don't fail signup if email fails
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
  console.log('Session ID:', req.sessionID); // Debug log
  
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
    
    // Save session immediately
    req.session.save((err) => {
      if (err) {
        console.error('Session save error in onboarding:', err);
      } else {
        console.log('Session saved successfully in onboarding');
      }
    });
  }
  
  // Generate a simple token for this session (for serverless compatibility)
  const userToken = Buffer.from(JSON.stringify({
    email: email,
    timestamp: Date.now(),
    sessionId: req.sessionID || 'no-session-id'
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
    let userName = null;
    
    // Try to get user from session first
    if (req.session.user) {
      userEmail = req.session.user.email;
      userName = req.session.user.fullName;
    } 
    // If no session, try to decode token
    else if (token) {
      try {
        const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
        userEmail = tokenData.email;
        userName = tokenData.fullName;
        console.log('Decoded token data:', tokenData);
        
        // Create session from token
        req.session.user = {
          email: userEmail,
          fullName: userName,
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

    console.log('Updated user session:', req.session.user);

    // Save session and respond
    req.session.save(async (err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to save session'
        });
      }
      
      console.log('Session saved successfully'); // Debug log
      
      // Generate token for dashboard access with full name and onboarding data
      const dashboardToken = Buffer.from(JSON.stringify({
        email: userEmail,
        fullName: fullName || 'User',
        firstName: onboardingData.personalInfo?.firstName || '',
        timestamp: Date.now(),
        sessionId: req.sessionID,
        onboardingData: onboardingData
      })).toString('base64');

      // Send onboarding completion email
      try {
        const { sendOnboardingCompletionEmail } = require('./services/emailService');
        await sendOnboardingCompletionEmail(userEmail, fullName || userName, onboardingData);
        console.log('Onboarding completion email sent successfully');
      } catch (emailError) {
        console.error('Failed to send onboarding completion email:', emailError);
        // Don't fail the request if email fails
      }
      
      res.json({
        success: true,
        message: 'Onboarding completed successfully',
        redirectUrl: `/dashboard?token=${dashboardToken}`
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

// Protected Routes with enhanced token handling and error handling
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
    
    try {
      // Ensure user session exists
      if (!req.session.user) {
        console.error(`No user session found for ${route}`);
        return res.redirect('/');
      }

      // Always generate a fresh navigation token for each page load
      const navToken = Buffer.from(JSON.stringify({
        email: req.session.user.email || 'unknown',
        fullName: req.session.user.fullName || 'User',
        firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
        timestamp: Date.now(), // Fresh timestamp for each navigation
        sessionId: req.sessionID || 'no-session',
        route: route, // Include current route for debugging
        onboardingData: req.session.user.onboardingData || null
      })).toString('base64');
      
      console.log(`Generated navToken for ${route}:`, navToken.substring(0, 50) + '...'); // Debug log
      
      res.render(viewName, { 
        user: req.session.user,
        currentPath: route,
        navToken: navToken // Fresh token for navigation links
      });
    } catch (error) {
      console.error(`Error rendering ${route}:`, error);
      res.status(500).json({
        error: 'Failed to render page',
        details: error.message,
        route: route
      });
    }
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
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});