console.log('Starting Fit-With-AI application...');
console.log('Node.js version:', process.version);
console.log('Environment:', process.env.NODE_ENV);
console.log('Working directory:', process.cwd());

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken'); 

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
let server, io;

// Add CORS middleware
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:3009'],
  credentials: true
}));

// Vercel-compatible setup - no Socket.IO for serverless
if (!process.env.VERCEL) {
  const http = require('http');
  server = http.createServer(app);
  
  // Only use Socket.IO for non-calling features in local development
  const { Server } = require("socket.io");
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected to socket');

    socket.on('join', (data) => {
      if (data && data.userId) {
        socket.userId = data.userId;
        socket.join(data.userId);
        console.log(`User ${data.userId} joined their room`);
      }
    });

    socket.on('send message', async (data) => {
      try {
        console.log('Socket message data (raw): ', data);
        console.log('Socket userId (before processing): ', socket.userId);
        const senderId = data.sender || socket.userId;
        
        if (!senderId || !data.receiver || !data.content) {
          console.error('Missing required message data:', {
            sender: senderId,
            receiver: data.receiver,
            content: data.content,
            socketUserId: socket.userId
          });
          socket.emit('message error', 'Missing required message data');
          return;
        }
        
        const savedMessage = await chatService.sendMessage(
          senderId, 
          data.receiver, 
          data.content,
          data.messageType || 'text'
        );
        
        io.to(data.receiver).emit('new message', savedMessage);
        socket.emit('message sent', savedMessage);
        
      } catch (error) {
        console.error('Send message error:', {
          message: error.message,
          stack: error.stack,
          senderId: data?.sender || socket.userId,
          receiverId: data?.receiver,
          content: data?.content
        });
        socket.emit('message error', error.message);
      }
    });
  });
} else {
  // Vercel serverless setup
  server = app;
  io = null;
  console.log('🚀 Running in Vercel serverless mode - WebRTC calls will use external signaling server');
}


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

// Add navigation middleware
const { validateNavigation, addNavHelpers } = require('./middleware/navMiddleware');
app.use(validateNavigation);
app.use(addNavHelpers);

// Ensure proper JSON serialization
app.set('json spaces', 0);
app.set('json replacer', null);


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


if (!process.env.SESSION_SECRET) {
    console.error('WARNING: SESSION_SECRET environment variable is not set. Using a default secret is not secure for production.');
}


console.log('🚨 Using database-only session approach...');

// Simple middleware to create our own session system
app.use(async (req, res, next) => {
  // Get session ID from cookie
  const sessionCookie = req.headers.cookie?.match(/fit-with-ai-session=([^;]+)/);
  let sessionId = null;
  
  if (sessionCookie) {
    try {
      // Clean decode the session ID from the cookie
      let rawSessionId = sessionCookie[1];
      // Remove URL encoding and session signature
      rawSessionId = decodeURIComponent(rawSessionId);
      if (rawSessionId.startsWith('s:')) {
        rawSessionId = rawSessionId.substring(2);
      }
      if (rawSessionId.includes('.')) {
        rawSessionId = rawSessionId.split('.')[0];
      }
      sessionId = rawSessionId;
      console.log('🍪 Found session ID in cookie:', sessionId);
    } catch (e) {
      console.log('❌ Failed to decode session cookie:', e.message);
    }
  }
  
  // If no session ID or invalid, create a new one
  if (!sessionId || sessionId.length < 10) {
    sessionId = require('crypto').randomBytes(24).toString('hex');
    console.log('🆕 Created new session ID:', sessionId);
    
    // Set the cookie with clean session ID
    res.cookie('fit-with-ai-session', sessionId, {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      httpOnly: false,
      secure: false,
      sameSite: 'lax'
    });
  }
  
  // Create a simple session object
  req.session = {
    id: sessionId,
    save: (callback) => {
      if (callback) callback();
    },
    regenerate: (callback) => {
      if (callback) callback();
    }
  };
  
  req.sessionID = sessionId;
  
  // Try to load user from database
  try {
    const UserSession = require('./models/UserSession');
    const dbSession = await UserSession.getSession(sessionId);
    
    if (dbSession && dbSession.userId) {
      // ALWAYS use the populated user object as the source of truth
      const user = dbSession.userId;
      req.session.user = {
        _id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        fitnessId: user.fitnessId, // Get ID from the main user profile
        profilePhoto: user.profilePhoto, // Add profile photo to session
        onboardingCompleted: user.onboardingCompleted,
        personalInfo: user.personalInfo,
        emailVerified: user.emailVerified || true
      };
      console.log('✅ Loaded user from database session:', req.session.user.email);
    } else {
      console.log('❌ No database session found for sessionId:', sessionId);
    }
  } catch (error) {
    console.log('❌ Failed to load database session:', error.message);
  }
  
  next();
});

console.log('✅ Database-only session system configured');

// Authentication Middleware - Works for Local and Vercel
const isAuthenticated = async (req, res, next) => {
  // Add user to req for API routes
  if (req.session && req.session.user) {
    req.user = req.session.user;
  }
  console.log('🔐 AUTH CHECK');
  console.log('📍 URL:', req.url);
  console.log('🌍 Environment:', process.env.NODE_ENV);
  console.log('☁️ Vercel:', !!process.env.VERCEL);
  console.log('🍪 Session exists:', !!req.session);
  console.log('🆔 Session ID:', req.sessionID);
  console.log('👤 Session user exists:', !!req.session.user);
  
  // DETAILED SESSION DEBUG
  if (req.session) {
    console.log('📊 Full session data:', JSON.stringify(req.session, null, 2));
  }
  
  if (req.session.user) {
    console.log('📧 User email:', req.session.user.email);
    console.log('✅ Onboarding completed:', req.session.user.onboardingCompleted);
  } else {
    console.log('❌ Session user is missing or undefined');
    console.log('🔍 Session keys:', Object.keys(req.session || {}));
  }

  try {
    // Method 1: Check Express session (works locally)
    if (req.session && req.session.user && req.session.user.onboardingCompleted) {
      console.log('✅ USER AUTHENTICATED VIA SESSION - ALLOWING ACCESS');
      return next();
    }

    // Method 2: For Vercel - check database session as fallback
    if (process.env.VERCEL && req.sessionID && (!req.session.user)) {
      console.log('🗄️ Vercel environment - checking database session...');
      try {
        const UserSession = require('./models/UserSession');
        const dbSession = await UserSession.getSession(req.sessionID);
        
        if (dbSession && dbSession.onboardingCompleted) {
          console.log('✅ USER AUTHENTICATED VIA DATABASE SESSION');
          
          // Restore Express session from database
          req.session.user = {
            _id: dbSession.userId._id,
            email: dbSession.userId.email,
            fullName: dbSession.userId.fullName,
            fitnessId: dbSession.userId.fitnessId, // Ensure fitnessId is loaded
            profilePhoto: dbSession.userId.profilePhoto, // Add profile photo
            onboardingCompleted: dbSession.userId.onboardingCompleted,
            personalInfo: dbSession.userId.personalInfo,
            fromDatabase: true
          };
          
          return next();
        }
      } catch (dbError) {
        console.log('❌ Database session check failed:', dbError.message);
      }
    }

    // If user exists but onboarding not complete
    if (req.session && req.session.user && !req.session.user.onboardingCompleted) {
      console.log('⚠️ USER EXISTS BUT ONBOARDING NOT COMPLETE');
      const email = req.session.user.email || '';
      // Generate token for onboarding
      const onboardingToken = Buffer.from(JSON.stringify({
        email: email,
        timestamp: Date.now(),
        purpose: 'onboarding'
      })).toString('base64');
      
      return res.redirect(`/CustomOnboarding?token=${onboardingToken}`);
    }

    // No valid authentication found
    console.log('❌ NO VALID AUTHENTICATION FOUND - REDIRECTING TO LOGIN');
    console.log('🔍 Debug info:', {
      sessionExists: !!req.session,
      sessionID: req.sessionID,
      userExists: !!req.session?.user,
      isVercel: !!process.env.VERCEL,
      cookies: req.headers.cookie?.substring(0, 100) + '...'
    });
    
    // For API routes, return JSON error
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    return res.redirect('/');

  } catch (error) {
    console.error('❌ Authentication error:', error);
    return res.redirect('/');
  }
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
    
    if (email) {
      // Generate token for onboarding
      const onboardingToken = Buffer.from(JSON.stringify({
        email: email,
        timestamp: Date.now(),
        purpose: 'onboarding'
      })).toString('base64');
      
      return res.redirect(`/CustomOnboarding?token=${onboardingToken}`);
    } else {
      return res.redirect('/');
    }
  }
  next();
};

// Virtual Doctor API Routes - placed early
app.get('/api/virtual-doctor-test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Virtual doctor API is working',
    databaseLoaded: Object.keys(medicalDatabase).length > 0,
    conditionsCount: Object.keys(medicalDatabase).length
  });
});

app.post('/api/virtual-doctor-analyze', async (req, res) => {
  try {
    const { symptoms } = req.body;
    
    if (!symptoms) {
      return res.status(400).json({ success: false, error: 'Symptoms required' });
    }
    
    if (Object.keys(medicalDatabase).length === 0) {
      return res.status(500).json({ success: false, error: 'Database not loaded' });
    }
    
    const matches = findMatchingConditions(symptoms);
    const aiAnalysis = generateAIAnalysis(symptoms, matches);
    
    res.json({
      success: true,
      matches,
      aiAnalysis,
      query: symptoms
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

// Dashboard route
app.get('/dashboard', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    console.log('📊 Dashboard route accessed');
    console.log('👤 Session user:', req.session.user);
    
    const navId = req.query.nav || Date.now().toString();
    
    res.render('dashboard', {
      user: req.session.user,
      navId: navId
    });
  } catch (error) {
    console.error('Dashboard render error:', error);
    res.redirect('/');
  }
});

// Debug route for session testing (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/test-session-flow', (req, res) => {
    res.sendFile(__dirname + '/test-session-flow.html');
  });
  
  // Test session persistence
  app.get('/test-session-check', (req, res) => {
    console.log('🧪 SESSION CHECK TEST');
    console.log('🆔 Session ID:', req.sessionID);
    console.log('👤 Session user exists:', !!req.session.user);
    console.log('📊 Full session:', JSON.stringify(req.session, null, 2));
    
    res.json({
      sessionID: req.sessionID,
      sessionExists: !!req.session,
      userExists: !!req.session.user,
      sessionData: req.session,
      cookies: req.headers.cookie
    });
  });
}

// Debug routes - only available in development
if (process.env.NODE_ENV !== 'production') {
    app.get('/test-sessions', (req, res) => {
        res.sendFile(__dirname + '/test-sessions.html');
    });
    
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
    
    app.get('/debug-user-session', (req, res) => {
        res.json({
            sessionExists: !!req.session,
            sessionID: req.sessionID,
            sessionUser: req.session.user,
            sessionKeys: Object.keys(req.session || {}),
            cookies: req.headers.cookie,
            fullSession: req.session
        });
    });
    
    app.get('/fix-session', async (req, res) => {
        try {
            const email = req.query.email || 'manideep.gonugunta1802@gmail.com';
            const User = require('./models/User');
            const UserSession = require('./models/UserSession');
            
            const user = await User.findOne({ email: email.toLowerCase().trim() });
            
            if (!user) {
                return res.json({ success: false, error: 'User not found' });
            }
            
            // Set user data in session
            req.session.user = {
                _id: user._id.toString(),
                email: user.email,
                fullName: user.fullName,
                fitnessId: user.fitnessId,
                profilePhoto: user.profilePhoto,
                onboardingCompleted: user.onboardingCompleted,
                personalInfo: user.personalInfo,
                emailVerified: true
            };
            
            // Create database session
            try {
                await UserSession.createSession(req.sessionID, user);
                console.log('✅ Database session created for fix-session');
            } catch (sessionError) {
                console.log('⚠️ Database session creation failed:', sessionError.message);
            }
            
            res.json({ 
                success: true, 
                message: 'Session fixed successfully!',
                user: req.session.user,
                sessionId: req.sessionID,
                redirectUrl: '/dashboard'
            });
        } catch (error) {
            console.error('Fix session error:', error);
            res.json({ success: false, error: error.message });
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
      fitnessId: user.fitnessId, // Add fitnessId to session
      onboardingCompleted: user.onboardingCompleted
    };

    console.log('Session user set:', req.session.user);

    // Save session before responding
    req.session.save(async (err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Session creation failed' 
        });
      }
      
      try {
        // Create database session for serverless persistence
        const UserSession = require('./models/UserSession');
        try {
          await UserSession.createSession(req.sessionID, user);
          console.log('Database session created for signup');
        } catch (sessionError) {
          console.log('Database session creation failed, attempting cleanup and retry:', sessionError.message);
          // Try to delete existing session and create new one
          try {
            await UserSession.deleteSession(req.sessionID);
            await UserSession.createSession(req.sessionID, user);
            console.log('Database session created after cleanup');
          } catch (retryError) {
            console.error('Failed to create session even after cleanup:', retryError.message);
          }
        }
      } catch (dbError) {
        console.error('Database session creation error:', dbError);
        // Don't fail signup if database session fails
      }
      
      console.log('Session saved successfully');
      
      // Generate verification token for URL
      const verificationToken = Buffer.from(JSON.stringify({
        email: user.email,
        timestamp: Date.now(),
        purpose: 'email_verification'
      })).toString('base64');
      
      res.json({
        success: true,
        redirectUrl: `/email-verification-otp?token=${verificationToken}`
      });
    });

    // Generate OTP and send verification email
    try {
      console.log('Generating email verification OTP...');
      const { generateOTP } = require('./services/emailService');
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Update user with OTP
      const User = require('./models/User');
      await User.updateOne(
        { _id: user._id },
        { 
          emailVerificationToken: otp,
          emailVerificationExpires: otpExpires,
          emailVerified: false
        }
      );
      
      console.log('Attempting to send email verification OTP...');
      const { sendEmailVerificationOTP } = require('./services/emailService');
      const emailResult = await sendEmailVerificationOTP(user.email, user.fullName, otp);
      console.log('Email verification OTP result:', emailResult);
    } catch (emailError) {
      console.error('Email verification OTP sending failed, but continuing...', emailError);
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
    
    // Check if email is verified
    if (!user.emailVerified) {
      console.log('User email not verified:', user.email);
      
      // Generate and send OTP automatically
      try {
        const { generateOTP, sendEmailVerificationOTP } = require('./services/emailService');
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        // Update user with OTP
        const User = require('./models/User');
        await User.updateOne(
          { _id: user._id },
          { 
            emailVerificationToken: otp,
            emailVerificationExpires: otpExpires
          }
        );
        
        // Send OTP email
        await sendEmailVerificationOTP(user.email, user.fullName, otp);
        console.log('OTP sent automatically for login verification:', user.email);
      } catch (emailError) {
        console.error('Failed to send login verification OTP:', emailError);
      }
      
      // Generate verification token for URL
      const verificationToken = Buffer.from(JSON.stringify({
        email: user.email,
        timestamp: Date.now(),
        purpose: 'email_verification'
      })).toString('base64');
      
      return res.json({
        success: false,
        error: 'Please verify your email address before logging in',
        redirectUrl: `/email-verification-otp?token=${verificationToken}`,
        requiresVerification: true
      });
    }
    
    // Create database session with device tracking
    console.log('🗄️ Creating database session with device tracking...');
    
    try {
      // Use session manager to create session with device info
      await sessionManager.createSession(req.sessionID, user, req);
      
      // Set user data in session
      req.session.user = {
        _id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        fitnessId: user.fitnessId, // Add fitnessId to session
        profilePhoto: user.profilePhoto, // Add profile photo to session
        onboardingCompleted: user.onboardingCompleted,
        personalInfo: user.personalInfo
      };
      
      console.log('✅ Database session created successfully!');
      console.log('✅ Session user set:', req.session.user.email);
      console.log('✅ Onboarding completed:', req.session.user.onboardingCompleted);
      console.log('🍪 Session ID:', req.sessionID);
      
      // Simple redirect logic
      const redirectUrl = user.onboardingCompleted ? '/dashboard' : '/CustomOnboarding';
      
      console.log('🔄 Redirecting to:', redirectUrl);
      
      res.json({ 
        success: true,
        redirectUrl: redirectUrl
      });
      
    } catch (dbError) {
      console.error('❌ Database session creation failed:', dbError.message);
      // Try one more time with a new session ID
      try {
        const newSessionId = require('crypto').randomBytes(24).toString('hex');
        req.sessionID = newSessionId;
        res.cookie('fit-with-ai-session', newSessionId, {
          maxAge: 1000 * 60 * 60 * 24,
          httpOnly: false,
          secure: false,
          sameSite: 'lax'
        });
        await UserSession.createSession(newSessionId, user);
        console.log('✅ Database session created with new session ID');
      } catch (finalError) {
        console.error('❌ Final session creation attempt failed:', finalError.message);
        return res.status(500).json({ 
          success: false,
          error: 'Login failed - session creation error' 
        });
      }
    }
    
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
  
  let email = req.session.user?.email;
  
  // If no email in session, try to get from token
  if (!email && req.query.token) {
    try {
      const tokenData = JSON.parse(Buffer.from(req.query.token, 'base64').toString());
      if (tokenData.purpose === 'onboarding' && tokenData.email) {
        email = tokenData.email;
      }
    } catch (error) {
      console.error('Invalid onboarding token:', error);
    }
  }
  
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
  '/challenges',
  '/schedule',
  '/community',
  '/ai-coach',
  '/chat',
  '/settings',
  '/subscription',
  '/payment-success',
  '/virtual-doctor'
];
// Test chat route
app.get('/chat-test', (req, res) => {
  res.render('chat-fixed');
});

// Special handling for chat route
app.get('/chat', isAuthenticated, validateSession, checkOnboarding, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    
    console.log(`💬 Accessing chat for user:`, req.session.user?.email);
    
    // Generate short navigation ID
    const { generateNavId, storeNavData } = require('./utils/slugify');
    const navId = generateNavId(req.session.user.email, '/chat');
    
    // Store navigation data
    storeNavData(navId, {
      email: req.session.user.email || 'unknown',
      fullName: req.session.user.fullName || 'User',
      firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
      sessionId: req.sessionID || 'no-session',
      route: '/chat',
      onboardingData: req.session.user.onboardingData || null
    });
    
    console.log('✅ Chat data loaded successfully');
    
    res.render('chat', {
      user: req.session.user,
      currentPath: '/chat',
      navId: navId,
      conversations: [], // Client-side will load this
      currentConversation: null,
      currentFriend: null,
      messages: []
    });
    
  } catch (error) {
    console.error('❌ Error rendering chat:', error);
    res.status(500).json({
      error: 'Failed to render chat page',
      details: error.message
    });
  }
});

// Add new routes to protected routes
protectedRoutes.push('/gamification', '/virtual-doctor');

// API Routes for Streaks and Gamification
app.use('/api/streaks', require('./routes/streaks'));

// API route for gamification data
app.get('/api/gamification-data', isAuthenticated, async (req, res) => {
  try {
    const streakService = require('./services/streakService');
    const streaks = await streakService.getStreakStatus(req.session.user._id);
    
    res.json({
      success: true,
      data: {
        streaks,
        level: Math.floor(((streaks.workout?.current || 0) + (streaks.nutrition?.current || 0) + (streaks.login?.current || 0)) / 10) + 1,
        totalXP: ((streaks.workout?.current || 0) * 10) + ((streaks.nutrition?.current || 0) * 8) + ((streaks.login?.current || 0) * 5)
      }
    });
  } catch (error) {
    console.error('Gamification data error:', error);
    res.status(500).json({ success: false, error: 'Failed to load gamification data' });
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

      // Use existing navId from query or generate new one
      const { generateNavId, storeNavData } = require('./utils/slugify');
      const navId = req.query.nav || generateNavId(req.session.user.email, route);
      
      // Store navigation data with short ID
      storeNavData(navId, {
        email: req.session.user.email || 'unknown',
        fullName: req.session.user.fullName || 'User',
        firstName: req.session.user.onboardingData?.personalInfo?.firstName || '',
        sessionId: req.sessionID || 'no-session',
        route: route,
        onboardingData: req.session.user.onboardingData || null
      });
      
      console.log(`Using navId for ${route}:`, navId); // Debug log
      
      res.render(viewName, { 
        user: req.session.user,
        currentPath: route,
        navId: navId, // Navigation ID (from query or generated)
        currentPage: viewName // Add currentPage for sidebar
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

// Email Verification Routes
app.get('/verify-email', (req, res) => {
  res.render('verify-email');
});

app.get('/email-verification-pending', (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.redirect('/');
  }
  res.render('email-verification-pending', { email: email });
});

app.get('/email-verification-otp', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.redirect('/');
  }
  
  try {
    // Decode token to get email
    const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
    const email = tokenData.email;
    
    if (!email || tokenData.purpose !== 'email_verification') {
      return res.redirect('/');
    }
    
    res.render('email-verification-otp', { email: email, token: token });
  } catch (error) {
    console.error('Invalid verification token:', error);
    return res.redirect('/');
  }
});

app.post('/api/verify-email', ensureDbConnection, async (req, res) => {
  try {
    const { otp, email } = req.body;
    
    if (!otp || !email) {
      return res.status(400).json({
        success: false,
        error: 'OTP and email are required'
      });
    }
    
    // Verify the OTP and update user's email verification status
    const User = require('./models/User');
    const user = await User.findOne({ 
      email: email.toLowerCase().trim(),
      emailVerificationToken: otp,
      emailVerificationExpires: { $gt: new Date() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code'
      });
    }
    
    // Mark email as verified using direct database update to bypass validation
    const mongoose = require('mongoose');
    await mongoose.connection.db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { emailVerified: true },
        $unset: { 
          emailVerificationToken: 1,
          emailVerificationExpires: 1
        }
      }
    );
    
    console.log('Email verified successfully for:', user.email);
    
    // Set user data in session
    req.session.user = {
      _id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      fitnessId: user.fitnessId,
      profilePhoto: user.profilePhoto,
      onboardingCompleted: user.onboardingCompleted,
      personalInfo: user.personalInfo,
      emailVerified: true
    };
    
    // Create database session
    try {
      const UserSession = require('./models/UserSession');
      await UserSession.createSession(req.sessionID, user);
      console.log('✅ Database session created after email verification');
    } catch (sessionError) {
      console.log('⚠️ Database session creation failed:', sessionError.message);
    }
    
    // Determine redirect URL
    const redirectUrl = user.onboardingCompleted ? '/dashboard' : '/CustomOnboarding';
    
    res.json({
      success: true,
      message: 'Email verified successfully',
      redirectUrl: redirectUrl
    });
    
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify email'
    });
  }
});

app.post('/api/resend-verification', ensureDbConnection, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }
    
    const User = require('./models/User');
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified'
      });
    }
    
    // Generate new OTP
    const { generateOTP } = require('./services/emailService');
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    user.emailVerificationToken = otp;
    user.emailVerificationExpires = otpExpires;
    await user.save();
    
    // Send OTP email
    const { sendEmailVerificationOTP } = require('./services/emailService');
    await sendEmailVerificationOTP(user.email, user.fullName, otp);
    
    console.log('OTP resent successfully to:', user.email);
    
    res.json({
      success: true,
      message: 'Verification code sent successfully'
    });
    
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification code'
    });
  }
});

app.post('/api/check-verification-status', ensureDbConnection, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }
    
    const User = require('./models/User');
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      verified: user.emailVerified || false
    });
    
  } catch (error) {
    console.error('Check verification status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check verification status'
    });
  }
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
    
    // Generate OTP and store it in database
    const otp = generateOTP();
    const PasswordReset = require('./models/PasswordReset');
    
    // Create password reset record in database
    await PasswordReset.createReset(email.trim(), otp);
    
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
  // For database-based reset, we'll get email from query parameter
  const email = req.query.email;
  
  if (!email) {
    return res.redirect('/forgot-password');
  }
  
  res.render('reset-password', {
    email: email
  });
});

app.post('/verify-reset-otp', ensureDbConnection, async (req, res) => {
  try {
    const { otp, email } = req.body;
    
    if (!otp || !email) {
      return res.status(400).json({
        success: false,
        error: 'OTP and email are required'
      });
    }
    
    const PasswordReset = require('./models/PasswordReset');
    
    try {
      // Verify OTP using database
      await PasswordReset.verifyOTP(email.trim(), otp);
      
      res.json({
        success: true,
        message: 'Reset code verified successfully.'
      });
      
    } catch (verifyError) {
      return res.status(400).json({
        success: false,
        error: verifyError.message
      });
    }
    
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
    const { newPassword, confirmPassword, email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    // Check if reset is verified in database
    const PasswordReset = require('./models/PasswordReset');
    const isVerified = await PasswordReset.isVerified(email.trim());
    
    if (!isVerified) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired password reset. Please start over.'
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
    
    // Reset the password
    await UserService.resetPassword(email.trim(), newPassword);
    
    // Send confirmation email
    const user = await UserService.getUserByEmail(email.trim());
    await sendPasswordResetConfirmation(email.trim(), user.fullName);
    
    // Clear the password reset record from database
    await PasswordReset.completeReset(email.trim());
    
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

    // Validate and structure exercise data
    let validatedExercises = [];
    if (exercises && Array.isArray(exercises)) {
      validatedExercises = exercises.map(exercise => {
        // Handle both object and string exercise data
        if (typeof exercise === 'string') {
          return {
            name: exercise,
            sets: null,
            reps: null,
            weight: null,
            duration: null
          };
        } else if (typeof exercise === 'object' && exercise !== null) {
          return {
            name: exercise.name || 'Unknown Exercise',
            sets: exercise.sets ? parseInt(exercise.sets) : null,
            reps: exercise.reps ? parseInt(exercise.reps) : null,
            weight: exercise.weight ? parseFloat(exercise.weight) : null,
            duration: exercise.duration ? parseInt(exercise.duration) : null
          };
        }
        return null;
      }).filter(exercise => exercise !== null); // Remove invalid exercises
    }

    const workoutData = {
      date: new Date(),
      type: type || 'General',
      duration: duration ? parseInt(duration) : 0,
      calories: calories ? parseInt(calories) : 0,
      exercises: validatedExercises,
      notes: notes || ''
    };

    console.log('Validated workout data:', JSON.stringify(workoutData, null, 2));

    const updatedUser = await UserService.addWorkout(userEmail, workoutData);
    
    // Update workout streak
    try {
      await streakService.updateUserStreaks(updatedUser._id);
    } catch (streakError) {
      console.error('Streak update error:', streakError);
    }
    
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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    res.status(500).json({
      success: false,
      error: 'Failed to log workout: ' + error.message
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
    
    // Update nutrition streak
    try {
      await streakService.updateUserStreaks(updatedUser._id);
    } catch (streakError) {
      console.error('Streak update error:', streakError);
    }
    
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
    
    // Add additional data for the dashboard
    const enhancedData = {
      ...gamificationData,
      user: {
        fullName: user.fullName,
        email: user.email,
        joinDate: user.createdAt
      },
      stats: {
        totalWorkouts: user.workouts?.length || 0,
        totalNutritionLogs: user.nutritionLogs?.length || 0,
        daysActive: Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))
      }
    };
    
    res.json({
      success: true,
      data: enhancedData
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

// Voice Assistant API Routes

// Get recent workouts for voice assistant
app.get('/api/workouts/recent', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const user = await UserService.getUserByEmail(userEmail);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const workouts = user.workouts || [];
    const recentWorkouts = workouts.slice(-5); // Get last 5 workouts

    res.json({
      success: true,
      workouts: recentWorkouts
    });

  } catch (error) {
    console.error('Get recent workouts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent workouts'
    });
  }
});

// Get active challenges for voice assistant
app.get('/api/challenges/active', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    // Mock active challenges for now
    const activeChallenges = [
      {
        id: '1',
        name: '30-Day Fitness Challenge',
        description: 'Complete 30 workouts in 30 days',
        progress: 15,
        target: 30,
        daysLeft: 15
      }
    ];

    res.json({
      success: true,
      challenges: activeChallenges
    });

  } catch (error) {
    console.error('Get active challenges error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active challenges'
    });
  }
});

// Add water intake endpoint for voice assistant
app.post('/api/nutrition/water', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { amount } = req.body;
    const userEmail = req.session.user.email;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid water amount is required'
      });
    }

    const nutritionData = {
      date: new Date(),
      meals: [],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      waterIntake: parseInt(amount)
    };

    const updatedUser = await UserService.addNutritionLog(userEmail, nutritionData);
    
    res.json({
      success: true,
      message: 'Water intake logged successfully',
      waterIntake: amount
    });

  } catch (error) {
    console.error('Add water intake error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log water intake'
    });
  }
});

// Quick Action APIs
app.post('/api/quick-actions/water', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { amount = 250 } = req.body;
    const userEmail = req.session.user.email;
    
    const nutritionData = {
      date: new Date(),
      meals: [],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      waterIntake: parseInt(amount)
    };
    
    await UserService.addNutritionLog(userEmail, nutritionData);
    
    res.json({
      success: true,
      message: `Added ${amount}ml water`,
      data: { waterAdded: amount }
    });
  } catch (error) {
    console.error('Quick water log error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log water'
    });
  }
});

// Enhanced Nutrition API Routes for Real-time Data

// Get today's nutrition summary
app.get('/api/nutrition/today', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const userEmail = req.session.user.email;
    
    // Get user data
    const user = await UserService.getUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Get today's nutrition logs
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const todayLogs = (user.nutritionLogs || []).filter(log => 
      new Date(log.date) >= todayStart && new Date(log.date) < todayEnd
    );

    // Calculate totals
    const totals = todayLogs.reduce((sum, log) => ({
      calories: sum.calories + (log.totalCalories || 0),
      protein: sum.protein + (log.totalProtein || 0),
      carbs: sum.carbs + (log.totalCarbs || 0),
      fat: sum.fat + (log.totalFat || 0),
      water: sum.water + (log.waterIntake || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 });

    // Get goals (can be enhanced with dynamic goals later)
    const goals = {
      calories: user.fitnessGoals?.dailyCalories || 2000,
      protein: user.fitnessGoals?.protein || 150,
      carbs: Math.round((user.fitnessGoals?.dailyCalories || 2000) * 0.45 / 4),
      fat: Math.round((user.fitnessGoals?.dailyCalories || 2000) * 0.25 / 9),
      water: 2500
    };

    // Calculate percentages
    const progress = {
      calories: { current: totals.calories, goal: goals.calories, percentage: Math.round((totals.calories / goals.calories) * 100) },
      protein: { current: totals.protein, goal: goals.protein, percentage: Math.round((totals.protein / goals.protein) * 100) },
      carbs: { current: totals.carbs, goal: goals.carbs, percentage: Math.round((totals.carbs / goals.carbs) * 100) },
      fat: { current: totals.fat, goal: goals.fat, percentage: Math.round((totals.fat / goals.fat) * 100) },
      water: { current: totals.water, goal: goals.water, percentage: Math.round((totals.water / goals.water) * 100) }
    };

    res.json({
      success: true,
      data: {
        progress,
        meals: todayLogs.flatMap(log => log.meals || []),
        totalEntries: todayLogs.length
      }
    });

  } catch (error) {
    console.error('Get today nutrition error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get today\'s nutrition data'
    });
  }
});

// Get nutrition meals for today
app.get('/api/nutrition/meals/today', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const user = await UserService.getUserByEmail(userEmail);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Get today's nutrition logs
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const todayLogs = (user.nutritionLogs || []).filter(log => 
      new Date(log.date) >= todayStart && new Date(log.date) < todayEnd
    );

    // Format meals with time and type
    const meals = [];
    todayLogs.forEach(log => {
      if (log.meals && log.meals.length > 0) {
        log.meals.forEach(meal => {
          meals.push({
            name: meal.name || 'Unknown Food',
            time: new Date(log.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            type: meal.type || 'snacks',
            calories: meal.calories || 0,
            protein: meal.protein || 0,
            carbs: meal.carbs || 0,
            fat: meal.fat || 0,
            icon: getMealIcon(meal.type || 'snacks')
          });
        });
      }
    });

    res.json({
      success: true,
      meals: meals.sort((a, b) => new Date('1970/01/01 ' + a.time) - new Date('1970/01/01 ' + b.time))
    });

  } catch (error) {
    console.error('Get today meals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get today\'s meals'
    });
  }
});

// Helper function to get meal icons
function getMealIcon(mealType) {
  const icons = {
    breakfast: 'egg',
    lunch: 'utensils',
    dinner: 'drumstick-bite',
    snacks: 'apple-alt'
  };
  return icons[mealType] || 'utensils';
}

// Log water intake (enhanced)
app.post('/api/nutrition/log-water', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { amount } = req.body;
    const userEmail = req.session.user.email;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid water amount is required'
      });
    }

    // Create a water-only nutrition log
    const nutritionData = {
      date: new Date(),
      meals: [],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      waterIntake: parseInt(amount)
    };

    await UserService.addNutritionLog(userEmail, nutritionData);
    
    // Get updated water total for today
    const user = await UserService.getUserByEmail(userEmail);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const todayLogs = (user.nutritionLogs || []).filter(log => 
      new Date(log.date) >= todayStart && new Date(log.date) < todayEnd
    );

    const totalWater = todayLogs.reduce((sum, log) => sum + (log.waterIntake || 0), 0);
    const waterGoal = 2500;
    const percentage = Math.round((totalWater / waterGoal) * 100);
    
    res.json({
      success: true,
      message: `Added ${amount}ml water!`,
      data: {
        totalWater,
        waterGoal,
        percentage,
        amountAdded: amount
      }
    });

  } catch (error) {
    console.error('Log water error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log water intake'
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

// Get subscription details with payment history
app.get('/api/subscription', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const user = await UserService.getUserByEmail(userEmail);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const subscription = user.subscription || { isActive: false, plan: 'free' };
    const paymentHistory = user.paymentHistory || [];
    
    // Calculate days remaining
    let daysRemaining = 0;
    if (subscription.isActive && subscription.expiresAt) {
      const now = new Date();
      const expiresAt = new Date(subscription.expiresAt);
      daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
    }
    
    res.json({
      success: true,
      subscription: {
        ...subscription,
        daysRemaining: daysRemaining,
        isExpired: daysRemaining === 0 && subscription.isActive
      },
      paymentHistory: paymentHistory.slice(-10) // Last 10 payments
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
chatService.init(io);

// Real-time Chat Service
const realtimeChatService = require('./services/realtimeChatService');
const { router: realtimeChatRouter, setupWebSocketServer } = require('./routes/realtimeChat');

// Initialize real-time chat
if (!process.env.VERCEL) {
  realtimeChatService.initialize();
  setupWebSocketServer(server);
  console.log('✅ Real-time chat system initialized');
}

// Schedule Service
const scheduleService = require('./services/scheduleService');

// Community Service
const communityService = require('./services/communityService');

// Dynamic Nutrition Service
const dynamicNutritionService = require('./services/dynamicNutritionService');

// Smart Nutrition Ecosystem Service
const smartNutritionService = require('./services/smartNutritionService');

// Enhanced Community Service
const enhancedCommunityService = require('./services/enhancedCommunityService');

// Enhanced Features Services
const aiFormCheckerService = require('./services/aiFormCheckerService');
const smartNotificationService = require('./services/smartNotificationService');
const socialChallengesService = require('./services/socialChallengesService');
const progressPredictionService = require('./services/progressPredictionService');
const voiceCommandsService = require('./services/voiceCommandsService');
const buddyFinderService = require('./services/buddyFinderService');

// Challenge Service
// Challenge Service - conditional loading
let challengeService;
try {
  challengeService = require('./services/challengeService');
} catch (error) {
  console.warn('Challenge service not loaded:', error.message);
}



// Import API routes
const settingsRoutes = require('./routes/settings');
const paymentRoutes = require('./routes/payment');

// Session Management
const { checkSessionConflict, sessionManager } = require('./middleware/sessionMiddleware');

// Streak Service
const streakService = require('./services/streakService');
const { updateWorkoutStreak, updateNutritionStreak } = require('./middleware/streakMiddleware');

// Initialize streak job
const { scheduleStreakCheck } = require('./jobs/streakJob');
if (!process.env.VERCEL) {
  scheduleStreakCheck();
}

// Add session conflict checking middleware for authenticated routes
app.use(checkSessionConflict);

// Use API routes
app.use('/api/sessions', require('./api/sessions'));
app.use('/api/security', require('./api/security'));
app.use('/api/settings', settingsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/payment-new', isAuthenticated, require('./fix-payment-system'));
app.use('/api/streaks', require('./routes/streaks'));
app.use('/api/subscription', isAuthenticated, ensureDbConnection, require('./routes/subscription'));
app.use('/api/enhanced', isAuthenticated, ensureDbConnection, require('./routes/enhancedFeatures'));
app.use('/api/realtime-chat', isAuthenticated, ensureDbConnection, realtimeChatRouter);
app.use('/api/community', isAuthenticated, ensureDbConnection, require('./routes/community'));

// Simple admin test route
app.get('/admin-test', (req, res) => {
  res.send('<h1>Admin Test Works!</h1><a href="/admin-dashboard-simple">Dashboard</a>');
});

app.get('/admin-dashboard-simple', async (req, res) => {
  try {
    const Admin = require('./models/Admin');
    const admin = await Admin.findOne({ username: 'admin' });
    res.send(`
      <h1>Simple Admin Dashboard</h1>
      <p>Admin found: ${admin ? 'Yes' : 'No'}</p>
      <p>Username: ${admin?.username}</p>
      <p>Email: ${admin?.email}</p>
      <p>Role: ${admin?.role}</p>
      <p>Time: ${new Date()}</p>
    `);
  } catch (error) {
    res.send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

// Simple admin login route
app.post('/admin/login', ensureDbConnection, async (req, res) => {
  try {
    const { username, password } = req.body;
    const Admin = require('./models/Admin');
    
    if (username === 'admin' && password === 'admin123') {
      req.session.admin = {
        id: 'admin-id',
        username: 'admin',
        email: 'admin@localhost.com',
        role: 'super_admin'
      };
      return res.redirect('/admin/dashboard');
    }
    
    res.redirect('/admin/login?error=invalid');
  } catch (error) {
    res.redirect('/admin/login?error=server');
  }
});

app.get('/admin/dashboard', ensureDbConnection, (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin/login');
  }
  
  res.send(`
    <h1>Admin Dashboard</h1>
    <p>Welcome, ${req.session.admin.username}!</p>
    <p>Role: ${req.session.admin.role}</p>
    <p>Time: ${new Date()}</p>
    <a href="/admin/logout">Logout</a>
  `);
});

app.get('/admin/logout', (req, res) => {
  req.session.admin = null;
  res.redirect('/admin/login');
});

// Admin routes
app.use('/admin', ensureDbConnection, require('./routes/admin'));

// Contact form API
app.post('/api/contact', ensureDbConnection, async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }
    
    const ContactMessage = require('./models/ContactMessage');
    
    const contactMessage = new ContactMessage({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    await contactMessage.save();
    
    res.json({
      success: true,
      message: 'Your message has been sent successfully!'
    });
    
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

// Subscription activation endpoint
app.post('/api/subscription/activate', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { planId, planName, amount, paymentId } = req.body;
    const userEmail = req.session.user.email;
    
    if (!planId || !planName || !amount || !paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Calculate expiration date
    const expiresAt = new Date();
    if (planId === 'basic') {
      expiresAt.setDate(expiresAt.getDate() + 7); // 1 week
    } else if (planId === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month for premium
    }
    
    // Create subscription data
    const subscriptionData = {
      plan: planId,
      planName: planName,
      isActive: true,
      startDate: new Date(),
      expiresAt: expiresAt,
      amount: amount,
      autoRenew: true
    };
    
    // Create payment record
    const paymentData = {
      date: new Date(),
      amount: amount,
      plan: planId,
      planName: planName,
      duration: planId === 'yearly' ? 'yearly' : (planId === 'basic' ? 'weekly' : 'monthly'),
      paymentMethod: 'UPI',
      transactionId: paymentId,
      status: 'completed'
    };
    
    // Update subscription using UserService
    await UserService.updateSubscription(userEmail, subscriptionData);
    
    // Add payment to history - fix the payment history structure
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    await collection.updateOne(
      { email: userEmail.toLowerCase().trim() },
      { $push: { paymentHistory: paymentData } }
    );
    
    // Update session
    req.session.user.subscription = subscriptionData;
    
    console.log('Subscription activated successfully for:', userEmail);
    
    res.json({
      success: true,
      message: 'Subscription activated successfully',
      subscription: subscriptionData,
      payment: paymentData
    });
    
  } catch (error) {
    console.error('Subscription activation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate subscription: ' + error.message
    });
  }
});

// AI Chat endpoint with hybrid AI service
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

    console.log('🤖 AI Chat request from:', userContext.email, 'Message:', message.substring(0, 50) + '...');

    // Use hybrid AI service
    const hybridAiService = require('./services/hybridAiService');
    const result = await hybridAiService.generateResponse(message.trim(), userContext);

    console.log('✅ AI Response generated by:', result.provider);

    res.json({
      success: result.success,
      response: result.response,
      provider: result.provider,
      timestamp: result.timestamp
    });

  } catch (error) {
    console.error('❌ AI Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI response',
      fallback: "I'm here to help with your fitness journey! Please try asking about workouts, nutrition, or your fitness goals."
    });
  }
});

// Advanced AI-Powered Workout Generation with Hybrid AI
app.post('/api/ai-workout-plan', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { preferences = {} } = req.body;
    const userEmail = req.session.user.email;
    
    // Get user profile
    const user = await UserService.getUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prepare user profile for AI
    const userProfile = {
      fitnessGoals: user.fitnessGoals,
      personalInfo: user.personalInfo,
      healthInfo: user.healthInfo,
      workoutHistory: user.workouts || [],
      onboardingData: user.onboardingData || req.session.user.onboardingData
    };

    console.log('🤖 Generating AI workout plan for:', user.email);

    // Use hybrid AI service
    const hybridAiService = require('./services/hybridAiService');
    const result = await hybridAiService.generateWorkoutPlan(userProfile, preferences);

    if (result.success) {
      res.json({
        success: true,
        workoutPlan: result.workoutPlan,
        generatedBy: result.generatedBy,
        timestamp: result.timestamp,
        message: 'Personalized workout plan generated successfully!'
      });
    } else {
      res.json({
        success: false,
        error: result.error,
        fallbackPlan: result.fallbackPlan
      });
    }

  } catch (error) {
    console.error('❌ AI workout generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate workout plan',
      details: error.message
    });
  }
});

// Form Correction Service Routes
const formCorrectionService = require('./services/formCorrectionService');

// Initialize form correction
app.post('/api/form-correction/initialize', isAuthenticated, async (req, res) => {
  try {
    const result = await formCorrectionService.initializePoseDetection();
    
    res.json({
      success: result.success,
      message: result.message || result.error,
      capabilities: result.capabilities,
      fallback: result.fallback
    });

  } catch (error) {
    console.error('Form correction initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize form correction',
      details: error.message
    });
  }
});

// Start form correction session
app.post('/api/form-correction/start-session', isAuthenticated, async (req, res) => {
  try {
    const { exerciseType } = req.body;
    const userProfile = req.session.user;

    if (!exerciseType) {
      return res.status(400).json({
        success: false,
        error: 'Exercise type is required'
      });
    }

    console.log(`🎯 Starting form correction session: ${exerciseType} for ${userProfile.email}`);

    const session = formCorrectionService.startSession(exerciseType, userProfile);

    res.json({
      success: true,
      session: session,
      message: `Form correction session started for ${session.exercise}`
    });

  } catch (error) {
    console.error('Start form correction session error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Analyze pose data
app.post('/api/form-correction/analyze', isAuthenticated, async (req, res) => {
  try {
    const { poseData, timestamp } = req.body;

    if (!poseData) {
      return res.status(400).json({
        success: false,
        error: 'Pose data is required'
      });
    }

    const analysis = formCorrectionService.analyzePose(poseData, timestamp);

    res.json({
      success: true,
      analysis: analysis
    });

  } catch (error) {
    console.error('Pose analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      fallbackFeedback: formCorrectionService.getFallbackFeedback()
    });
  }
});

// End form correction session
app.post('/api/form-correction/end-session', isAuthenticated, async (req, res) => {
  try {
    const summary = formCorrectionService.endSession();

    res.json({
      success: true,
      summary: summary,
      message: 'Form correction session completed successfully!'
    });

  } catch (error) {
    console.error('End form correction session error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get supported exercises for form correction
app.get('/api/form-correction/exercises', isAuthenticated, (req, res) => {
  try {
    const exercises = formCorrectionService.getSupportedExercises();

    res.json({
      success: true,
      exercises: exercises,
      count: exercises.length
    });

  } catch (error) {
    console.error('Get supported exercises error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get supported exercises'
    });
  }
});

// Form correction status
app.get('/api/form-correction/status', isAuthenticated, (req, res) => {
  try {
    const status = formCorrectionService.getStatus();

    res.json({
      success: true,
      status: status
    });

  } catch (error) {
    console.error('Form correction status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get form correction status'
    });
  }
});

// Virtual Training Service Routes
const virtualTrainingService = require('./services/virtualTrainingService');

// Virtual Doctor Service
const virtualDoctorService = require('./services/virtualDoctorService');

// Load medical database for virtual doctor
let medicalDatabase = {};
try {
  const fs = require('fs');
  const path = require('path');
  const dbPath = path.join(__dirname, 'public', 'data', 'medical-conditions.json');
  medicalDatabase = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  console.log('Medical database loaded:', Object.keys(medicalDatabase).length, 'conditions');
} catch (error) {
  console.error('Failed to load medical database:', error);
}

// Search trainers
app.get('/api/virtual-training/trainers', isAuthenticated, (req, res) => {
  try {
    const filters = {
      specialty: req.query.specialty,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
      minRating: req.query.minRating ? parseFloat(req.query.minRating) : undefined,
      language: req.query.language,
      sessionType: req.query.sessionType,
      sortBy: req.query.sortBy
    };

    const result = virtualTrainingService.searchTrainers(filters);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Search trainers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search trainers'
    });
  }
});

// Get trainer details
app.get('/api/virtual-training/trainers/:trainerId', isAuthenticated, (req, res) => {
  try {
    const { trainerId } = req.params;
    const trainer = virtualTrainingService.getTrainerDetails(trainerId);

    res.json({
      success: true,
      trainer: trainer
    });

  } catch (error) {
    console.error('Get trainer details error:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Book training session
app.post('/api/virtual-training/book', isAuthenticated, async (req, res) => {
  try {
    const bookingData = {
      ...req.body,
      userId: req.session.user._id,
      userProfile: {
        name: req.session.user.fullName,
        email: req.session.user.email,
        fitnessGoals: req.session.user.fitnessGoals,
        personalInfo: req.session.user.personalInfo
      }
    };

    console.log('📅 Booking virtual training session for:', req.session.user.email);

    const result = await virtualTrainingService.bookSession(bookingData);

    res.json(result);

  } catch (error) {
    console.error('Book training session error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Start training session
app.post('/api/virtual-training/start/:bookingId', isAuthenticated, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { participantType = 'client' } = req.body;

    console.log(`🎥 Starting virtual training session: ${bookingId}`);

    const session = await virtualTrainingService.startSession(bookingId, participantType);

    res.json({
      success: true,
      session: session
    });

  } catch (error) {
    console.error('Start training session error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// End training session
app.post('/api/virtual-training/end/:sessionId', isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { participantId, sessionData } = req.body;

    const result = await virtualTrainingService.endSession(sessionId, participantId, sessionData);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('End training session error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get user bookings
app.get('/api/virtual-training/bookings', isAuthenticated, (req, res) => {
  try {
    const userId = req.session.user._id;
    const bookings = virtualTrainingService.getUserBookings(userId);

    res.json({
      success: true,
      ...bookings
    });

  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bookings'
    });
  }
});

// Cancel booking
app.post('/api/virtual-training/cancel/:bookingId', isAuthenticated, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const userId = req.session.user._id;

    const result = await virtualTrainingService.cancelBooking(bookingId, userId, reason);

    res.json(result);

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Virtual training status
app.get('/api/virtual-training/status', isAuthenticated, (req, res) => {
  try {
    const status = virtualTrainingService.getStatus();

    res.json({
      success: true,
      status: status
    });

  } catch (error) {
    console.error('Virtual training status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get virtual training status'
    });
  }
});

// AI Health check endpoint with hybrid service
app.get('/api/ai-health', isAuthenticated, async (req, res) => {
  try {
    const hybridAiService = require('./services/hybridAiService');
    const health = await hybridAiService.healthCheck();
    res.json({
      success: true,
      health: health
    });
  } catch (error) {
    console.error('❌ AI Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'AI service health check failed'
    });
  }
});

// Daily Insights API
app.get('/api/insights/daily', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const insightsService = require('./services/insightsService');
    const user = await UserService.getUserByEmail(req.session.user.email);
    const insights = insightsService.generateDailyInsights(user);
    
    res.json({
      success: true,
      insights: insights
    });
  } catch (error) {
    console.error('Daily insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get daily insights'
    });
  }
});

// Weekly Report API
app.get('/api/insights/weekly', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const insightsService = require('./services/insightsService');
    const user = await UserService.getUserByEmail(req.session.user.email);
    const report = insightsService.generateWeeklyReport(user);
    
    res.json({
      success: true,
      report: report
    });
  } catch (error) {
    console.error('Weekly report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get weekly report'
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

// Schedule API Routes

// Create schedule event
app.post('/api/schedule/events', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const result = await scheduleService.createEvent(userId, req.body);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Event created successfully',
        event: result.event
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Create schedule event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event'
    });
  }
});

// Get user schedule
app.get('/api/schedule/events', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const result = await scheduleService.getUserSchedule(userId, start, end);
    
    if (result.success) {
      res.json({
        success: true,
        events: result.events
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get schedule'
    });
  }
});

// Get today's events
app.get('/api/schedule/today', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const result = await scheduleService.getTodaysEvents(userId);
    
    if (result.success) {
      res.json({
        success: true,
        events: result.events
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get today events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get today\'s events'
    });
  }
});

// Get upcoming events
app.get('/api/schedule/upcoming', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { limit = 10 } = req.query;
    
    const result = await scheduleService.getUpcomingEvents(userId, parseInt(limit));
    
    if (result.success) {
      res.json({
        success: true,
        events: result.events
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get upcoming events'
    });
  }
});

// Update schedule event
app.put('/api/schedule/events/:eventId', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { eventId } = req.params;
    
    const result = await scheduleService.updateEvent(eventId, userId, req.body);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Event updated successfully',
        event: result.event
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Update schedule event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event'
    });
  }
});

// Delete schedule event
app.delete('/api/schedule/events/:eventId', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { eventId } = req.params;
    
    const result = await scheduleService.deleteEvent(eventId, userId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Event deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Delete schedule event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event'
    });
  }
});

// Complete schedule event
app.post('/api/schedule/events/:eventId/complete', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { eventId } = req.params;
    const { notes } = req.body;
    
    const result = await scheduleService.completeEvent(eventId, userId, notes);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Event completed successfully',
        event: result.event
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Complete schedule event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete event'
    });
  }
});

// Get schedule statistics
app.get('/api/schedule/stats', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const result = await scheduleService.getScheduleStats(userId, start, end);
    
    if (result.success) {
      res.json({
        success: true,
        stats: result.stats
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get schedule stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get schedule statistics'
    });
  }
});

// Get AI schedule suggestions
app.get('/api/schedule/suggestions', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const result = await scheduleService.generateScheduleSuggestions(userId);
    
    if (result.success) {
      res.json({
        success: true,
        suggestions: result.suggestions
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get schedule suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get schedule suggestions'
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

// Notification API Routes

// Register FCM token
app.post('/api/notifications/register-token', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userEmail = req.session.user.email;
    
    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        error: 'FCM token is required'
      });
    }
    
    // Update user's FCM token in database
    const User = require('./models/User');
    await User.updateOne(
      { email: userEmail },
      { fcmToken: fcmToken },
      { upsert: false }
    );
    
    console.log('✅ FCM token registered for user:', userEmail);
    
    res.json({
      success: true,
      message: 'FCM token registered successfully'
    });
    
  } catch (error) {
    console.error('❌ Error registering FCM token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register FCM token'
    });
  }
});

// Send push notification (for testing)
app.post('/api/notifications/send-test', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const User = require('./models/User');
    const user = await User.findOne({ email: userEmail });
    
    if (!user || !user.fcmToken) {
      return res.status(400).json({
        success: false,
        error: 'No FCM token found for user'
      });
    }
    
    const notificationService = require('./services/notificationService');
    const result = await notificationService.sendNotification(
      user.fcmToken,
      'Test Notification',
      'This is a test push notification from Fit-With-AI!',
      {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    );
    
    res.json({
      success: result.success,
      message: result.success ? 'Test notification sent' : 'Failed to send notification',
      error: result.error
    });
    
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

// Chat API Routes

// Get user's conversations
app.get('/api/chat/conversations', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const friends = await chatService.getUserFriends(userId).catch(() => []);
    
    const conversations = (friends || []).map(friend => ({
      conversationId: `${userId}_${friend._id}`,
      friend: {
        _id: friend._id,
        fullName: friend.fullName || 'Unknown',
        firstName: friend.firstName || friend.fullName?.split(' ')[0] || 'User',
        avatar: friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.fullName || 'User')}&background=6C63FF&color=fff`
      },
      lastMessage: {
        content: 'Ready to chat',
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
      parseInt(limit) || 50, 
      parseInt(skip) || 0
    ).catch(() => []);
    
    // Mark messages as read (ignore errors)
    chatService.markMessagesAsRead(userId, friendId, userId).catch(() => {});
    
    res.json({
      success: true,
      messages: messages || []
    });
    
  } catch (error) {
    console.error('Get messages error:', error);
    res.json({
      success: true,
      messages: []
    });
  }
});

// Send message
app.post('/api/chat/send', isAuthenticated, ensureDbConnection, async (req, res) => {
try {
const senderId = req.session.user._id;
const { receiverId, content, messageType = 'text', attachmentData = null } = req.body;

console.log('💬 Sending message:', {
senderId,
receiverId,
content: content?.substring(0, 50) + '...',
messageType
});

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
content.trim(),
messageType,
attachmentData
);

console.log('✅ Message sent successfully:', message._id);

res.json({
success: true,
message: message
});

} catch (error) {
console.error('❌ Send message error:', error);
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
console.log('👥 Getting friends for user:', userId);

const friends = await chatService.getUserFriends(userId).catch(() => []);
console.log('✅ Friends retrieved:', friends.length);

res.json({
success: true,
friends: friends || []
});

} catch (error) {
console.error('❌ Get friends error:', error);
res.json({
success: true,
friends: []
});
}
});

// Send friend request
app.post('/api/chat/send-friend-request', isAuthenticated, ensureDbConnection, async (req, res) => {
try {
const userId = req.session.user._id;
const { friendEmail, message } = req.body;

console.log('📤 Sending friend request:', { userId, friendEmail });

if (!friendEmail || friendEmail.trim().length === 0) {
return res.status(400).json({
success: false,
error: 'Friend email is required'
});
}

const friendRequest = await chatService.sendFriendRequest(userId, friendEmail.trim(), message || '');

console.log('✅ Friend request sent successfully');

res.json({
success: true,
message: 'Friend request sent successfully',
request: friendRequest
});

} catch (error) {
console.error('❌ Send friend request error:', error);
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
console.log('📥 Getting friend requests for user:', userId);

const pendingRequests = await chatService.getPendingFriendRequests(userId);
const sentRequests = await chatService.getSentFriendRequests(userId);

console.log('✅ Friend requests retrieved:', {
pending: pendingRequests.length,
sent: sentRequests.length
});

res.json({
success: true,
requests: pendingRequests,
sentRequests: sentRequests
});

} catch (error) {
console.error('❌ Get friend requests error:', error);
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

console.log('🔍 Searching users:', { userId, query, limit });

if (!query || query.trim().length < 2) {
return res.status(400).json({
success: false,
error: 'Search query must be at least 2 characters long'
});
}

const users = await chatService.searchUsers(userId, query.trim(), parseInt(limit));

console.log('✅ Search results:', users.length);

res.json({
success: true,
users: users
});

} catch (error) {
console.error('❌ Search users error:', error);
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

// Mark message as read
app.post('/api/chat/messages/:messageId/read', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { messageId } = req.params;
    
    const Message = require('./models/Message');
    await Message.updateOne(
      { _id: messageId, receiver: userId },
      { status: 'read', readAt: new Date() }
    );
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
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

// Remove friend
app.post('/api/chat/remove-friend', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { friendId } = req.body;
    
    if (!friendId) {
      return res.status(400).json({
        success: false,
        error: 'Friend ID is required'
      });
    }
    
    await chatService.removeFriend(userId, friendId);
    
    res.json({
      success: true,
      message: 'Friend removed successfully'
    });
    
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove friend'
    });
  }
});

// Block friend
app.post('/api/chat/block-friend', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { friendId } = req.body;
    
    if (!friendId) {
      return res.status(400).json({
        success: false,
        error: 'Friend ID is required'
      });
    }
    
    await chatService.blockFriend(userId, friendId);
    
    res.json({
      success: true,
      message: 'Friend blocked successfully'
    });
    
  } catch (error) {
    console.error('Block friend error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to block friend'
    });
  }
});

// Clear chat
app.post('/api/chat/clear-chat', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { friendId } = req.body;
    
    if (!friendId) {
      return res.status(400).json({
        success: false,
        error: 'Friend ID is required'
      });
    }
    
    await chatService.clearChat(userId, friendId);
    
    res.json({
      success: true,
      message: 'Chat cleared successfully'
    });
    
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear chat'
    });
  }
});

// Export chat
app.get('/api/chat/export/:friendId', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { friendId } = req.params;
    
    const exportData = await chatService.exportChat(userId, friendId);
    
    res.json({
      success: true,
      chatData: exportData.chatData,
      friendName: exportData.friendName
    });
    
  } catch (error) {
    console.error('Export chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export chat'
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

// Logout Route - Updated for custom session system
app.get('/logout', async (req, res) => {
  try {
    // Clean up database session
    if (req.sessionID) {
      const UserSession = require('./models/UserSession');
      await UserSession.deleteSession(req.sessionID);
      console.log('✅ Database session cleaned up');
    }
  } catch (error) {
    console.error('❌ Error cleaning up database session:', error);
  }

  // Clear session data
  req.session.user = null;
  
  // Clear cookies
  res.clearCookie('connect.sid');
  res.clearCookie('fit-with-ai-session');
  
  console.log('✅ User logged out successfully');
  res.redirect('/');
});

// Settings API Routes - Dynamic preferences and notifications
app.post('/api/settings/preferences', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const preferences = req.body;
    
    const User = require('./models/User');
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Update preferences
    if (!user.preferences) user.preferences = {};
    Object.assign(user.preferences, preferences);
    
    await user.save();
    
    // Update session
    req.session.user.preferences = user.preferences;
    
    res.json({ success: true, preferences: user.preferences });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

app.post('/api/settings/notifications', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const notifications = req.body;
    
    const User = require('./models/User');
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Update notifications
    if (!user.notifications) user.notifications = {};
    Object.assign(user.notifications, notifications);
    
    await user.save();
    
    // Update session
    req.session.user.notifications = user.notifications;
    
    res.json({ success: true, notifications: user.notifications });
  } catch (error) {
    console.error('Update notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to update notifications' });
  }
});

app.post('/api/settings/security', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const security = req.body;
    
    const User = require('./models/User');
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Update security settings
    if (!user.security) user.security = {};
    Object.assign(user.security, security);
    
    await user.save();
    
    // Update session
    req.session.user.security = user.security;
    
    res.json({ success: true, security: user.security });
  } catch (error) {
    console.error('Update security error:', error);
    res.status(500).json({ success: false, error: 'Failed to update security' });
  }
});

app.post('/api/settings/check-updates', isAuthenticated, (req, res) => {
  res.json({ 
    success: true, 
    hasUpdate: false, 
    message: 'You are using the latest version!' 
  });
});

app.post('/api/settings/clear-cache', isAuthenticated, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Cache cleared successfully!' 
  });
});

app.use('/api/settings', isAuthenticated, ensureDbConnection, require('./routes/settings'));

// Subscription API Routes
app.get('/api/user/subscription-status', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const User = require('./models/User');
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      return res.json({ success: true, subscription: { isActive: false } });
    }

    const now = new Date();
    const hasActiveSubscription = user.subscription && 
                                user.subscription.isActive && 
                                new Date(user.subscription.expiresAt) > now;

    if (hasActiveSubscription) {
      return res.json({
        success: true,
        subscription: {
          isActive: true,
          planId: user.subscription.plan,
          planName: user.subscription.planName,
          amount: user.subscription.amount,
          expiresAt: user.subscription.expiresAt,
          status: 'active'
        }
      });
    } else {
      return res.json({
        success: true,
        subscription: { isActive: false }
      });
    }
  } catch (error) {
    return res.json({ success: true, subscription: { isActive: false } });
  }
});

// Meal Planner API Routes
app.use('/api/meal-planner', isAuthenticated, ensureDbConnection, require('./routes/mealPlanner'));

// Community API Routes

// Get user's groups (My Groups)
app.get('/api/community/groups/my', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    console.log('Getting groups for user:', userId);
    
    const groups = await communityService.getUserGroups(userId);
    console.log('Found groups:', groups.length);
    
    res.json({
      success: true,
      groups: groups || []
    });
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get groups'
    });
  }
});

// Legacy endpoint for backward compatibility
app.get('/api/community/groups', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const groups = await communityService.getUserGroups(userId);
    
    res.json({
      success: true,
      groups: groups || []
    });
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get groups'
    });
  }
});

// Get public groups
app.get('/api/community/groups/public', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { limit = 20, category } = req.query;
    
    console.log('Getting public groups for user:', userId, 'category:', category);
    
    const groups = await communityService.getPublicGroups(parseInt(limit), category);
    const userGroups = await communityService.getUserGroups(userId);
    const userGroupIds = userGroups.map(g => g._id.toString());
    
    // Mark which groups user has already joined
    const groupsWithMembership = groups.map(group => ({
      ...group,
      isMember: userGroupIds.includes(group._id.toString())
    }));
    
    console.log('Found public groups:', groups.length, 'User is member of:', userGroupIds.length);
    
    res.json({
      success: true,
      groups: groupsWithMembership
    });
  } catch (error) {
    console.error('Get public groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get public groups'
    });
  }
});

// Create group
app.post('/api/community/groups', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    
    console.log('Creating group for user:', userId, 'data:', req.body);
    
    const group = await communityService.createGroup(userId, req.body);
    console.log('Group created:', group._id);
    
    res.json({
      success: true,
      message: 'Group created successfully',
      group: group
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create group'
    });
  }
});

// Get group members
app.get('/api/community/groups/:groupId/members', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { groupId } = req.params;
    const members = await communityService.getGroupMembers(groupId);
    
    res.json({
      success: true,
      members: members || []
    });
  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group members'
    });
  }
});

// Delete group (for creators only)
app.delete('/api/community/groups/:groupId', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { groupId } = req.params;
    
    const result = await communityService.deleteGroup(userId, groupId);
    
    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete group'
    });
  }
});

// Search community content
app.get('/api/community/search', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }
    
    const results = await communityService.searchContent(query.trim());
    
    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    console.error('Search community error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search community content'
    });
  }
});

// Join group
app.post('/api/community/groups/:groupId/join', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { groupId } = req.params;
    
    console.log('User', userId, 'attempting to join group', groupId);
    
    const result = await communityService.joinGroup(userId, groupId);
    console.log('Join group result:', result);
    
    res.json({
      success: true,
      message: 'Joined group successfully',
      group: result
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to join group'
    });
  }
});

// Leave group
app.post('/api/community/groups/:groupId/leave', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { groupId } = req.params;
    
    console.log('User', userId, 'attempting to leave group', groupId);
    
    const result = await communityService.leaveGroup(userId, groupId);
    console.log('Leave group result:', result);
    
    res.json({
      success: true,
      message: 'Left group successfully'
    });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to leave group'
    });
  }
});

// Get group posts
app.get('/api/community/groups/:groupId/posts', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 20, skip = 0 } = req.query;
    
    const posts = await communityService.getGroupPosts(groupId, parseInt(limit), parseInt(skip));
    
    res.json({
      success: true,
      posts: posts
    });
  } catch (error) {
    console.error('Get group posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group posts'
    });
  }
});

// Get user feed
app.get('/api/community/feed', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { limit = 20, skip = 0 } = req.query;
    
    console.log('Getting feed for user:', userId, 'limit:', limit, 'skip:', skip);
    
    const posts = await communityService.getUserFeed(userId, parseInt(limit), parseInt(skip));
    console.log('Found posts:', posts.length);
    
    res.json({
      success: true,
      posts: posts || []
    });
  } catch (error) {
    console.error('Get user feed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user feed'
    });
  }
});

// Create post
app.post('/api/community/posts', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    
    console.log('Creating post for user:', userId, 'data:', req.body);
    
    const post = await communityService.createPost(userId, req.body);
    console.log('Post created:', post._id);
    
    res.json({
      success: true,
      message: 'Post created successfully',
      post: post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create post'
    });
  }
});

// Like/unlike post
app.post('/api/community/posts/:postId/like', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { postId } = req.params;
    
    console.log('User', userId, 'liking post', postId);
    
    const result = await communityService.likePost(userId, postId);
    
    res.json({
      success: true,
      likes: result.likes || 0,
      isLiked: result.isLiked || false
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to like post'
    });
  }
});

// Add comment
app.post('/api/community/posts/:postId/comments', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { postId } = req.params;
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      });
    }
    
    const comment = await communityService.addComment(userId, postId, content);
    
    res.json({
      success: true,
      message: 'Comment added successfully',
      comment: comment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add comment'
    });
  }
});

// Search groups
app.get('/api/community/search/groups', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }
    
    const groups = await communityService.searchGroups(query.trim(), parseInt(limit));
    
    res.json({
      success: true,
      groups: groups
    });
  } catch (error) {
    console.error('Search groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search groups'
    });
  }
});

// Search posts
app.get('/api/community/search/posts', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { q: query, groupId, limit = 20 } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }
    
    const posts = await communityService.searchPosts(query.trim(), groupId, parseInt(limit));
    
    res.json({
      success: true,
      posts: posts
    });
  } catch (error) {
    console.error('Search posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search posts'
    });
  }
});

// Delete post
app.delete('/api/community/posts/:postId', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { postId } = req.params;
    
    const result = await communityService.deletePost(userId, postId);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete post'
    });
  }
});

// Get group stats
app.get('/api/community/groups/:groupId/stats', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { groupId } = req.params;
    const stats = await communityService.getGroupStats(groupId);
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Get group stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group stats'
    });
  }
});

// Dynamic Nutrition API Routes

// Get real-time nutrition progress
app.get('/api/nutrition/progress', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const progress = await dynamicNutritionService.getRealTimeProgress(userId);
    
    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Get nutrition progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get nutrition progress'
    });
  }
});

// Get smart nutrition suggestions
app.get('/api/nutrition/suggestions', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const suggestions = await dynamicNutritionService.getSmartSuggestions(userId);
    
    res.json({
      success: true,
      suggestions: suggestions
    });
  } catch (error) {
    console.error('Get nutrition suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions'
    });
  }
});

// Quick log food
app.post('/api/nutrition/quick-log', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { foodName, quantity = 1 } = req.body;
    
    if (!foodName) {
      return res.status(400).json({
        success: false,
        error: 'Food name is required'
      });
    }
    
    const result = await dynamicNutritionService.quickLogFood(userId, foodName, quantity);
    
    res.json({
      success: true,
      message: 'Food logged successfully',
      data: result
    });
  } catch (error) {
    console.error('Quick log food error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to log food'
    });
  }
});

// Get nutrition insights
app.get('/api/nutrition/insights', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const insights = await dynamicNutritionService.getNutritionInsights(userId);
    
    res.json({
      success: true,
      insights: insights
    });
  } catch (error) {
    console.error('Get nutrition insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get insights'
    });
  }
});

// ============================================================================
// SMART NUTRITION ECOSYSTEM API ROUTES
// ============================================================================

// AI Meal Planning
app.post('/api/smart-nutrition/meal-plan', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const preferences = req.body;
    
    console.log('🍽️ Generating AI meal plan for user:', userId);
    
    const result = await smartNutritionService.generateMealPlan(userId, preferences);
    
    res.json({
      success: result.success,
      mealPlan: result.mealPlan,
      generatedBy: result.generatedBy,
      error: result.error
    });
  } catch (error) {
    console.error('AI meal plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate meal plan'
    });
  }
});

// Smart Grocery Lists
app.post('/api/smart-nutrition/grocery-list', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { mealPlan, preferences = {} } = req.body;
    
    if (!mealPlan) {
      return res.status(400).json({
        success: false,
        error: 'Meal plan is required'
      });
    }
    
    console.log('🛒 Generating smart grocery list');
    
    const result = smartNutritionService.generateGroceryList(mealPlan, preferences);
    
    res.json(result);
  } catch (error) {
    console.error('Smart grocery list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate grocery list'
    });
  }
});

// Macro Nutrient Optimization
app.post('/api/smart-nutrition/optimize-macros', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { currentIntake, goals, activityLevel } = req.body;
    
    if (!currentIntake || !goals) {
      return res.status(400).json({
        success: false,
        error: 'Current intake and goals are required'
      });
    }
    
    console.log('⚖️ Optimizing macros for user');
    
    const result = smartNutritionService.optimizeMacros(currentIntake, goals, activityLevel);
    
    res.json(result);
  } catch (error) {
    console.error('Macro optimization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize macros'
    });
  }
});

// Food Sensitivity Detection
app.post('/api/smart-nutrition/detect-sensitivities', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { symptoms = [] } = req.body;
    
    // Get user's nutrition history
    const user = await UserService.getUserByEmail(req.session.user.email);
    const nutritionHistory = user.nutritionLogs || [];
    
    console.log('🔍 Detecting food sensitivities for user:', userId);
    
    const result = smartNutritionService.detectSensitivities(nutritionHistory, symptoms);
    
    res.json(result);
  } catch (error) {
    console.error('Food sensitivity detection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect sensitivities'
    });
  }
});

// Restaurant Menu Scanner
app.post('/api/smart-nutrition/scan-menu', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { restaurantName, menuItems = [] } = req.body;
    
    if (!restaurantName) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant name is required'
      });
    }
    
    console.log('📱 Scanning restaurant menu:', restaurantName);
    
    const result = smartNutritionService.scanRestaurantMenu(restaurantName, menuItems);
    
    res.json(result);
  } catch (error) {
    console.error('Restaurant menu scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan menu'
    });
  }
});


app.get('/api/challenges/stats', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    if (!challengeService) {
      return res.json({ success: true, stats: { challengesCompleted: 0, currentStreak: 0, achievementsUnlocked: 0, totalPoints: 0 } });
    }
    const userId = req.session.user._id;
    const stats = await challengeService.getUserStats(userId);
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Get challenge stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get challenge stats'
    });
  }
});

// Get active challenges
app.get('/api/challenges/active', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    if (!challengeService) {
      return res.json({ success: true, challenges: [] });
    }
    const userId = req.session.user._id;
    const challenges = await challengeService.getActiveChallenges(userId);
    
    res.json({
      success: true,
      challenges: challenges
    });
  } catch (error) {
    console.error('Get active challenges error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active challenges'
    });
  }
});

// Get suggested challenges
app.get('/api/challenges/suggested', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    if (!challengeService) {
      return res.json({ success: true, challenges: [] });
    }
    const userId = req.session.user._id;
    const challenges = await challengeService.getSuggestedChallenges(userId);
    
    res.json({
      success: true,
      challenges: challenges
    });
  } catch (error) {
    console.error('Get suggested challenges error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggested challenges'
    });
  }
});

// Join challenge
app.post('/api/challenges/:challengeId/join', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { challengeId } = req.params;
    
    const challenge = await challengeService.joinChallenge(userId, challengeId);
    
    res.json({
      success: true,
      message: 'Successfully joined challenge',
      challenge: challenge
    });
  } catch (error) {
    console.error('Join challenge error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to join challenge'
    });
  }
});

// Update challenge progress
app.post('/api/challenges/:challengeId/progress', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { challengeId } = req.params;
    const { progress } = req.body;
    
    if (typeof progress !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Progress value is required'
      });
    }
    
    const challenge = await challengeService.updateProgress(userId, challengeId, progress);
    
    res.json({
      success: true,
      message: 'Progress updated successfully',
      challenge: challenge
    });
  } catch (error) {
    console.error('Update challenge progress error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update progress'
    });
  }
});

// Get leaderboard
app.get('/api/challenges/leaderboard', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    if (!challengeService) {
      return res.json({ success: true, leaderboard: [] });
    }
    const { limit = 10 } = req.query;
    const leaderboard = await challengeService.getLeaderboard(parseInt(limit));
    
    res.json({
      success: true,
      leaderboard: leaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard'
    });
  }
});

// Create challenge and send to friend
app.post('/api/challenges/create', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    if (!challengeService) {
      return res.status(503).json({
        success: false,
        error: 'Challenge service temporarily unavailable'
      });
    }
    const creatorId = req.session.user._id;
    const { title, description, type, target, duration, friendIdentifier, points } = req.body;
    
    if (!title || !description || !type || !target || !friendIdentifier) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }
    
    const result = await challengeService.createChallengeForFriend(
      creatorId, 
      { title, description, type, target, duration, points: points || 100 },
      friendIdentifier
    );
    
    res.json({
      success: true,
      message: 'Challenge created and invitation sent!',
      challenge: result.challenge
    });
  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create challenge'
    });
  }
});

// Voice Assistant API Routes
app.get('/api/workouts/recent', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const workouts = await workoutService.getRecentWorkouts(userId, 3);
    res.json({ success: true, workouts });
  } catch (error) {
    res.json({ success: false, workouts: [] });
  }
});

app.post('/api/nutrition/water', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { amount } = req.body;
    
    const dynamicNutritionService = require('./services/dynamicNutritionService');
    const result = await dynamicNutritionService.logWater(userId, amount || 250);
    
    res.json({ success: true, message: 'Water logged successfully', data: result });
  } catch (error) {
    console.error('Water logging error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to log water' });
  }
});

app.post('/api/nutrition/reset', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const dynamicNutritionService = require('./services/dynamicNutritionService');
    
    const result = await dynamicNutritionService.resetNutritionData(userId);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: 'Failed to reset nutrition data' });
  }
});

app.post('/api/nutrition/quick-log', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { foodName, quantity = 1 } = req.body;
    
    if (!foodName) {
      return res.status(400).json({
        success: false,
        error: 'Food name is required'
      });
    }
    
    const dynamicNutritionService = require('./services/dynamicNutritionService');
    const result = await dynamicNutritionService.quickLogFood(userId, foodName, quantity);
    
    res.json({
      success: true,
      message: 'Food logged successfully',
      data: result
    });
  } catch (error) {
    console.error('Quick log food error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to log food'
    });
  }
});

app.get('/api/nutrition/progress', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const dynamicNutritionService = require('./services/dynamicNutritionService');
    
    const progress = await dynamicNutritionService.getRealTimeProgress(userId);
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Get nutrition progress error:', error);
    res.status(500).json({ success: false, error: 'Failed to get nutrition progress' });
  }
});

app.get('/api/nutrition/insights', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const dynamicNutritionService = require('./services/dynamicNutritionService');
    
    const insights = await dynamicNutritionService.getNutritionInsights(userId);
    res.json({ success: true, insights });
  } catch (error) {
    console.error('Get nutrition insights error:', error);
    res.status(500).json({ success: false, error: 'Failed to get insights' });
  }
});

app.get('/api/nutrition/suggestions', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const dynamicNutritionService = require('./services/dynamicNutritionService');
    
    const suggestions = await dynamicNutritionService.getSmartSuggestions(userId);
    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Get nutrition suggestions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get suggestions' });
  }
});

app.post('/api/nutrition', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const { meals, totalCalories, totalProtein, totalCarbs, totalFat, waterIntake } = req.body;

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
    
    // Update nutrition streak
    try {
      await streakService.updateUserStreaks(updatedUser._id);
    } catch (streakError) {
      console.error('Streak update error:', streakError);
    }
    
    // Process gamification for nutrition logging
    let gamificationResults = null;
    try {
      gamificationResults = await gamificationService.processNutritionLog(updatedUser._id, nutritionData);
      console.log('Gamification results for nutrition:', gamificationResults);
    } catch (gamificationError) {
      console.error('Gamification processing error:', gamificationError);
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

app.get('/api/nutrition/debug', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const User = require('./models/User');
    const user = await User.findById(userId);
    
    res.json({ 
      success: true, 
      userId: userId,
      nutritionLogsCount: user.nutritionLogs?.length || 0,
      nutritionLogs: user.nutritionLogs || [],
      lastLog: user.nutritionLogs?.[user.nutritionLogs.length - 1] || null
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Challenge API endpoints
app.get('/api/challenges/stats', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const User = require('./models/User');
    const user = await User.findById(userId);
    
    const stats = {
      challengesCompleted: user.gamification?.challengeStats?.completed || 0,
      currentStreak: Math.max(
        user.gamification?.streaks?.workout?.current || 0,
        user.gamification?.streaks?.nutrition?.current || 0
      ),
      achievementsUnlocked: user.gamification?.achievements?.length || 0,
      totalPoints: user.gamification?.totalXP || 0
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Challenge stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/challenges', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const type = req.query.type || 'active';
    
    // For now, return empty arrays since we're starting fresh
    res.json({ success: true, challenges: [] });
  } catch (error) {
    console.error('Get challenges error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ENHANCED COMMUNITY FEATURES API ROUTES
// ============================================================================

// Virtual Group Workouts
app.post('/api/community/virtual-workouts', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const creatorId = req.session.user._id;
    const workoutData = req.body;
    
    console.log('🏋️ Creating virtual workout for user:', creatorId);
    
    const result = await enhancedCommunityService.createVirtualWorkout(creatorId, workoutData);
    
    res.json(result);
  } catch (error) {
    console.error('Create virtual workout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create virtual workout'
    });
  }
});

app.get('/api/community/virtual-workouts', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const filters = req.query;
    
    console.log('📋 Getting active virtual workouts');
    
    const result = enhancedCommunityService.getActiveWorkouts(filters);
    
    res.json(result);
  } catch (error) {
    console.error('Get virtual workouts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get virtual workouts'
    });
  }
});

app.post('/api/community/virtual-workouts/:workoutId/join', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { workoutId } = req.params;
    
    console.log('👥 User joining virtual workout:', workoutId);
    
    const result = await enhancedCommunityService.joinVirtualWorkout(userId, workoutId);
    
    res.json(result);
  } catch (error) {
    console.error('Join virtual workout error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to join virtual workout'
    });
  }
});

app.post('/api/community/virtual-workouts/:workoutId/start', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const creatorId = req.session.user._id;
    const { workoutId } = req.params;
    
    console.log('▶️ Starting virtual workout:', workoutId);
    
    const result = await enhancedCommunityService.startVirtualWorkout(workoutId, creatorId);
    
    res.json(result);
  } catch (error) {
    console.error('Start virtual workout error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start virtual workout'
    });
  }
});

// Fitness Mentorship Program
app.post('/api/community/mentorship/profile', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const mentorData = req.body;
    
    console.log('👨🏫 Creating mentor profile for user:', userId);
    
    const result = await enhancedCommunityService.createMentorProfile(userId, mentorData);
    
    res.json(result);
  } catch (error) {
    console.error('Create mentor profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create mentor profile'
    });
  }
});

app.get('/api/community/mentorship/mentors', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const filters = req.query;
    
    console.log('🔍 Finding mentors with filters:', filters);
    
    const result = await enhancedCommunityService.findMentors(filters);
    
    res.json(result);
  } catch (error) {
    console.error('Find mentors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find mentors'
    });
  }
});

app.post('/api/community/mentorship/request', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const menteeId = req.session.user._id;
    const { mentorId, message } = req.body;
    
    if (!mentorId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Mentor ID and message are required'
      });
    }
    
    console.log('📨 Requesting mentorship:', mentorId);
    
    const result = await enhancedCommunityService.requestMentorship(menteeId, mentorId, message);
    
    res.json(result);
  } catch (error) {
    console.error('Request mentorship error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to request mentorship'
    });
  }
});

// Challenge Tournaments
app.post('/api/community/tournaments', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const creatorId = req.session.user._id;
    const tournamentData = req.body;
    
    console.log('🏆 Creating tournament for user:', creatorId);
    
    const result = await enhancedCommunityService.createTournament(creatorId, tournamentData);
    
    res.json(result);
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tournament'
    });
  }
});

app.get('/api/community/tournaments', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const filters = req.query;
    
    console.log('🏅 Getting active tournaments');
    
    const result = enhancedCommunityService.getActiveTournaments(filters);
    
    res.json(result);
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tournaments'
    });
  }
});

app.post('/api/community/tournaments/:tournamentId/join', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { tournamentId } = req.params;
    
    console.log('🎯 User joining tournament:', tournamentId);
    
    const result = await enhancedCommunityService.joinTournament(userId, tournamentId);
    
    res.json(result);
  } catch (error) {
    console.error('Join tournament error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to join tournament'
    });
  }
});

// Local Fitness Events
app.post('/api/community/local-events', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const creatorId = req.session.user._id;
    const eventData = req.body;
    
    console.log('📍 Creating local event for user:', creatorId);
    
    const result = await enhancedCommunityService.createLocalEvent(creatorId, eventData);
    
    res.json(result);
  } catch (error) {
    console.error('Create local event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create local event'
    });
  }
});

app.get('/api/community/local-events', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { location, radius } = req.query;
    
    console.log('🗺️ Finding local events near:', location);
    
    const result = await enhancedCommunityService.findLocalEvents(location, radius);
    
    res.json(result);
  } catch (error) {
    console.error('Find local events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find local events'
    });
  }
});

// Fitness Dating
app.post('/api/community/fitness-dating/profile', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const profileData = req.body;
    
    console.log('💕 Creating fitness dating profile for user:', userId);
    
    const result = await enhancedCommunityService.createDatingProfile(userId, profileData);
    
    res.json(result);
  } catch (error) {
    console.error('Create dating profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create dating profile'
    });
  }
});

app.get('/api/community/fitness-dating/matches', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const filters = req.query;
    
    console.log('💘 Finding fitness matches for user:', userId);
    
    const result = await enhancedCommunityService.findFitnessMatches(userId, filters);
    
    res.json(result);
  } catch (error) {
    console.error('Find fitness matches error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to find matches'
    });
  }
});

app.get('/api/challenges/leaderboard', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const User = require('./models/User');
    
    // Get user's friends from chat/community
    const currentUser = await User.findById(req.session.user._id).populate('friends');
    const friendIds = currentUser.friends?.map(f => f._id) || [];
    
    // Include current user in the query
    const userIds = [req.session.user._id, ...friendIds];
    
    // Get users with their gamification data
    const users = await User.find({ _id: { $in: userIds } })
      .select('fullName gamification')
      .sort({ 'gamification.totalXP': -1 })
      .limit(10);
    
    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      name: user.fullName,
      points: user.gamification?.totalXP || 0
    })).filter(user => user.points > 0); // Only show users with points
    
    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Subscription API Routes
app.get('/api/payment/plans', isAuthenticated, (req, res) => {
  const plans = [
    {
      id: 'basic',
      name: 'Basic Pro',
      price: 2,
      duration: 'month',
      trialDays: 7,
      features: ['100 AI Coach Queries', 'Detailed Nutrition Tracking', 'Progress Analytics', 'Email Support']
    },
    {
      id: 'premium',
      name: 'Premium Pro',
      price: 5,
      duration: 'month',
      trialDays: 14,
      features: ['Unlimited AI Coach', 'Advanced Nutrition', 'Personal Trainer AI', 'Health Rewards', 'Priority Support']
    },
    {
      id: 'yearly',
      name: 'Yearly Premium',
      price: 10,
      duration: 'year',
      trialDays: 30,
      features: ['All Premium Features', '2 Months Free', 'Exclusive Content', 'Personal Consultation']
    }
  ];
  
  res.json({ success: true, availablePlans: plans, currentPlan: req.session.user.subscription?.plan || 'free' });
});



app.post('/api/payment/qr/generate', isAuthenticated, (req, res) => {
  const { planId } = req.body;
  const plans = {
    basic: { name: 'Basic Pro', price: 2 },
    premium: { name: 'Premium Pro', price: 5 },
    yearly: { name: 'Yearly Premium', price: 10 }
  };
  
  const plan = plans[planId];
  if (!plan) {
    return res.status(400).json({ success: false, error: 'Invalid plan' });
  }
  
  const paymentId = 'pay_' + Date.now();
  const upiUrl = `upi://pay?pa=8885800887@ptaxis&pn=Fit With AI&am=${plan.price}&cu=INR&tn=Subscription ${plan.name}`;
  
  res.json({
    success: true,
    paymentId,
    plan,
    amount: plan.price,
    qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`,
    upiUrl,
    expiresIn: 900,
    instructions: [
      'Scan the QR code with any UPI app',
      'Enter the amount ₹' + plan.price,
      'Complete the payment',
      'Click "I\'ve Paid" button below'
    ]
  });
});

app.post('/api/payment/simulate/success', isAuthenticated, (req, res) => {
  res.json({ success: true, message: 'Payment simulated successfully' });
});

// Payment status checking endpoint (for auto-detection)
app.post('/api/payment/check-status', isAuthenticated, async (req, res) => {
  try {
    const { paymentId, amount } = req.body;
    
    if (!req.session.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    // Simulate payment detection logic
    // In real implementation, this would check with payment gateway
    const paymentData = JSON.parse(req.session.paymentCheck || '{}');
    const currentTime = Date.now();
    
    // Check if payment was "received" (simulate 60% success rate after 45 seconds)
    if (!paymentData[paymentId]) {
      paymentData[paymentId] = {
        createdAt: currentTime,
        amount: amount,
        checkCount: 0
      };
    }
    
    paymentData[paymentId].checkCount++;
    const timeSinceCreation = currentTime - paymentData[paymentId].createdAt;
    
    // Detect payment after 15 seconds for faster demo
    let paymentReceived = false;
    if (timeSinceCreation > 15000) {
      paymentReceived = Math.random() < 0.9; // 90% success rate
    }
    
    // Force detection after 25 seconds
    if (timeSinceCreation > 25000) {
      paymentReceived = true;
    }
    
    console.log(`Payment check: ${paymentId}, Time: ${Math.floor(timeSinceCreation/1000)}s, Count: ${paymentData[paymentId].checkCount}, Detected: ${paymentReceived}`);
    
    // Store updated payment data
    req.session.paymentCheck = JSON.stringify(paymentData);
    
    res.json({ 
      success: true, 
      paymentReceived: paymentReceived,
      checkCount: paymentData[paymentId].checkCount,
      timeSinceCreation: Math.floor(timeSinceCreation / 1000)
    });
    
  } catch (error) {
    console.error('Payment status check error:', error);
    res.json({ success: false, paymentReceived: false });
  }
});

app.post('/api/payment/verify', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { paymentId, planId, amount, autoDetected } = req.body;
    const userEmail = req.session.user.email;
    
    // Calculate expiration date
    const expiresAt = new Date();
    if (planId === 'basic') {
      expiresAt.setDate(expiresAt.getDate() + 30); // 1 month
    } else if (planId === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month for premium
    }
    
    const planName = {
      'basic': 'Basic Pro',
      'premium': 'Premium Pro', 
      'yearly': 'Yearly Premium'
    }[planId] || 'Premium Pro';
    
    // Create subscription data
    const subscriptionData = {
      plan: planId || 'premium',
      planName: planName,
      isActive: true,
      startDate: new Date(),
      expiresAt: expiresAt,
      amount: amount,
      autoRenew: true
    };
    
    // Create payment record
    const paymentData = {
      date: new Date(),
      amount: amount,
      plan: planId,
      planName: planName,
      duration: planId === 'yearly' ? 'yearly' : 'monthly',
      paymentMethod: 'UPI',
      transactionId: paymentId,
      status: 'completed',
      autoDetected: autoDetected || false
    };
    
    // Update subscription using UserService
    await UserService.updateSubscription(userEmail, subscriptionData);
    await UserService.addPayment(userEmail, paymentData);
    
    // Update session
    req.session.user.subscription = subscriptionData;
    
    console.log('Subscription updated successfully', autoDetected ? '(auto-detected)' : '(manual)');
    
    res.json({ 
      success: true, 
      message: autoDetected ? 'Payment auto-detected and subscription activated' : 'Subscription activated successfully',
      subscription: subscriptionData,
      payment: paymentData
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
});

app.get('/api/payment/status/:paymentId', isAuthenticated, (req, res) => {
  res.json({ success: true, status: 'pending' });
});

// Premium feature check middleware
function requiresPremium(req, res, next) {
  const user = req.session.user;
  if (!user.subscription || user.subscription.plan === 'free' || 
      (user.subscription.expiresAt && new Date(user.subscription.expiresAt) < new Date())) {
    return res.status(403).json({ success: false, error: 'Premium subscription required' });
  }
  next();
}

// Lock premium features
app.get('/api/ai-coach/premium', isAuthenticated, requiresPremium, (req, res) => {
  res.json({ success: true, message: 'Premium AI coach feature' });
});

app.get('/api/analytics/advanced', isAuthenticated, requiresPremium, (req, res) => {
  res.json({ success: true, message: 'Advanced analytics feature' });
});

// Lock AI Coach queries for free users
app.post('/api/ai-coach/query', isAuthenticated, ensureDbConnection, async (req, res) => {
  const user = req.session.user;
  const isPremium = user.subscription && user.subscription.plan !== 'free' && 
                   user.subscription.isActive && new Date(user.subscription.expiresAt) > new Date();
  
  if (!isPremium) {
    // Free users get 10 queries per month
    const currentMonth = new Date().getMonth();
    const queryCount = user.aiQueries?.[currentMonth] || 0;
    
    if (queryCount >= 10) {
      return res.status(403).json({ 
        success: false, 
        error: 'Monthly AI query limit reached. Upgrade to premium for unlimited queries.',
        requiresPremium: true
      });
    }
  }
  
  res.json({ success: true, message: 'AI query processed' });
});

// Lock advanced nutrition features
app.get('/api/nutrition/advanced', isAuthenticated, requiresPremium, (req, res) => {
  res.json({ success: true, message: 'Advanced nutrition tracking' });
});

// Lock personal trainer AI
app.get('/api/personal-trainer', isAuthenticated, requiresPremium, (req, res) => {
  res.json({ success: true, message: 'Personal trainer AI feature' });
});

// Lock health rewards
app.get('/api/health-rewards', isAuthenticated, requiresPremium, (req, res) => {
  res.json({ success: true, message: 'Health rewards feature' });
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

// Initialize chat service
chatService.init(io);

// Start Server (only in non-serverless environment)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3009;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
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



// Generate PDF bill endpoint with database lookup
app.post('/api/generate-bill', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { paymentId } = req.body;
    const userEmail = req.session.user.email;
    const user = await UserService.getUserByEmail(userEmail);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Find payment record
    const payment = user.paymentHistory?.find(p => p.transactionId === paymentId) || 
                   user.paymentHistory?.[user.paymentHistory.length - 1]; // Latest payment
    
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }
    
    const billContent = `
===========================================
           FIT-WITH-AI PAYMENT RECEIPT
===========================================

CUSTOMER DETAILS:
-------------------------------------------
Name: ${user.fullName}
Email: ${user.email}
User ID: ${user._id}

TRANSACTION DETAILS:
-------------------------------------------
Transaction ID: ${payment.transactionId}
Plan: ${payment.planName}
Amount: Rs.${payment.amount}
Date: ${new Date(payment.date).toLocaleDateString('en-IN')}
Time: ${new Date(payment.date).toLocaleTimeString('en-IN')}
Payment Method: ${payment.paymentMethod}
Status: ${payment.status.toUpperCase()}

BILLING INFORMATION:
-------------------------------------------
Merchant: Fit-With-AI
UPI ID: 8885800887@ptaxis
GST: Not Applicable

SUBSCRIPTION DETAILS:
-------------------------------------------
Plan: ${payment.planName}
Billing Cycle: ${payment.duration === 'yearly' ? 'Yearly' : 'Monthly'}
Start Date: ${new Date(user.subscription?.startDate || payment.date).toLocaleDateString('en-IN')}
Expiry Date: ${new Date(user.subscription?.expiresAt).toLocaleDateString('en-IN')}
Auto Renewal: ${user.subscription?.autoRenew ? 'Enabled' : 'Disabled'}

===========================================
Thank you for choosing Fit-With-AI!
For support: support@fitwith.ai
Website: https://fitwith.ai
===========================================
`;
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="FitWithAI_Receipt_${payment.transactionId}.txt"`);
    res.send(billContent);
    
  } catch (error) {
    console.error('Generate bill error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate bill' });
  }
});

// Send email receipt endpoint
app.post('/api/send-receipt', isAuthenticated, ensureDbConnection, async (req, res) => {
  const { confirmation, plan, amount } = req.body;
  
  try {
    const userEmail = req.session.user.email;
    const userName = req.session.user.fullName || 'User';
    
    console.log('Email would be sent to:', userEmail);
    console.log('Receipt for:', plan, 'Amount:', amount, 'Confirmation:', confirmation);
    
    res.json({ success: true, message: 'Receipt sent to email' });
    
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ success: false, error: 'Failed to send email receipt' });
  }
});

// Virtual Doctor API Routes

// Test endpoint for virtual doctor
app.get('/fitness/api/virtual-doctor-test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Virtual doctor API is working',
    databaseLoaded: Object.keys(medicalDatabase).length > 0,
    conditionsCount: Object.keys(medicalDatabase).length
  });
});

// Alternative test endpoint without fitness prefix
app.get('/api/virtual-doctor-test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Virtual doctor API is working',
    databaseLoaded: Object.keys(medicalDatabase).length > 0,
    conditionsCount: Object.keys(medicalDatabase).length
  });
});

// Virtual doctor symptom analysis endpoint
app.post('/fitness/api/virtual-doctor-analyze', async (req, res) => {
  try {
    console.log('Virtual doctor analyze called with body:', req.body);
    console.log('Medical database loaded conditions:', Object.keys(medicalDatabase).length);
    
    const { symptoms } = req.body;
    
    if (!symptoms || typeof symptoms !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Please provide symptoms as a string'
      });
    }
    
    if (symptoms.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Please provide more detailed symptom description'
      });
    }
    
    // Check if database is loaded
    if (Object.keys(medicalDatabase).length === 0) {
      console.error('Medical database is empty or failed to load');
      return res.status(500).json({
        success: false,
        error: 'Medical database is not available. Please try again later.'
      });
    }
    
    // Find matching conditions with advanced scoring
    const matches = findMatchingConditions(symptoms);
    console.log('Found matches:', matches.length);
    
    // Generate comprehensive AI analysis
    const aiAnalysis = generateAIAnalysis(symptoms, matches);
    
    res.json({
      success: true,
      matches,
      aiAnalysis,
      query: symptoms,
      totalConditions: Object.keys(medicalDatabase).length,
      analysisTimestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Virtual doctor analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during analysis. Please try again.'
    });
  }
});

// Alternative endpoint without fitness prefix
app.post('/api/virtual-doctor-analyze', async (req, res) => {
  try {
    console.log('Virtual doctor analyze called with body:', req.body);
    console.log('Medical database loaded conditions:', Object.keys(medicalDatabase).length);
    
    const { symptoms } = req.body;
    
    if (!symptoms || typeof symptoms !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Please provide symptoms as a string'
      });
    }
    
    if (symptoms.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Please provide more detailed symptom description'
      });
    }
    
    // Check if database is loaded
    if (Object.keys(medicalDatabase).length === 0) {
      console.error('Medical database is empty or failed to load');
      return res.status(500).json({
        success: false,
        error: 'Medical database is not available. Please try again later.'
      });
    }
    
    // Find matching conditions with advanced scoring
    const matches = findMatchingConditions(symptoms);
    console.log('Found matches:', matches.length);
    
    // Generate comprehensive AI analysis
    const aiAnalysis = generateAIAnalysis(symptoms, matches);
    
    res.json({
      success: true,
      matches,
      aiAnalysis,
      query: symptoms,
      totalConditions: Object.keys(medicalDatabase).length,
      analysisTimestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Virtual doctor analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during analysis. Please try again.'
    });
  }
});

// Helper functions for virtual doctor analysis
function findMatchingConditions(symptoms) {
  const matches = [];
  const symptomWords = symptoms.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  for (const [conditionKey, condition] of Object.entries(medicalDatabase)) {
    let matchScore = 0;
    let matchedSymptoms = new Set();
    
    // Direct symptom matching (highest weight)
    for (const symptom of condition.symptoms) {
      const symptomLower = symptom.toLowerCase();
      for (const word of symptomWords) {
        if (symptomLower.includes(word) || word.includes(symptomLower.substring(0, Math.min(4, symptomLower.length)))) {
          matchScore += 3;
          matchedSymptoms.add(symptom);
          break;
        }
      }
    }
    
    // Condition name matching (medium weight)
    const conditionName = condition.name.toLowerCase();
    for (const word of symptomWords) {
      if (conditionName.includes(word) || word.includes(conditionName.substring(0, Math.min(4, conditionName.length)))) {
        matchScore += 2;
      }
    }
    
    // Description matching (lower weight)
    const description = condition.description.toLowerCase();
    for (const word of symptomWords) {
      if (description.includes(word)) {
        matchScore += 1;
      }
    }
    
    if (matchScore > 0) {
      const confidence = Math.min(matchScore / 10, 1); // Normalize to 0-1
      matches.push({
        condition,
        confidence,
        matchScore,
        matchedSymptoms: Array.from(matchedSymptoms)
      });
    }
  }
  
  // Sort by confidence and return top matches
  return matches
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);
}

function generateAIAnalysis(symptoms, matches) {
  if (matches.length === 0) {
    return `I couldn't find specific matching conditions for "${symptoms}" in my medical database. This could indicate a rare condition or the symptoms might need to be described differently. I recommend consulting a healthcare professional for proper evaluation.`;
  }
  
  const topMatch = matches[0];
  const confidence = Math.round(topMatch.confidence * 100);
  
  let analysis = `<strong>AI Analysis for "${symptoms}":</strong><br><br>`;
  
  // Primary assessment
  analysis += `The most likely condition based on symptom analysis is <strong>${topMatch.condition.name}</strong> with ${confidence}% confidence. `;
  
  if (topMatch.matchedSymptoms.length > 0) {
    analysis += `Matching symptoms include: ${topMatch.matchedSymptoms.join(', ')}.<br><br>`;
  }
  
  // Additional possibilities
  if (matches.length > 1) {
    const otherConditions = matches.slice(1, 4).map(m => {
      const conf = Math.round(m.confidence * 100);
      return `${m.condition.name} (${conf}%)`;
    });
    analysis += `<strong>Other possibilities:</strong> ${otherConditions.join(', ')}.<br><br>`;
  }
  
  // General recommendations
  analysis += `<strong>Recommendations:</strong><br>`;
  analysis += `• Review the detailed condition information below<br>`;
  analysis += `• Consider the recommended foods and home remedies<br>`;
  analysis += `• Monitor symptom progression<br>`;
  analysis += `• Consult a healthcare professional for proper diagnosis<br><br>`;
  
  return analysis;
}

// AI consultation endpoint
app.post('/api/virtual-doctor/consult', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { message } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Get user profile for personalized advice
    const user = await UserService.getUserByEmail(req.session.user.email);
    const userProfile = {
      personalInfo: user.personalInfo,
      fitnessGoals: user.fitnessGoals,
      healthInfo: user.healthInfo
    };

    const result = await virtualDoctorService.processConsultation(userId, message.trim(), userProfile);
    
    res.json({
      success: result.success,
      response: result.response,
      urgency: result.urgency,
      error: result.error
    });
    
  } catch (error) {
    console.error('Virtual doctor consultation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process consultation',
      response: 'I apologize, but I\'m having trouble processing your request right now. Please try again later or consult with a healthcare professional.'
    });
  }
});

// Symptom analysis endpoint
app.post('/api/virtual-doctor/analyze-symptoms', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { symptoms, additionalInfo } = req.body;
    
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one symptom is required'
      });
    }

    const result = await virtualDoctorService.analyzeSymptoms(userId, symptoms, additionalInfo || {});
    
    res.json({
      success: result.success,
      analysis: result.analysis,
      response: result.response,
      error: result.error
    });
    
  } catch (error) {
    console.error('Symptom analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze symptoms'
    });
  }
});

// Health assessment endpoint
app.post('/api/virtual-doctor/health-assessment', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const assessmentData = req.body;
    
    // Validate required fields
    const requiredFields = ['age', 'gender', 'exercise', 'sleep', 'smoking', 'alcohol', 'stress'];
    const missingFields = requiredFields.filter(field => !assessmentData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const result = await virtualDoctorService.generateHealthAssessment(userId, assessmentData);
    
    // Store assessment in user profile
    try {
      const user = await UserService.getUserByEmail(req.session.user.email);
      if (!user.healthAssessments) user.healthAssessments = [];
      
      user.healthAssessments.push({
        date: new Date(),
        data: assessmentData,
        results: result.assessment,
        score: result.assessment?.overallScore || 0
      });
      
      // Keep only last 10 assessments
      if (user.healthAssessments.length > 10) {
        user.healthAssessments = user.healthAssessments.slice(-10);
      }
      
      await user.save();
    } catch (saveError) {
      console.error('Error saving health assessment:', saveError);
      // Don't fail the request if saving fails
    }
    
    res.json({
      success: result.success,
      assessment: result.assessment,
      summary: result.summary,
      error: result.error
    });
    
  } catch (error) {
    console.error('Health assessment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate health assessment'
    });
  }
});

// Get consultation history
app.get('/api/virtual-doctor/history', isAuthenticated, (req, res) => {
  try {
    const userId = req.session.user._id;
    const history = virtualDoctorService.getConsultationHistory(userId);
    
    res.json({
      success: true,
      history: history.slice(-20) // Return last 20 messages
    });
    
  } catch (error) {
    console.error('Get consultation history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get consultation history'
    });
  }
});

// Clear consultation history
app.delete('/api/virtual-doctor/history', isAuthenticated, (req, res) => {
  try {
    const userId = req.session.user._id;
    virtualDoctorService.clearConsultationHistory(userId);
    
    res.json({
      success: true,
      message: 'Consultation history cleared'
    });
    
  } catch (error) {
    console.error('Clear consultation history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear consultation history'
    });
  }
});

// Get user's health assessment history
app.get('/api/virtual-doctor/assessments', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const user = await UserService.getUserByEmail(req.session.user.email);
    const assessments = user.healthAssessments || [];
    
    res.json({
      success: true,
      assessments: assessments.sort((a, b) => new Date(b.date) - new Date(a.date))
    });
    
  } catch (error) {
    console.error('Get health assessments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get health assessments'
    });
  }
});

// Session Management API Routes

// Get user's active sessions
app.get('/api/sessions', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const sessions = await sessionManager.getUserSessions(userId);
    
    // Format sessions for frontend
    const formattedSessions = sessions.map(session => ({
      sessionId: session.sessionId,
      deviceInfo: {
        type: session.deviceInfo?.deviceType || 'unknown',
        browser: session.deviceInfo?.browser || 'unknown',
        os: session.deviceInfo?.os || 'unknown',
        location: session.deviceInfo?.location || 'unknown'
      },
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
      isCurrent: session.sessionId === req.sessionID
    }));
    
    res.json({
      success: true,
      sessions: formattedSessions,
      currentSessionId: req.sessionID
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sessions'
    });
  }
});


app.post('/api/sessions/revoke', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }
    
    if (sessionId === req.sessionID) {
      return res.status(400).json({
        success: false,
        error: 'Cannot revoke current session'
      });
    }
    
    const revoked = await sessionManager.revokeSession(sessionId, userId);
    
    if (revoked) {
      res.json({
        success: true,
        message: 'Session revoked successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Session not found or already inactive'
      });
    }
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke session'
    });
  }
});

// Revoke all other sessions (keep current)
app.post('/api/sessions/revoke-all', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const currentSessionId = req.sessionID;
    
    const revokedCount = await sessionManager.revokeAllSessions(userId, currentSessionId);
    
    res.json({
      success: true,
      message: `${revokedCount} session(s) revoked successfully`,
      revokedCount
    });
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke sessions'
    });
  }
});

// Force logout from all devices including current
app.post('/api/sessions/logout-all', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    
    const revokedCount = await sessionManager.revokeAllSessions(userId);
    
    // Clear current session
    req.session.user = null;
    res.clearCookie('fit-with-ai-session');
    
    res.json({
      success: true,
      message: `Logged out from all devices. ${revokedCount} session(s) terminated.`,
      revokedCount,
      redirectUrl: '/'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout from all devices'
    });
  }
});

// Check session conflict status
app.get('/api/sessions/conflict-status', isAuthenticated, (req, res) => {
  res.json({
    success: true,
    hasConflict: !!req.sessionConflict,
    conflict: req.sessionConflict || null
  });
});

// Resolve session conflict (force login)
app.post('/api/sessions/resolve-conflict', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const currentSessionId = req.sessionID;
    const { action } = req.body; // 'force_login' or 'cancel'
    
    if (action === 'force_login') {
      // Revoke all other sessions and keep current
      const revokedCount = await sessionManager.revokeAllSessions(userId, currentSessionId);
      
      // Update current session with device info
      await sessionManager.createSession(currentSessionId, req.session.user, req);
      
      res.json({
        success: true,
        message: 'Session conflict resolved. Other sessions terminated.',
        revokedCount
      });
    } else {
      // User chose to cancel, logout current session
      req.session.user = null;
      res.clearCookie('fit-with-ai-session');
      
      res.json({
        success: true,
        message: 'Current session terminated',
        redirectUrl: '/'
      });
    }
  } catch (error) {
    console.error('Resolve conflict error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve session conflict'
    });
  }
});
module.exports = app;