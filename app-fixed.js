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

// Only initialize Socket.IO in non-serverless environment
if (!process.env.VERCEL) {
  const http = require('http');
  server = http.createServer(app);
  const { Server } = require("socket.io");
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  // Initialize live workout service
  const LiveWorkoutService = require('./services/liveWorkoutService');
  const liveWorkoutService = new LiveWorkoutService(io);

  // Single consolidated Socket.IO connection handler
  io.on('connection', (socket) => {
    console.log('User connected to socket:', socket.id);
    
    // Initialize live workout for this socket
    liveWorkoutService.init(socket);

    // Regular chat functionality
    socket.on('join', (data) => {
      if (data && data.userId) {
        socket.userId = data.userId;
        socket.join(data.userId);
        console.log(`User ${data.userId} joined their room`);
      }
    });

    // Regular chat messages
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
        
        const chatService = require('./services/chatService');
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

    // Live workout specific events
    socket.on('join-workout', (data) => {
      socket.join(data.workoutId);
      socket.workoutId = data.workoutId;
      socket.userId = data.userId;
      socket.userName = data.userName;
      
      socket.to(data.workoutId).emit('user-joined', {
        userId: data.userId,
        userName: data.userName
      });
      
      console.log(`${data.userName} joined workout ${data.workoutId}`);
    });
    
    socket.on('leave-workout', (data) => {
      socket.to(data.workoutId).emit('user-left', {
        userId: data.userId,
        userName: data.userName
      });
      
      socket.leave(data.workoutId);
      console.log(`${data.userName} left workout ${data.workoutId}`);
    });

    // Live workout chat
    socket.on('workout-chat-message', (data) => {
      socket.to(data.workoutId).emit('workout-chat-message', data);
    });

    // WebRTC signaling
    socket.on('offer', (data) => {
      socket.to(data.workoutId).emit('offer', data);
    });

    socket.on('answer', (data) => {
      socket.to(data.workoutId).emit('answer', data);
    });

    socket.on('ice-candidate', (data) => {
      socket.to(data.workoutId).emit('ice-candidate', data);
    });

    // Workout controls sync
    socket.on('workout-control', (data) => {
      socket.to(data.workoutId).emit('workout-control', data);
    });

    // Workout state sync
    socket.on('workout-started', (data) => {
      socket.to(data.workoutId || 'current-session').emit('workout-started', data);
    });

    socket.on('workout-paused', (data) => {
      socket.to(data.workoutId || 'current-session').emit('workout-paused', data);
    });

    socket.on('workout-stopped', (data) => {
      socket.to(data.workoutId || 'current-session').emit('workout-stopped', data);
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected from socket:', socket.id);
      
      // Handle live workout disconnect
      if (liveWorkoutService) {
        liveWorkoutService.handleDisconnect(socket);
      }
      
      // Handle regular workout disconnect
      if (socket.workoutId && socket.userId && socket.userName) {
        socket.to(socket.workoutId).emit('user-left', {
          userId: socket.userId,
          userName: socket.userName
        });
        console.log(`${socket.userName} disconnected from workout`);
      }
    });
  });
} else {
  server = app;
  io = null;
  console.log('Running in serverless mode - Socket.IO disabled');
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
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        fitnessId: user.fitnessId, // Get ID from the main user profile
        onboardingCompleted: user.onboardingCompleted,
        personalInfo: user.personalInfo
      };
      console.log('✅ Loaded user from database session:', req.session.user.email);
    }
  } catch (error) {
    console.log('❌ Failed to load database session:', error.message);
  }
  
  next();
});

console.log('✅ Database-only session system configured');

// Authentication Middleware - Works for Local and Vercel
const isAuthenticated = async (req, res, next) => {
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
      return res.redirect(`/CustomOnboarding?sessionId=undefined&email=${encodeURIComponent(email)}`);
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
    return res.redirect(`/CustomOnboarding?sessionId=undefined&email=${encodeURIComponent(email)}`);
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

// Live workout routes
app.get('/live-workout', isAuthenticated, checkOnboarding, (req, res) => {
  res.render('live-workout', { 
    user: req.session.user,
    currentPath: '/live-workout'
  });
});

app.post('/api/live-workout/invite', isAuthenticated, ensureDbConnection, async (req, res) => {
  try {
    const { friendId, friendEmail, sessionId, inviteUrl, friendName } = req.body;
    const inviterName = req.session.user.fullName;
    
    const { sendLiveWorkoutInviteWithId } = require('./services/emailService');
    await sendLiveWorkoutInviteWithId(friendEmail, {
      inviterName: inviterName,
      friendName: friendName || 'Friend',
      sessionId: sessionId,
      sessionTitle: 'Live Workout Session',
      joinUrl: inviteUrl,
      participantCount: 1
    });
    
    res.json({ success: true, message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Live workout invitation error:', error);
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/user/check-auth', (req, res) => {
  res.json({
    authenticated: !!(req.session && req.session.user),
    user: req.session?.user || null
  });
});

// Import other services
const aiService = require('./services/aiService');
const gamificationService = require('./services/gamificationService');
const nutriScanService = require('./services/nutriScanService');
const healthService = require('./services/healthService');
const chatService = require('./services/chatService');
const scheduleService = require('./services/scheduleService');
const communityService = require('./services/communityService');
const dynamicNutritionService = require('./services/dynamicNutritionService');

// Initialize chat service with io
if (io) {
  chatService.init(io);
}

// Challenge Service - conditional loading
let challengeService;
try {
  challengeService = require('./services/challengeService');
} catch (error) {
  console.warn('Challenge service not loaded:', error.message);
}

// Import API routes
const settingsRoutes = require('./routes/settings');
const mealPlannerRoutes = require('./routes/mealPlanner');

// Use API routes
app.use('/api/settings', settingsRoutes);
app.use('/api/meal-planner', mealPlannerRoutes);

// Add other essential routes here (signup, login, etc.)
// ... (I'll add the rest of the routes in the next part)

// Health check endpoint for Vercel
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    nodeVersion: process.version,
    workingDirectory: process.cwd(),
    socketIO: !!io
  });
});

// Start server
const PORT = process.env.PORT || 3000;

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔌 Socket.IO: ${io ? 'Enabled' : 'Disabled'}`);
  });
} else {
  console.log('🚀 Vercel serverless mode - no explicit server start needed');
}

module.exports = app;