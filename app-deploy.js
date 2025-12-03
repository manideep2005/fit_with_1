console.log('🚀 Starting Fit-With-AI deployment version...');
console.log('Node.js version:', process.version);
console.log('Environment:', process.env.NODE_ENV);
console.log('Vercel deployment:', !!process.env.VERCEL);

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://fit-with-1.vercel.app'],
  credentials: true
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Basic session handling for serverless
app.use((req, res, next) => {
  req.session = {
    user: null,
    save: (callback) => { if (callback) callback(); },
    regenerate: (callback) => { if (callback) callback(); }
  };
  next();
});

// Database connection (conditional)
let database = null;
let UserService = null;
let dbConnected = false;

// Minimal UserService for serverless
const createMinimalUserService = () => {
  const bcrypt = require('bcrypt');
  return {
    createUser: async (data) => {
      console.log('Mock user creation:', data.email);
      return { _id: 'mock-id', ...data, onboardingCompleted: false };
    },
    authenticateUser: async (email, password) => {
      console.log('Mock authentication:', email);
      if (email && password) {
        return { _id: 'mock-id', email, fullName: 'User', onboardingCompleted: true };
      }
      throw new Error('Invalid credentials');
    }
  };
};

try {
  if (process.env.MONGODB_URI) {
    database = require('./config/database');
    // Initialize database connection
    database.connect().then(() => {
      dbConnected = true;
      console.log('✅ Database connected');
    }).catch(error => {
      console.log('❌ Database connection failed:', error.message);
      dbConnected = false;
    });
    
    // Try UserService, fallback to minimal
    try {
      UserService = require('./services/userService');
    } catch (e) {
      console.log('Using minimal UserService');
      UserService = createMinimalUserService();
    }
  } else {
    console.log('⚠️ No database configuration, using mock services');
    UserService = createMinimalUserService();
  }
} catch (error) {
  console.log('⚠️ Using fallback services:', error.message);
  UserService = createMinimalUserService();
}

// Basic routes
app.get('/', (req, res) => {
  try {
    res.render('index');
  } catch (error) {
    res.send(`
      <html>
        <head><title>Fit With AI</title></head>
        <body>
          <h1>Welcome to Fit With AI</h1>
          <p>Your fitness journey starts here!</p>
          <p>Status: ${error.message}</p>
        </body>
      </html>
    `);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    vercel: !!process.env.VERCEL,
    database: !!database,
    nodeVersion: process.version
  });
});

// Basic API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'Fit With AI API is running',
    timestamp: new Date().toISOString(),
    services: {
      database: !!database,
      userService: !!UserService
    }
  });
});

// Signup endpoint (simplified)
app.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!email || !fullName || !password) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    if (UserService && database) {
      // Try to create user
      const user = await UserService.createUser({
        email: email.trim(),
        fullName: fullName.trim(),
        password: password
      });

      res.json({
        success: true,
        message: 'Account created successfully',
        redirectUrl: '/dashboard'
      });
    } else {
      // Fallback response
      res.json({
        success: true,
        message: 'Account creation initiated',
        redirectUrl: '/dashboard'
      });
    }

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Account creation failed'
    });
  }
});

// Login endpoint (simplified)
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (UserService) {
      try {
        // Try to authenticate
        const user = await UserService.authenticateUser(email.trim(), password);
        
        res.json({
          success: true,
          message: 'Login successful',
          redirectUrl: user.onboardingCompleted ? '/dashboard' : '/CustomOnboarding'
        });
      } catch (authError) {
        console.error('Authentication failed:', authError.message);
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }
    } else {
      // Fallback response when no UserService
      res.json({
        success: true,
        message: 'Login successful (demo mode)',
        redirectUrl: '/dashboard'
      });
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login service temporarily unavailable'
    });
  }
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  try {
    res.render('dashboard', {
      user: { fullName: 'User', email: 'user@example.com' },
      navId: Date.now().toString()
    });
  } catch (error) {
    res.send(`
      <html>
        <head><title>Dashboard - Fit With AI</title></head>
        <body>
          <h1>Dashboard</h1>
          <p>Welcome to your fitness dashboard!</p>
          <p>Status: ${error.message}</p>
        </body>
      </html>
    `);
  }
});

// Catch-all route for other pages
app.get('*', (req, res) => {
  const page = req.path.substring(1) || 'index';
  try {
    res.render(page, {
      user: { fullName: 'User', email: 'user@example.com' },
      navId: Date.now().toString()
    });
  } catch (error) {
    res.status(404).send(`
      <html>
        <head><title>Page Not Found - Fit With AI</title></head>
        <body>
          <h1>Page Not Found</h1>
          <p>The page "${page}" could not be found.</p>
          <a href="/">Go Home</a>
        </body>
      </html>
    `);
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Application error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Database connection handled above

console.log('✅ Fit-With-AI deployment version ready');

module.exports = app;