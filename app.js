console.log('Starting Fit-With-AI application...');
console.log('Node.js version:', process.version);
console.log('Environment:', process.env.NODE_ENV);
console.log('Working directory:', process.cwd());

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken'); // Add at the top if not already present

console.log('Loading services...');
const { sendWelcomeEmail, generateOTP, sendPasswordResetOTP, sendPasswordResetConfirmation, sendFriendRequestEmail, sendFriendRequestAcceptedEmail } = require('./services/emailService');


const database = require('./config/database');
const UserService = require('./services/userService');
console.log('Services loaded successfully');

let redisClient = null;
try {
  if (process.env.REDIS_URL && !process.env.VERCEL) {
    console.log('Attempting to connect to Redis...');
    const redis = require('./services/redis');
    redisClient = redis;
    console.log('Redis client initialized');
  } else {
    console.log('Redis not configured or in Vercel environment, using memory sessions');
  }
} catch (error) {
  console.log('Redis not available, using memory sessions:', error.message);
}

const app = express();


const ensureDbConnection = async (req, res, next) => {
  try {
    const status = database.getConnectionStatus();
    if (status.status !== 'connected') {
      console.log('Database not connected, attempting to connect...');
      await database.connect();
      console.log('Database connected successfully');
    }
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


console.log('Initializing MongoDB connection...');
database.connect().then(() => {
  console.log('MongoDB connection established successfully');
}).catch(error => {
  console.error('Failed to connect to MongoDB:', error);
  console.log('Will attempt to connect on first database request');
});

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Ensure proper JSON serialization
app.set('json spaces', 0);
app.set('json replacer', null);


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


if (!process.env.SESSION_SECRET) {
    console.error('WARNING: SESSION_SECRET environment variable is not set. Using a default secret is not secure for production.');
}

// Configure session store
let sessionStore = undefined;
if (redisClient && !process.env.VERCEL) {
    try {
        const RedisStore = require('connect-redis');
        // Try different import patterns for connect-redis
        const Store = RedisStore.default || RedisStore;
        sessionStore = new Store({
            client: redisClient,
            prefix: 'fit-with-ai:sess:'
        });
        console.log('Redis session store configured');
    } catch (error) {
        console.log('Redis session store configuration failed, using memory store:', error.message);
        // For Vercel deployment, we'll use memory store which is fine for serverless
    }
} else if (process.env.VERCEL) {
    console.log('Vercel environment detected, using memory store for sessions');
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && !process.env.VERCEL, // Only secure in production non-Vercel
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Allow cross-site for Vercel
    },
    name: 'fit-with-ai-session',
    store: sessionStore
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

// Session validation middleware for API routes
const validateSession = (req, res, next) => {
  if (!req.session.user) {
    console.log('Session validation failed - no user in session');
    return res.status(401).json({
      success: false,
      error: 'Session expired. Please log in again.',
      code: 'SESSION_EXPIRED'
    });
  }
  
  if (!req.session.user._id) {
    console.log('Session validation failed - no user ID in session');
    return res.status(401).json({
      success: false,
      error: 'Invalid session. Please log in again.',
      code: 'INVALID_SESSION'
    });
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

// Session debugging endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug-session-detailed', (req, res) => {
    res.json({
      sessionExists: !!req.session,
      sessionID: req.sessionID,
      sessionUser: req.session.user,
      sessionData: req.session,
      cookies: req.headers.cookie,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      sessionSaveMethod: req.session.save ? 'Available' : 'Not available',
      sessionDestroyMethod: req.session.destroy ? 'Available' : 'Not available'
    });
  });

  app.post('/debug-create-test-session', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }
      
      // Find user in database
      const User = require('./models/User');
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Create test session
      req.session.user = {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        onboardingCompleted: user.onboardingCompleted,
        personalInfo: user.personalInfo,
        testSession: true,
        createdAt: new Date()
      };
      
      req.session.save((err) => {
        if (err) {
          console.error('Test session save error:', err);
          return res.status(500).json({ error: 'Failed to save test session' });
        }
        
        res.json({
          success: true,
          message: 'Test session created',
          sessionUser: req.session.user,
          sessionID: req.sessionID
        });
      });
      
    } catch (error) {
      console.error('Create test session error:', error);
      res.status(500).json({ error: 'Failed to create test session' });
    }
  });
} 
app.post('/signup', ensureDbConnection, async (req, res) => {
  console.log('Signup request received:', { body: req.body });
  
  try {
    const { fullName, email, password } = req.body;

    if (!email || !fullName || !password) {
      console.log('Missing required fields:', { email: !!email, fullName: !!fullName, password: !!password });
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    // Validate password length
    if (password.length < 6) {
      console.log('Password too short:', password.length);
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters long' 
      });
    }

    console.log('Attempting to create user in database...');
    
    // Create user in database
    const user = await UserService.createUser({
      email: email.trim(),
      fullName: fullName.trim(),
      password: password
    });

    console.log('User created successfully:', { userId: user._id, email: user.email });

    // Create user session
    req.session.user = {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      onboardingCompleted: user.onboardingCompleted
    };

    console.log('Session user set:', req.session.user);

    // Save session before responding
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Session creation failed' 
        });
      }
      
      console.log('Session saved successfully');
      
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
    console.error('Signup error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    // Handle specific MongoDB errors
    if (error.message.includes('already exists')) {
      return res.status(409).json({ 
        success: false,
        error: 'An account with this email already exists' 
      });
    }
    
    // More specific error handling
    if (error.name === 'MongoNetworkError') {
      console.error('MongoDB network error - connection failed');
      return res.status(500).json({ 
        success: false,
        error: 'Database connection failed' 
      });
    }
    
    if (error.name === 'MongoTimeoutError') {
      console.error('MongoDB timeout error');
      return res.status(500).json({ 
        success: false,
        error: 'Database operation timed out' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
   


// Login Route - Updated to use MongoDB
app.post('/login', ensureDbConnection, async (req, res) => {
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

// Complete Onboarding Route - Enhanced to save comprehensive data to MongoDB
app.post('/CustomOnboarding/complete', ensureDbConnection, async (req, res) => {
  try {
    const { onboardingData, token } = req.body;
    console.log('Received onboarding data:', JSON.stringify(onboardingData, null, 2)); // Debug log
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
        return res.status(400).json({
          success: false,
          error: 'Invalid token format'
        });
      }
    }

    if (!userEmail) {
      return res.status(401).json({
        success: false,
        error: 'No user session found'
      });
    }

    // Transform onboarding data to match User schema with better error handling
    const transformedData = {
      personalInfo: {
        firstName: onboardingData.personalInfo?.firstName || '',
        lastName: onboardingData.personalInfo?.lastName || '',
        age: onboardingData.personalInfo?.age ? parseInt(onboardingData.personalInfo.age) : null,
        gender: onboardingData.personalInfo?.gender || null,
        height: onboardingData.bodyMetrics?.height ? parseFloat(onboardingData.bodyMetrics.height) : null,
        weight: onboardingData.bodyMetrics?.weight ? parseFloat(onboardingData.bodyMetrics.weight) : null
      },
      fitnessGoals: {
        primaryGoal: onboardingData.healthGoals?.goals?.[0] || null,
        targetWeight: onboardingData.bodyMetrics?.targetWeight ? parseFloat(onboardingData.bodyMetrics.targetWeight) : null,
        activityLevel: onboardingData.bodyMetrics?.activityLevel || null,
        workoutFrequency: onboardingData.bodyMetrics?.workoutFrequency ? 
          (typeof onboardingData.bodyMetrics.workoutFrequency === 'string' ? 
            parseInt(onboardingData.bodyMetrics.workoutFrequency.split('-')[0]) || 3 : 
            parseInt(onboardingData.bodyMetrics.workoutFrequency)) : 3,
        preferredWorkoutTypes: Array.isArray(onboardingData.healthGoals?.goals) ? onboardingData.healthGoals.goals : [],
        fitnessExperience: 'beginner' // Default, can be enhanced later
      },
      healthInfo: {
        dietaryRestrictions: Array.isArray(onboardingData.dietaryPreferences?.allergies) ? 
          onboardingData.dietaryPreferences.allergies.filter(a => a !== 'none') : [],
        smokingStatus: onboardingData.lifestyle?.smokingStatus || 'never',
        alcoholConsumption: onboardingData.lifestyle?.alcoholConsumption || 'none'
      },
      preferences: {
        workoutTime: 'morning', // Default, can be enhanced later
        workoutDuration: 60, // Default 60 minutes
        equipmentAccess: [], // Can be enhanced later
        notifications: {
          email: true,
          push: true,
          workout: true,
          nutrition: true,
          progress: true
        },
        privacy: {
          profileVisibility: 'friends',
          shareProgress: false,
          shareWorkouts: false
        }
      }
    };

    console.log('Transformed onboarding data:', JSON.stringify(transformedData, null, 2));

    // Save onboarding data to database with better error handling
    let updatedUser;
    try {
      updatedUser = await UserService.completeOnboarding(userEmail, transformedData);
      console.log('User onboarding completed successfully');
    } catch (dbError) {
      console.error('Database error during onboarding completion:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database error: ' + dbError.message
      });
    }
    
    // Update user session with onboarding data
    const fullName = `${transformedData.personalInfo?.firstName || ''} ${transformedData.personalInfo?.lastName || ''}`.trim();
    
    req.session.user = {
      ...req.session.user,
      _id: updatedUser._id,
      email: updatedUser.email,
      onboardingCompleted: updatedUser.onboardingCompleted,
      onboardingData: transformedData,
      fullName: fullName || updatedUser.fullName || 'User',
      personalInfo: updatedUser.personalInfo,
      fitnessGoals: updatedUser.fitnessGoals,
      healthInfo: updatedUser.healthInfo,
      preferences: updatedUser.preferences,
      tempUser: false // No longer temporary
    };

    console.log('Updated user session:', req.session.user);

    // Save session and respond
    req.session.save(async (err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to save session: ' + err.message
        });
      }
      
      console.log('Session saved successfully'); // Debug log
      
      // Generate token for dashboard access with full name and onboarding data
      const dashboardToken = Buffer.from(JSON.stringify({
        email: userEmail,
        fullName: fullName || 'User',
        firstName: transformedData.personalInfo?.firstName || '',
        timestamp: Date.now(),
        sessionId: req.sessionID,
        onboardingData: transformedData
      })).toString('base64');

      // Send onboarding completion email (async, don't wait)
      try {
        const { sendOnboardingCompletionEmail } = require('./services/emailService');
        sendOnboardingCompletionEmail(userEmail, fullName || userName, transformedData)
          .then(() => console.log('Onboarding completion email sent successfully'))
          .catch(emailError => console.error('Failed to send onboarding completion email:', emailError));
      } catch (emailError) {
        console.error('Email service error:', emailError);
        // Don't fail the request if email fails
      }
      
      res.json({
        success: true,
        message: 'Onboarding completed successfully',
        redirectUrl: `/dashboard?token=${dashboardToken}`
      });
    });

  } catch (error) {
    console.error('Onboarding completion error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      success: false,
      error: 'Failed to complete onboarding: ' + error.message
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
  '/nutriscan',
  '/health',
  '/challenges',
  '/biometrics',
  '/schedule',
  '/community',
  '/ai-coach',
  '/chat',
  '/settings'
];
// Special handling for chat route
app.get('/chat', isAuthenticated, validateSession, checkOnboarding, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const conversationId = req.query.conversation;
    const friendId = req.query.friend;
    
    console.log(`Accessing chat for user:`, req.session.user?.email);
    
    // Get user's conversations
    const conversations = await chatService.getUserConversations(userId);
    
    let currentConversation = null;
    let currentFriend = null;
    let messages = [];
    
    // If a specific conversation or friend is requested
    if (conversationId || friendId) {
      if (friendId) {
        // Get friend info and messages
        const friends = await chatService.getUserFriends(userId);
        currentFriend = friends.find(f => f._id.toString() === friendId);
        
        if (currentFriend) {
          messages = await chatService.getConversationMessages(userId, friendId, 50, 0);
          currentConversation = conversationId || `${userId}_${friendId}`;
        }
      } else if (conversationId) {
        // Find conversation in the list
        const conv = conversations.find(c => c.conversationId === conversationId);
        if (conv) {
          currentConversation = conversationId;
          currentFriend = conv.friend;
          messages = await chatService.getConversationMessages(userId, currentFriend._id, 50, 0);
        }
      }
    }
    
    // Generate navigation token
    const navToken = Buffer.from(JSON.stringify({
      email: req.session.user.email || 'unknown',
      fullName: req.session.user.fullName || 'User',
      firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
      timestamp: Date.now(),
      sessionId: req.sessionID || 'no-session',
      route: '/chat',
      onboardingData: req.session.user.onboardingData || null
    })).toString('base64');
    
    res.render('chat-simple', {
      user: req.session.user,
      currentPath: '/chat',
      navToken: navToken,
      conversations: conversations,
      currentConversation: currentConversation,
      currentFriend: currentFriend,
      messages: messages,
      currentConversationId: currentConversation
    });
    
  } catch (error) {
    console.error('Error rendering chat:', error);
    res.status(500).json({
      error: 'Failed to render chat page',
      details: error.message
    });
  }
});

// Handle other protected routes (excluding chat)
const otherProtectedRoutes = protectedRoutes.filter(route => route !== '/chat');
otherProtectedRoutes.forEach(route => {
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

app.post('/forgot-password', ensureDbConnection, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }
    
    console.log('Processing password reset request for:', email.trim());
    
    // Check if user exists
    const user = await UserService.getUserByEmail(email.trim());
    if (!user) {
      console.log('No user found for email:', email.trim());
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset code shortly.'
      });
    }
    
    console.log('User found, generating OTP for:', user.email);
    
    // Generate OTP and store it temporarily
    const otp = generateOTP();
    
    // Store OTP in session temporarily (in production, use Redis or database)
    req.session.passwordReset = {
      email: email.trim(),
      otp: otp,
      timestamp: Date.now(),
      attempts: 0
    };
    
    console.log('Attempting to send password reset OTP email...');
    
    // Send OTP email
    try {
      await sendPasswordResetOTP(email.trim(), user.fullName, otp);
      console.log('Password reset OTP email sent successfully');
    } catch (emailError) {
      console.error('Failed to send password reset OTP email:', emailError);
      throw new Error('Failed to send password reset email: ' + emailError.message);
    }
    
    res.json({
      success: true,
      message: 'Password reset code sent to your email address.'
    });
    
  } catch (error) {
    console.error('Password reset request error:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    // Check for specific error types
    if (error.message.includes('Email configuration is missing')) {
      return res.status(500).json({
        success: false,
        error: 'Email service is not properly configured. Please contact support.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request. Please try again later.'
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

app.post('/reset-password', ensureDbConnection, async (req, res) => {
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

// Health check endpoint for Vercel
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    nodeVersion: process.version,
    workingDirectory: process.cwd(),
    routesRegistered: app._router ? app._router.stack.length : 0
  });
});

// Debug endpoint for Vercel (production safe)
app.get('/api/debug', (req, res) => {
  const routes = [];
  if (app._router && app._router.stack) {
    app._router.stack.forEach(layer => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        routes.push(`${methods.join(',').toUpperCase()} ${layer.route.path}`);
      }
    });
  }
  
  res.status(200).json({
    status: 'Debug Info',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    nodeVersion: process.version,
    workingDirectory: process.cwd(),
    routesCount: routes.length,
    routes: routes.slice(0, 20), // First 20 routes
    hasDatabase: !!database,
    databaseStatus: database ? database.getConnectionStatus() : 'Not available'
  });
});

// API Routes for Dashboard Data Management

// Add Workout Route
app.post('/api/workouts', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { type, duration, calories, exercises, notes } = req.body;
    const userEmail = req.session.user.email;

    const workoutData = {
      date: new Date(),
      type: type || 'General',
      duration: duration ? parseInt(duration) : 0,
      calories: calories ? parseInt(calories) : 0,
      exercises: exercises || [],
      notes: notes || ''
    };

    const updatedUser = await UserService.addWorkout(userEmail, workoutData);
    
    // Process gamification for workout completion
    let gamificationResults = null;
    try {
      gamificationResults = await gamificationService.processWorkoutCompletion(updatedUser._id, workoutData);
      console.log('Gamification results for workout:', gamificationResults);
    } catch (gamificationError) {
      console.error('Gamification processing error:', gamificationError);
      // Don't fail the workout logging if gamification fails
    }
    
    res.json({
      success: true,
      message: 'Workout logged successfully',
      workout: workoutData,
      gamification: gamificationResults
    });

  } catch (error) {
    console.error('Add workout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log workout'
    });
  }
});

// Add Biometric Data Route
app.post('/api/biometrics', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { weight, bodyFat, muscleMass, measurements } = req.body;
    const userEmail = req.session.user.email;

    const biometricData = {
      date: new Date(),
      weight: weight ? parseFloat(weight) : null,
      bodyFat: bodyFat ? parseFloat(bodyFat) : null,
      muscleMass: muscleMass ? parseFloat(muscleMass) : null,
      measurements: measurements || {}
    };

    const updatedUser = await UserService.addBiometrics(userEmail, biometricData);
    
    res.json({
      success: true,
      message: 'Biometric data saved successfully',
      biometrics: biometricData
    });

  } catch (error) {
    console.error('Add biometrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save biometric data'
    });
  }
});

// Add Nutrition Log Route
app.post('/api/nutrition', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { meals, totalCalories, totalProtein, totalCarbs, totalFat, waterIntake } = req.body;
    const userEmail = req.session.user.email;

    const nutritionData = {
      date: new Date(),
      meals: meals || [],
      totalCalories: totalCalories ? parseInt(totalCalories) : 0,
      totalProtein: totalProtein ? parseFloat(totalProtein) : 0,
      totalCarbs: totalCarbs ? parseFloat(totalCarbs) : 0,
      totalFat: totalFat ? parseFloat(totalFat) : 0,
      waterIntake: waterIntake ? parseInt(waterIntake) : 0
    };

    const updatedUser = await UserService.addNutritionLog(userEmail, nutritionData);
    
    // Process gamification for nutrition logging
    let gamificationResults = null;
    try {
      gamificationResults = await gamificationService.processNutritionLog(updatedUser._id, nutritionData);
      console.log('Gamification results for nutrition:', gamificationResults);
    } catch (gamificationError) {
      console.error('Gamification processing error:', gamificationError);
      // Don't fail the nutrition logging if gamification fails
    }
    
    res.json({
      success: true,
      message: 'Nutrition data logged successfully',
      nutrition: nutritionData,
      gamification: gamificationResults
    });

  } catch (error) {
    console.error('Add nutrition error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log nutrition data'
    });
  }
});


app.get('/api/gamification-data', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const user = await UserService.getUserByEmail(userEmail);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get gamification data using the service
    const gamificationData = await gamificationService.getGamificationData(user._id);
    
    res.json({
      success: true,
      data: gamificationData
    });

  } catch (error) {
    console.error('Get gamification data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gamification data'
    });
  }
});

// Get User Dashboard Data Route
app.get('/api/dashboard-data', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const user = await UserService.getUserByEmail(userEmail);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Calculate dashboard statistics
    const today = new Date();
    const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    
    // Ensure arrays exist before processing - FIXED
    const workouts = user.workouts || [];
    const nutritionLogs = user.nutritionLogs || [];
    const biometrics = user.biometrics || [];

    console.log('Dashboard data - Arrays check:', {
      workoutsLength: workouts.length,
      nutritionLogsLength: nutritionLogs.length,
      biometricsLength: biometrics.length
    });

    // Get this week's workouts
    const thisWeekWorkouts = workouts.filter(workout => 
      new Date(workout.date) >= weekStart
    );

    // Get today's nutrition - FIXED to sum all entries for today
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const todayNutritionLogs = nutritionLogs.filter(log => 
      new Date(log.date) >= todayStart && new Date(log.date) < todayEnd
    );

    console.log('Dashboard data - Today nutrition logs found:', todayNutritionLogs.length);
    
    // Sum up all nutrition entries for today
    const todayNutrition = todayNutritionLogs.reduce((total, log) => ({
      totalCalories: (total.totalCalories || 0) + (log.totalCalories || 0),
      totalProtein: (total.totalProtein || 0) + (log.totalProtein || 0),
      totalCarbs: (total.totalCarbs || 0) + (log.totalCarbs || 0),
      totalFat: (total.totalFat || 0) + (log.totalFat || 0),
      waterIntake: (total.waterIntake || 0) + (log.waterIntake || 0)
    }), {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      waterIntake: 0
    });

    console.log('Today nutrition totals:', {
      calories: todayNutrition.totalCalories,
      protein: todayNutrition.totalProtein,
      water: todayNutrition.waterIntake,
      entriesCount: todayNutritionLogs.length
    });

    // Get latest biometrics
    const latestBiometrics = biometrics.length > 0 
      ? biometrics[biometrics.length - 1] 
      : null;

    const dashboardData = {
      user: {
        fullName: user.displayName || user.fullName,
        firstName: user.personalInfo?.firstName || user.fullName?.split(' ')[0] || 'User',
        email: user.email,
        personalInfo: user.personalInfo,
        fitnessGoals: user.fitnessGoals,
        healthInfo: user.healthInfo,
        preferences: user.preferences
      },
      stats: {
        workoutsThisWeek: thisWeekWorkouts.length,
        targetWorkoutsPerWeek: user.fitnessGoals?.workoutFrequency || 5,
        todayCalories: todayNutrition.totalCalories || 0,
        targetCalories: 2000, // Can be calculated based on user data
        todayProtein: todayNutrition.totalProtein || 0,
        targetProtein: 150, // Can be calculated based on user data
        todayWater: todayNutrition.waterIntake || 0,
        targetWater: 2500 // ml
      },
      recentWorkouts: thisWeekWorkouts.slice(-5),
      latestBiometrics: latestBiometrics,
      bmi: user.bmi
    };

    console.log('Dashboard data being sent:', {
      workoutsThisWeek: dashboardData.stats.workoutsThisWeek,
      todayCalories: dashboardData.stats.todayCalories,
      todayWater: dashboardData.stats.todayWater
    });

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

// Update User Preferences Route
app.put('/api/user/preferences', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const { preferences } = req.body;

    const updatedUser = await UserService.updateUserPreferences(userEmail, preferences);
    
    // Update session
    req.session.user.preferences = updatedUser.preferences;
    
    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: updatedUser.preferences
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

// Subscription Management Routes

// Upgrade subscription
app.post('/api/subscription/upgrade', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const { plan, amount, paymentMethod, duration } = req.body;

    if (!plan || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Plan and amount are required'
      });
    }

    // Generate a dummy transaction ID
    const transactionId = 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Calculate end date (30 days from now for monthly)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (duration === 'yearly' ? 365 : 30));

    // Create subscription data
    const subscriptionData = {
      plan: plan,
      status: 'active',
      startDate: startDate,
      endDate: endDate,
      autoRenew: true,
      paymentHistory: []
    };

    // Create payment record
    const paymentData = {
      date: new Date(),
      amount: amount,
      plan: plan,
      duration: duration || 'monthly',
      paymentMethod: paymentMethod || 'Credit Card',
      transactionId: transactionId,
      status: 'completed'
    };

    // Update subscription
    await UserService.updateSubscription(userEmail, subscriptionData);
    
    // Add payment to history
    await UserService.addPayment(userEmail, paymentData);

    // Update session
    req.session.user.subscription = subscriptionData;

    res.json({
      success: true,
      message: 'Subscription upgraded successfully',
      subscription: subscriptionData,
      payment: paymentData
    });

  } catch (error) {
    console.error('Subscription upgrade error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upgrade subscription'
    });
  }
});

// Get subscription details
app.get('/api/subscription', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const subscription = await UserService.getSubscription(userEmail);
    
    res.json({
      success: true,
      subscription: subscription
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription details'
    });
  }
});

// Cancel subscription
app.post('/api/subscription/cancel', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    
    // Get current subscription
    const currentSubscription = await UserService.getSubscription(userEmail);
    
    // Update subscription status to cancelled
    const updatedSubscription = {
      ...currentSubscription,
      status: 'cancelled',
      autoRenew: false
    };

    await UserService.updateSubscription(userEmail, updatedSubscription);

    // Update session
    req.session.user.subscription = updatedSubscription;

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription: updatedSubscription
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
});

// AI Coach API Routes
const aiService = require('./services/aiService');
const gamificationService = require('./services/gamificationService');

// NutriScan Service
const nutriScanService = require('./services/nutriScanService');

// Health Service
const healthService = require('./services/healthService');

// Chat Service
const chatService = require('./services/chatService');

// AI Chat endpoint
app.post('/api/ai-chat', isAuthenticated, async (req, res) => {
  try {
    const { message } = req.body;
    const userContext = req.session.user;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    console.log('AI Chat request from:', userContext.email, 'Message:', message);

    // Get AI response
    const aiResponse = await aiService.getAIResponse(message.trim(), userContext);

    console.log('AI Response generated:', aiResponse.substring(0, 100) + '...');

    res.json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI response',
      fallback: "I'm here to help with your fitness journey! Please try asking about workouts, nutrition, or your fitness goals."
    });
  }
});

// AI Health check endpoint
app.get('/api/ai-health', isAuthenticated, async (req, res) => {
  try {
    const health = await aiService.healthCheck();
    res.json({
      success: true,
      health: health
    });
  } catch (error) {
    console.error('AI Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'AI service health check failed'
    });
  }
});

// Search workouts endpoint (Real YouTube API integration)
app.get('/api/search-workouts', isAuthenticated, async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    // Use YouTube Data API to search for real workout videos
    const videos = await searchYouTubeVideos(query);
    
    res.json({
      success: true,
      videos: videos,
      query: query
    });

  } catch (error) {
    console.error('Search workouts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search for workouts'
    });
  }
});

// Function to search YouTube videos using YouTube Data API
async function searchYouTubeVideos(query) {
  try {
    // YouTube Data API key - you'll need to get this from Google Cloud Console
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'YOUR_YOUTUBE_API_KEY';
    
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY') {
      console.log('YouTube API key not configured, using fallback videos');
      return getFallbackVideos(query);
    }

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query + ' workout fitness exercise')}&type=video&videoDuration=medium&videoDefinition=high&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return getFallbackVideos(query);
    }

    // Get video details including duration
    const videoIds = data.items.map(item => item.id.videoId).join(',');
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();
    
    // Process and format the videos
    const videos = data.items.map((item, index) => {
      const details = detailsData.items?.find(d => d.id === item.id.videoId);
      const duration = details ? parseDuration(details.contentDetails.duration) : '30 min';
      const viewCount = details ? formatViewCount(details.statistics.viewCount) : '1M';
      const durationMinutes = parseInt(duration.replace(/\D/g, '')) || 30;
      
      return {
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description.substring(0, 150) + '...',
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        duration: duration,
        calories: calculateCalories(durationMinutes, query),
        views: viewCount,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt
      };
    });

    return videos;

  } catch (error) {
    console.error('YouTube API error:', error);
    return getFallbackVideos(query);
  }
}


function getFallbackVideos(query) {
  const popularWorkoutVideos = [
    {
      videoId: 'UBMk30rjy0o',
      title: `${query.charAt(0).toUpperCase() + query.slice(1)} Workout - 30 Min Full Body`,
      description: `Complete ${query} workout routine for all fitness levels. Follow along for maximum results!`,
      thumbnail: 'https://img.youtube.com/vi/UBMk30rjy0o/maxresdefault.jpg',
      duration: '30 min',
      calories: calculateCalories(30, query),
      views: '1.2M',
      channelTitle: 'FitnessBlender'
    },
    {
      videoId: 'ml6cT4AZdqI',
      title: `Intense ${query.charAt(0).toUpperCase() + query.slice(1)} HIIT - 25 Minutes`,
      description: `High-intensity ${query} workout that will challenge your limits and boost your fitness.`,
      thumbnail: 'https://img.youtube.com/vi/ml6cT4AZdqI/maxresdefault.jpg',
      duration: '25 min',
      calories: calculateCalories(25, query),
      views: '856K',
      channelTitle: 'Calisthenic Movement'
    },
    {
      videoId: 'ixmxOlcrlUc',
      title: `Beginner ${query.charAt(0).toUpperCase() + query.slice(1)} - 20 Min Routine`,
      description: `Perfect ${query} workout for beginners. Easy to follow and highly effective.`,
      thumbnail: 'https://img.youtube.com/vi/ixmxOlcrlUc/maxresdefault.jpg',
      duration: '20 min',
      calories: calculateCalories(20, query),
      views: '2.1M',
      channelTitle: 'Yoga with Adriene'
    },
    {
      videoId: 'gC_L9qAHVJ8',
      title: `Advanced ${query.charAt(0).toUpperCase() + query.slice(1)} Challenge - 45 Min`,
      description: `Take your ${query} training to the next level with this advanced workout routine.`,
      thumbnail: 'https://img.youtube.com/vi/gC_L9qAHVJ8/maxresdefault.jpg',
      duration: '45 min',
      calories: calculateCalories(45, query),
      views: '634K',
      channelTitle: 'Athlean-X'
    },
    {
      videoId: 'QOVaHwm-Q6U',
      title: `Quick ${query.charAt(0).toUpperCase() + query.slice(1)} Blast - 15 Min`,
      description: `Short but effective ${query} workout perfect for busy schedules.`,
      thumbnail: 'https://img.youtube.com/vi/QOVaHwm-Q6U/maxresdefault.jpg',
      duration: '15 min',
      calories: calculateCalories(15, query),
      views: '945K',
      channelTitle: 'Pamela Reif'
    },
    {
      videoId: 'Eml2xnoLpYE',
      title: `${query.charAt(0).toUpperCase() + query.slice(1)} and Core Combo - 35 Min`,
      description: `Combine ${query} training with core strengthening for maximum impact.`,
      thumbnail: 'https://img.youtube.com/vi/Eml2xnoLpYE/maxresdefault.jpg',
      duration: '35 min',
      calories: calculateCalories(35, query),
      views: '1.8M',
      channelTitle: 'MadFit'
    }
  ];

  return popularWorkoutVideos;
}

// Parse YouTube duration format (PT15M33S) to readable format
function parseDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  
  const hours = (match[1] || '').replace('H', '');
  const minutes = (match[2] || '').replace('M', '');
  const seconds = (match[3] || '').replace('S', '');
  
  if (hours) {
    return `${hours}h ${minutes || '0'}m`;
  } else if (minutes) {
    return `${minutes} min`;
  } else {
    return `${seconds} sec`;
  }
}

// Format view count to readable format
function formatViewCount(viewCount) {
  const count = parseInt(viewCount);
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

// Helper function to calculate calories based on workout type and duration
function calculateCalories(minutes, workoutType) {
  const baseCaloriesPerMinute = {
    'cardio': 12,
    'hiit': 15,
    'strength': 8,
    'yoga': 3,
    'pilates': 5,
    'dance': 10,
    'boxing': 14,
    'cycling': 11,
    'running': 13,
    'swimming': 12,
    'crossfit': 16,
    'abs': 6,
    'core': 6,
    'legs': 9,
    'arms': 7,
    'back': 8,
    'chest': 8,
    'shoulders': 7
  };

  const type = workoutType.toLowerCase();
  let caloriesPerMinute = 8; // default

  for (const [key, value] of Object.entries(baseCaloriesPerMinute)) {
    if (type.includes(key)) {
      caloriesPerMinute = value;
      break;
    }
  }

  return Math.round(minutes * caloriesPerMinute);
}

// NutriScan API Routes

// Get nutrition information by barcode
app.get('/api/nutriscan/barcode/:barcode', isAuthenticated, async (req, res) => {
  try {
    const { barcode } = req.params;
    
    if (!nutriScanService.validateBarcode(barcode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid barcode format'
      });
    }
    
    console.log(`NutriScan: Looking up barcode ${barcode}`);
    
    const nutritionData = await nutriScanService.getNutritionByBarcode(barcode);
    
    if (nutritionData) {
      // Get recommendations based on user goals
      const userGoals = req.session.user?.fitnessGoals;
      const recommendations = nutriScanService.getNutritionRecommendations(userGoals, nutritionData);
      
      res.json({
        success: true,
        nutrition: nutritionData,
        recommendations: recommendations
      });
    } else {
      res.json({
        success: false,
        error: 'Product not found in nutrition database'
      });
    }
    
  } catch (error) {
    console.error('NutriScan barcode lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to lookup nutrition information'
    });
  }
});

// Search products by name
app.get('/api/nutriscan/search', isAuthenticated, async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }
    
    console.log(`NutriScan: Searching for products with query: ${query}`);
    
    const products = await nutriScanService.searchProducts(query.trim(), parseInt(limit));
    
    res.json({
      success: true,
      products: products,
      query: query.trim(),
      count: products.length
    });
    
  } catch (error) {
    console.error('NutriScan product search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search products'
    });
  }
});

// Get popular/trending products
app.get('/api/nutriscan/popular', isAuthenticated, async (req, res) => {
  try {
    const popularProducts = nutriScanService.getPopularProducts();
    
    res.json({
      success: true,
      products: popularProducts
    });
    
  } catch (error) {
    console.error('NutriScan popular products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular products'
    });
  }
});

// Health Rewards API Routes

// Get nearby health facilities
app.get('/api/health/facilities', isAuthenticated, async (req, res) => {
  try {
    const { lat, lng, rewardType, maxDistance = 10 } = req.query;
    
    // Mock user location if not provided
    const userLocation = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
    
    console.log(`Finding health facilities - Location: ${lat}, ${lng}, Reward Type: ${rewardType}`);
    
    const facilities = await healthService.findNearbyFacilities(userLocation, rewardType, parseInt(maxDistance));
    
    res.json({
      success: true,
      facilities: facilities,
      count: facilities.length,
      userLocation: userLocation
    });
    
  } catch (error) {
    console.error('Get health facilities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find health facilities'
    });
  }
});

// Search health facilities
app.get('/api/health/facilities/search', isAuthenticated, async (req, res) => {
  try {
    const { q: query, lat, lng } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }
    
    const userLocation = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
    const facilities = healthService.searchFacilities(query.trim(), userLocation);
    
    res.json({
      success: true,
      facilities: facilities,
      query: query.trim(),
      count: facilities.length
    });
    
  } catch (error) {
    console.error('Search health facilities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search health facilities'
    });
  }
});

// Get facility details
app.get('/api/health/facilities/:facilityId', isAuthenticated, async (req, res) => {
  try {
    const { facilityId } = req.params;
    const facility = healthService.getFacilityById(facilityId);
    
    if (!facility) {
      return res.status(404).json({
        success: false,
        error: 'Health facility not found'
      });
    }
    
    res.json({
      success: true,
      facility: facility
    });
    
  } catch (error) {
    console.error('Get facility details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get facility details'
    });
  }
});

// Get available appointment slots
app.get('/api/health/facilities/:facilityId/slots', isAuthenticated, async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required'
      });
    }
    
    const slots = await healthService.getAvailableSlots(facilityId, date);
    
    res.json({
      success: true,
      slots: slots,
      date: date,
      facilityId: facilityId
    });
    
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available slots'
    });
  }
});

// Book appointment with health reward
app.post('/api/health/book-appointment', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { facilityId, rewardId, appointmentData } = req.body;
    const userEmail = req.session.user.email;
    
    if (!facilityId || !appointmentData) {
      return res.status(400).json({
        success: false,
        error: 'Facility ID and appointment data are required'
      });
    }
    
    // Get user to check rewards
    const user = await UserService.getUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    let rewardUsed = null;
    
    // If reward is being used, validate it
    if (rewardId) {
      const reward = user.gamification?.rewards?.find(r => r.id === rewardId);
      if (!reward) {
        return res.status(404).json({
          success: false,
          error: 'Reward not found'
        });
      }
      
      const validation = healthService.validateRewardForBooking(reward, appointmentData.serviceType);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.reason
        });
      }
      
      rewardUsed = reward;
    }
    
    // Book the appointment
    const booking = await healthService.bookAppointment(facilityId, rewardId, user._id, appointmentData);
    
    // Mark reward as used if applicable
    if (rewardUsed) {
      const rewardIndex = user.gamification.rewards.findIndex(r => r.id === rewardId);
      if (rewardIndex !== -1) {
        user.gamification.rewards[rewardIndex].used = true;
        user.gamification.rewards[rewardIndex].usedAt = new Date();
        await user.save();
      }
    }
    
    res.json({
      success: true,
      booking: booking,
      rewardUsed: rewardUsed ? {
        id: rewardUsed.id,
        name: rewardUsed.name,
        type: rewardUsed.subType
      } : null
    });
    
  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to book appointment'
    });
  }
});

// Get user's health rewards
app.get('/api/health/rewards', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const user = await UserService.getUserByEmail(userEmail);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const healthRewards = user.gamification?.rewards?.filter(reward => reward.type === 'health') || [];
    
    // Add benefit information to each reward
    const rewardsWithBenefits = healthRewards.map(reward => ({
      ...reward.toObject(),
      benefit: healthService.getRewardBenefit(reward.subType),
      isExpired: new Date() > new Date(reward.expiresAt),
      daysUntilExpiry: Math.ceil((new Date(reward.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
    }));
    
    res.json({
      success: true,
      rewards: rewardsWithBenefits,
      count: rewardsWithBenefits.length,
      activeCount: rewardsWithBenefits.filter(r => !r.used && !r.isExpired).length
    });
    
  } catch (error) {
    console.error('Get health rewards error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get health rewards'
    });
  }
});

// Get streak rewards and upcoming milestones
app.get('/api/streak-rewards', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const user = await UserService.getUserByEmail(userEmail);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const streaks = user.gamification?.streaks || {};
    const workoutStreak = streaks.workout?.current || 0;
    const nutritionStreak = streaks.nutrition?.current || 0;

    // Get upcoming rewards for motivation
    const upcomingWorkoutRewards = gamificationService.getUpcomingStreakRewards(workoutStreak, 'workout');
    const upcomingNutritionRewards = gamificationService.getUpcomingStreakRewards(nutritionStreak, 'nutrition');

    // Get all streak rewards earned
    const allRewards = user.gamification?.rewards || [];
    const streakRewards = allRewards.filter(reward => reward.streakType);

    // Separate by type
    const healthRewards = streakRewards.filter(r => r.type === 'health');
    const fitnessRewards = streakRewards.filter(r => r.type === 'fitness');

    res.json({
      success: true,
      data: {
        currentStreaks: {
          workout: workoutStreak,
          nutrition: nutritionStreak,
          longestWorkout: streaks.workout?.longest || 0,
          longestNutrition: streaks.nutrition?.longest || 0
        },
        earnedRewards: {
          health: healthRewards.map(reward => ({
            ...reward.toObject(),
            isExpired: reward.expiresAt ? new Date() > new Date(reward.expiresAt) : false,
            daysUntilExpiry: reward.expiresAt ? Math.ceil((new Date(reward.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)) : null
          })),
          fitness: fitnessRewards.map(reward => ({
            ...reward.toObject(),
            isExpired: reward.expiresAt ? new Date() > new Date(reward.expiresAt) : false,
            daysUntilExpiry: reward.expiresAt ? Math.ceil((new Date(reward.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)) : null
          }))
        },
        upcomingRewards: {
          workout: upcomingWorkoutRewards,
          nutrition: upcomingNutritionRewards
        }
      }
    });
    
  } catch (error) {
    console.error('Get streak rewards error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get streak rewards'
    });
  }
});

// Use a streak reward
app.post('/api/streak-rewards/use', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { rewardId } = req.body;
    const userEmail = req.session.user.email;
    
    if (!rewardId) {
      return res.status(400).json({
        success: false,
        error: 'Reward ID is required'
      });
    }

    const user = await UserService.getUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Find the reward
    const rewardIndex = user.gamification.rewards.findIndex(r => r.id === rewardId);
    if (rewardIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Reward not found'
      });
    }

    const reward = user.gamification.rewards[rewardIndex];

    // Check if reward is already used
    if (reward.used) {
      return res.status(400).json({
        success: false,
        error: 'Reward has already been used'
      });
    }

    // Check if reward is expired
    if (reward.expiresAt && new Date() > new Date(reward.expiresAt)) {
      return res.status(400).json({
        success: false,
        error: 'Reward has expired'
      });
    }

    // Mark reward as used
    user.gamification.rewards[rewardIndex].used = true;
    user.gamification.rewards[rewardIndex].usedAt = new Date();
    
    await user.save();

    res.json({
      success: true,
      message: 'Reward used successfully',
      reward: {
        id: reward.id,
        name: reward.name,
        type: reward.type,
        subType: reward.subType,
        value: reward.value,
        usedAt: user.gamification.rewards[rewardIndex].usedAt
      }
    });
    
  } catch (error) {
    console.error('Use streak reward error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to use reward'
    });
  }
});

// Get user's booking history
app.get('/api/health/bookings', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const bookings = await healthService.getUserBookings(userId);
    
    res.json({
      success: true,
      bookings: bookings,
      count: bookings.length
    });
    
  } catch (error) {
    console.error('Get booking history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get booking history'
    });
  }
});

// Generate external booking link
app.post('/api/health/generate-booking-link', isAuthenticated, async (req, res) => {
  try {
    const { facilityId, rewardId } = req.body;
    const userId = req.session.user._id;
    
    if (!facilityId) {
      return res.status(400).json({
        success: false,
        error: 'Facility ID is required'
      });
    }
    
    const bookingLink = healthService.generateBookingLink(facilityId, rewardId, userId);
    
    res.json({
      success: true,
      bookingLink: bookingLink,
      facilityId: facilityId,
      rewardId: rewardId
    });
    
  } catch (error) {
    console.error('Generate booking link error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate booking link'
    });
  }
});

// Chat API Routes

// Get user's conversations
app.get('/api/chat/conversations', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const friends = await chatService.getUserFriends(userId);
    
    // Convert friends to conversation format
    const conversations = friends.map(friend => ({
      conversationId: `${userId}_${friend._id}`,
      friend: {
        _id: friend._id,
        fullName: friend.fullName,
        firstName: friend.firstName,
        avatar: friend.avatar
      },
      lastMessage: {
        content: 'Start chatting',
        timestamp: new Date(),
        isFromCurrentUser: false
      },
      unreadCount: 0
    }));
    
    res.json({
      success: true,
      conversations: conversations
    });
    
  } catch (error) {
    console.error('Get conversations error:', error);
    res.json({
      success: true,
      conversations: []
    });
  }
});

// Get conversation messages
app.get('/api/chat/messages/:friendId', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { friendId } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    
    const messages = await chatService.getConversationMessages(
      userId, 
      friendId, 
      parseInt(limit), 
      parseInt(skip)
    );
    
    // Mark messages as read
    await chatService.markMessagesAsRead(userId, friendId, userId);
    
    res.json({
      success: true,
      messages: messages
    });
    
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
});

// Send message
app.post('/api/chat/send', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const senderId = req.session.user._id;
    const { receiverId, content, messageType = 'text', attachmentData = null } = req.body;
    
    if (!receiverId || !content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Receiver ID and message content are required'
      });
    }
    
    if (content.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Message content too long (max 1000 characters)'
      });
    }
    
    const message = await chatService.sendMessage(
      senderId, 
      receiverId, 
      content, 
      messageType, 
      attachmentData
    );
    
    res.json({
      success: true,
      message: message
    });
    
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send message'
    });
  }
});

// Get user's friends
app.get('/api/chat/friends', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const friends = await chatService.getUserFriends(userId);
    
    res.json({
      success: true,
      friends: friends
    });
    
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get friends list'
    });
  }
});

// Send friend request
app.post('/api/chat/send-friend-request', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { friendEmail, message } = req.body;
    
    if (!friendEmail || friendEmail.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Friend email is required'
      });
    }
    
    const friendRequest = await chatService.sendFriendRequest(userId, friendEmail, message);
    
    res.json({
      success: true,
      message: 'Friend request sent successfully',
      request: friendRequest
    });
    
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send friend request'
    });
  }
});

// Get friend requests
app.get('/api/chat/friend-requests', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const pendingRequests = await chatService.getPendingFriendRequests(userId);
    const sentRequests = await chatService.getSentFriendRequests(userId);
    
    res.json({
      success: true,
      requests: pendingRequests,
      sentRequests: sentRequests
    });
    
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get friend requests'
    });
  }
});

// Accept friend request
app.post('/api/chat/friend-requests/:requestId/accept', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { requestId } = req.params;
    
    const result = await chatService.acceptFriendRequest(requestId, userId);
    
    res.json({
      success: true,
      message: 'Friend request accepted successfully',
      request: result
    });
    
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to accept friend request'
    });
  }
});

// Reject friend request
app.post('/api/chat/friend-requests/:requestId/reject', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { requestId } = req.params;
    
    const result = await chatService.rejectFriendRequest(requestId, userId);
    
    res.json({
      success: true,
      message: 'Friend request rejected successfully',
      request: result
    });
    
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject friend request'
    });
  }
});

// Legacy add friend endpoint (now sends friend request)
app.post('/api/chat/add-friend', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { friendEmail } = req.body;
    
    if (!friendEmail || friendEmail.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Friend email is required'
      });
    }
    
    const friendRequest = await chatService.addFriend(userId, friendEmail);
    
    res.json({
      success: true,
      message: 'Friend request sent successfully',
      request: friendRequest
    });
    
  } catch (error) {
    console.error('Add friend (legacy) error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send friend request'
    });
  }
});

// Remove friend
app.delete('/api/chat/friends/:friendId', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { friendId } = req.params;
    
    await chatService.removeFriend(userId, friendId);
    
    res.json({
      success: true,
      message: 'Friend removed successfully'
    });
    
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove friend'
    });
  }
});

// Search users
app.get('/api/chat/search-users', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { q: query, limit = 10 } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }
    
    const users = await chatService.searchUsers(userId, query.trim(), parseInt(limit));
    
    res.json({
      success: true,
      users: users
    });
    
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    });
  }
});

// Send friend request by user ID (for search results)
app.post('/api/chat/send-friend-request-by-id', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const senderId = req.session.user._id;
    const { userId, message } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    // Get the target user's email
    const targetUser = await UserService.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const friendRequest = await chatService.sendFriendRequest(senderId, targetUser.email, message || 'Hi! I would like to connect with you.');
    
    res.json({
      success: true,
      message: 'Friend request sent successfully',
      request: friendRequest
    });
    
  } catch (error) {
    console.error('Send friend request by ID error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send friend request'
    });
  }
});

// Share workout with friend
app.post('/api/chat/share-workout', isAuthenticated, ensureDbConnection, async (req, res) => {
try {
const senderId = req.session.user._id;
const { friendId, workoutData } = req.body;

if (!friendId || !workoutData) {
return res.status(400).json({
success: false,
error: 'Friend ID and workout data are required'
});
}

const message = await chatService.shareWorkout(senderId, friendId, workoutData);

res.json({
success: true,
message: 'Workout shared successfully',
chatMessage: message
});

} catch (error) {
console.error('Share workout error:', error);
res.status(500).json({
success: false,
error: 'Failed to share workout'
});
}
});

// Share progress with friend
app.post('/api/chat/share-progress', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const senderId = req.session.user._id;
    const { friendId, progressData } = req.body;
    
    if (!friendId || !progressData) {
      return res.status(400).json({
        success: false,
        error: 'Friend ID and progress data are required'
      });
    }
    
    const message = await chatService.shareProgress(senderId, friendId, progressData);
    
    res.json({
      success: true,
      message: 'Progress shared successfully',
      chatMessage: message
    });
    
  } catch (error) {
    console.error('Share progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share progress'
    });
  }
});


app.get('/api/chat/unread-count', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const count = await chatService.getUnreadMessageCount(userId);
    
    res.json({
      success: true,
      unreadCount: count
    });
    
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
});

// Delete message
app.delete('/api/chat/messages/:messageId', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { messageId } = req.params;
    
    await chatService.deleteMessage(messageId, userId);
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete message'
    });
  }
});

// Search users for friend requests
app.post('/api/users/search', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { query } = req.body;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }
    
    const users = await chatService.searchUsers(userId, query.trim(), 10);
    
    res.json({
      success: true,
      users: users
    });
    
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    });
  }
});

// Send friend request by user ID
app.post('/api/chat/send-friend-request-by-id', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const senderId = req.session.user._id;
    const senderName = req.session.user.fullName;
    const { userId, message } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    // Get target user
    const targetUser = await UserService.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const friendRequest = await chatService.sendFriendRequest(
      senderId, 
      targetUser.email, 
      message || 'Hi! I would like to connect with you on our fitness journey.'
    );
    
    // Send email notification
    try {
      await sendFriendRequestEmail(targetUser.email, targetUser.fullName, senderName, message);
    } catch (emailError) {
      console.error('Failed to send friend request email:', emailError);
    }
    
    res.json({
      success: true,
      message: 'Friend request sent successfully',
      request: friendRequest
    });
    
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send friend request'
    });
  }
});

// Get friend requests
app.get('/api/friends/requests', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const pendingRequests = await chatService.getPendingFriendRequests(userId);
    
    res.json({
      success: true,
      requests: pendingRequests.map(req => ({
        ...req,
        from: req.sender
      }))
    });
    
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get friend requests'
    });
  }
});

// Respond to friend request
app.post('/api/friends/respond', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { userId: senderId, action } = req.body;
    
    if (!senderId || !action) {
      return res.status(400).json({
        success: false,
        error: 'User ID and action are required'
      });
    }
    
    // Find the friend request
    const FriendRequest = require('./models/FriendRequest');
    const request = await FriendRequest.findOne({
      sender: senderId,
      receiver: userId,
      status: 'pending'
    });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Friend request not found'
      });
    }
    
    let result;
    if (action === 'accept') {
      result = await chatService.acceptFriendRequest(request._id, userId);
    } else if (action === 'decline') {
      result = await chatService.rejectFriendRequest(request._id, userId);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid action'
      });
    }
    
    res.json({
      success: true,
      message: `Friend request ${action}ed successfully`,
      request: result
    });
    
  } catch (error) {
    console.error('Respond to friend request error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to respond to friend request'
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

// Add error handling middleware
app.use((err, req, res, next) => {
console.error('Server error:', err);
res.status(500).json({
success: false,
error: process.env.NODE_ENV === 'production'
? 'Internal server error'
: err.message
});
});

// 404 Handler
app.use((req, res) => {
res.status(404).render('404', {
path: req.path
});
});

// Start Server (only in non-serverless environment)
if (!process.env.VERCEL) {
const PORT = process.env.PORT || 3008;
app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🤖 AI Coach Status: ${process.env.GOOGLE_AI_API_KEY ? 'Google AI Enabled' : 'Enhanced Fallback Mode'}`);
console.log(`🌐 Access your app at: http://localhost:${PORT}`);
});
}

console.log('App initialization completed successfully');
console.log('Vercel environment:', !!process.env.VERCEL);
console.log('App routes registered:', app._router ? 'Yes' : 'No');

// YouTube API status
const youtubeApiKey = process.env.YOUTUBE_API_KEY;
if (!youtubeApiKey || youtubeApiKey === 'YOUR_YOUTUBE_API_KEY') {
  console.log('🎥 YouTube API: Using fallback videos (limited functionality)');
  console.log('📝 To enable real YouTube search:');
  console.log('   1. Go to https://console.cloud.google.com/');
  console.log('   2. Create a new project or select existing');
  console.log('   3. Enable YouTube Data API v3');
  console.log('   4. Create credentials (API Key)');
  console.log('   5. Add YOUTUBE_API_KEY=your_key_here to .env file');
} else {
  console.log('🎥 YouTube API: Enabled - Real video search available');
}

// Token-based authentication middleware
app.use(async (req, res, next) => {
  if (!req.session.user && req.query.token) {
    try {
      // Replace 'your_jwt_secret' with your actual JWT secret or logic
      const decoded = jwt.decode(req.query.token);
      if (decoded && decoded.email) {
        // Optionally, you can verify the token with jwt.verify if you use a secret
        // const decoded = jwt.verify(req.query.token, 'your_jwt_secret');
        // Find the user in the database
        const User = require('./models/User');
        const user = await User.findOne({ email: decoded.email });
        if (user) {
          req.session.user = user;
        }
      }
    } catch (err) {
      // Invalid token, ignore and proceed
    }
  }
  next();
});

module.exports = app;
