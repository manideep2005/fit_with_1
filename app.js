require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const { sendWelcomeEmail } = require('./services/emailService');

// MongoDB connection
const database = require('./config/database');
const UserService = require('./services/userService');

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

// Initialize MongoDB connection
database.connect().catch(error => {
  console.error('Failed to connect to MongoDB:', error);
  // Don't exit the process in production, allow app to run without DB for now
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

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

    app.get('/debug-database', async (req, res) => {
        try {
            const healthCheck = await database.healthCheck();
            const connectionStatus = database.getConnectionStatus();
            
            res.json({
                health: healthCheck,
                connection: connectionStatus,
                environment: {
                    NODE_ENV: process.env.NODE_ENV,
                    MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set',
                    MONGO_URL: process.env.MONGO_URL ? 'Set' : 'Not set'
                }
            });
        } catch (error) {
            res.status(500).json({
                error: error.message,
                stack: error.stack,
                connection: database.getConnectionStatus()
            });
        }
    });
}

// Signup Route - Updated to use MongoDB
app.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!email || !fullName || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Create user in database
    const user = await UserService.createUser({
      email: email.trim(),
      fullName: fullName.trim(),
      password: password
    });

    // Create user session
    req.session.user = {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      onboardingCompleted: user.onboardingCompleted
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
        redirectUrl: `/CustomOnboarding?sessionId=undefined&email=${encodeURIComponent(user.email)}`
      });
    });

    // Send welcome email (async, don't wait for it)
    try {
      console.log('Attempting to send welcome email...');
      const emailResult = await sendWelcomeEmail(user.email, user.fullName);
      console.log('Welcome email result:', emailResult);
    } catch (emailError) {
      console.error('Email sending failed in production, but continuing...', emailError);
      // Don't fail signup if email fails
    }

  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle specific MongoDB errors
    if (error.message.includes('already exists')) {
      return res.status(409).json({ 
        success: false,
        error: 'An account with this email already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Login Route - Updated to use MongoDB
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }
    
    // Authenticate user against database
    const user = await UserService.authenticateUser(email.trim(), password);
    
    // Create user session
    req.session.user = {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      onboardingCompleted: user.onboardingCompleted,
      personalInfo: user.personalInfo,
      onboardingData: {
        personalInfo: user.personalInfo,
        fitnessGoals: user.fitnessGoals,
        healthInfo: user.healthInfo,
        preferences: user.preferences
      }
    };
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Login failed' 
        });
      }
      
      // Redirect based on onboarding status
      const redirectUrl = user.onboardingCompleted 
        ? '/dashboard' 
        : `/CustomOnboarding?sessionId=undefined&email=${encodeURIComponent(user.email)}`;
      
      res.json({ 
        success: true,
        redirectUrl: redirectUrl
      });
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ 
      success: false,
      error: 'Invalid email or password' 
    });
  }
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

// Complete Onboarding Route - Updated to use MongoDB
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

    // Save onboarding data to database
    const updatedUser = await UserService.completeOnboarding(userEmail, onboardingData);
    
    // Update user session with onboarding data
    const fullName = `${onboardingData.personalInfo?.firstName || ''} ${onboardingData.personalInfo?.lastName || ''}`.trim();
    
    req.session.user = {
      ...req.session.user,
      _id: updatedUser._id,
      email: updatedUser.email,
      onboardingCompleted: updatedUser.onboardingCompleted,
      onboardingData: onboardingData,
      fullName: fullName || updatedUser.fullName || 'User',
      personalInfo: updatedUser.personalInfo,
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

// Password Reset Routes
app.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});

app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }
    
    // Check if user exists
    const user = await UserService.getUserByEmail(email.trim());
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset code shortly.'
      });
    }
    
    // Generate OTP and store it temporarily
    const { generateOTP, sendPasswordResetOTP } = require('./services/emailService');
    const otp = generateOTP();
    
    // Store OTP in session temporarily (in production, use Redis or database)
    req.session.passwordReset = {
      email: email.trim(),
      otp: otp,
      timestamp: Date.now(),
      attempts: 0
    };
    
    // Send OTP email
    await sendPasswordResetOTP(email.trim(), user.fullName, otp);
    
    res.json({
      success: true,
      message: 'Password reset code sent to your email address.'
    });
    
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
    });
  }
});

app.get('/reset-password', (req, res) => {
  // Check if there's a valid password reset session
  if (!req.session.passwordReset) {
    return res.redirect('/forgot-password');
  }
  
  res.render('reset-password', {
    email: req.session.passwordReset.email
  });
});

app.post('/verify-reset-otp', async (req, res) => {
  try {
    const { otp } = req.body;
    
    if (!req.session.passwordReset) {
      return res.status(400).json({
        success: false,
        error: 'No password reset session found. Please request a new reset code.'
      });
    }
    
    const resetData = req.session.passwordReset;
    
    // Check if OTP has expired (10 minutes)
    if (Date.now() - resetData.timestamp > 10 * 60 * 1000) {
      delete req.session.passwordReset;
      return res.status(400).json({
        success: false,
        error: 'Reset code has expired. Please request a new one.'
      });
    }
    
    // Check attempts limit
    if (resetData.attempts >= 3) {
      delete req.session.passwordReset;
      return res.status(400).json({
        success: false,
        error: 'Too many failed attempts. Please request a new reset code.'
      });
    }
    
    // Verify OTP
    if (otp !== resetData.otp) {
      req.session.passwordReset.attempts += 1;
      return res.status(400).json({
        success: false,
        error: 'Invalid reset code. Please try again.',
        attemptsLeft: 3 - req.session.passwordReset.attempts
      });
    }
    
    // OTP is valid, mark as verified
    req.session.passwordReset.verified = true;
    
    res.json({
      success: true,
      message: 'Reset code verified successfully.'
    });
    
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify reset code'
    });
  }
});

app.post('/reset-password', async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    
    if (!req.session.passwordReset || !req.session.passwordReset.verified) {
      return res.status(400).json({
        success: false,
        error: 'Invalid password reset session. Please start over.'
      });
    }
    
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Both password fields are required'
      });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }
    
    const email = req.session.passwordReset.email;
    
    // Reset the password
    await UserService.resetPassword(email, newPassword);
    
    // Send confirmation email
    const { sendPasswordResetConfirmation } = require('./services/emailService');
    const user = await UserService.getUserByEmail(email);
    await sendPasswordResetConfirmation(email, user.fullName);
    
    // Clear the password reset session
    delete req.session.passwordReset;
    
    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
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