require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
 const { sendWelcomeEmail } = require('./services/emailService');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// In-memory storage for demo (use database in production)
const tempUserStore = new Map();

// Helper function to generate temporary token
function generateTempToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to extract user from token
function getUserFromToken(token) {
  return tempUserStore.get(token);
}

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

// Debug route
app.get('/debug-session', (req, res) => {
  const token = req.query.token;
  const user = token ? getUserFromToken(token) : null;
  
  res.json({
    token: token,
    user: user,
    allUsers: Array.from(tempUserStore.entries())
  });
});

// Signup Route - Modified for Vercel
app.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!email || !fullName || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    // Generate temporary token and store user data
    const token = generateTempToken();
    const userData = {
      email: email.trim(),
      fullName: fullName.trim(),
      onboardingCompleted: false,
      createdAt: new Date(),
      token: token
    };

    tempUserStore.set(token, userData);
    
    console.log('User created with token:', token, userData);

    res.json({
      success: true,
      redirectUrl: `/CustomOnboarding?token=${token}&email=${encodeURIComponent(email.trim())}`
    });

    // Send welcome email (if service exists)
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

// Login Route - Modified for Vercel
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  // Generate temporary token (in real app, verify credentials first)
  const token = generateTempToken();
  const userData = {
    email: email.trim(),
    fullName: 'User Name', // In real app, get from DB
    onboardingCompleted: false, // Set based on DB data
    createdAt: new Date(),
    token: token
  };

  tempUserStore.set(token, userData);
  
  res.json({ 
    success: true,
    redirectUrl: `/CustomOnboarding?token=${token}&email=${encodeURIComponent(email.trim())}`
  });
});

// Custom Onboarding Route - Modified for Vercel
app.get('/CustomOnboarding', (req, res) => {
  const token = req.query.token;
  const email = req.query.email;
  
  console.log('Onboarding access - Token:', token, 'Email:', email);
  
  if (!token && !email) {
    console.log('No token or email, redirecting to home');
    return res.redirect('/');
  }

  let user = null;
  if (token) {
    user = getUserFromToken(token);
  }
  
  // If no user found with token but email provided, create temporary entry
  if (!user && email) {
    const tempToken = generateTempToken();
    user = {
      email: email,
      fullName: '',
      onboardingCompleted: false,
      createdAt: new Date(),
      token: tempToken
    };
    tempUserStore.set(tempToken, user);
  }

  if (!user) {
    return res.redirect('/');
  }
  
  res.render('customonboarding', {
    user: {
      email: user.email,
      fullName: user.fullName || '',
      token: user.token
    }
  });
});

// Complete Onboarding Route - Modified for Vercel
app.post('/CustomOnboarding/complete', async (req, res) => {
  try {
    const { onboardingData, token } = req.body;
    
    console.log('Onboarding completion - Token:', token);
    console.log('Onboarding data:', onboardingData);

    if (!onboardingData) {
      return res.status(400).json({
        success: false,
        error: 'Onboarding data is required'
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'User token is required'
      });
    }

    const user = getUserFromToken(token);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Update user data
    const updatedUser = {
      ...user,
      onboardingCompleted: true,
      onboardingData: onboardingData,
      fullName: `${onboardingData.personalInfo?.firstName || ''} ${onboardingData.personalInfo?.lastName || ''}`.trim() || user.fullName,
      completedAt: new Date()
    };

    tempUserStore.set(token, updatedUser);
    
    console.log('User updated:', updatedUser);

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      redirectUrl: `/dashboard?token=${token}`
    });

  } catch (error) {
    console.error('Onboarding completion error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to complete onboarding' 
    });
  }
});

// Authentication middleware for protected routes
const tokenAuth = (req, res, next) => {
  const token = req.query.token;
  
  if (!token) {
    return res.redirect('/');
  }
  
  const user = getUserFromToken(token);
  if (!user) {
    return res.redirect('/');
  }
  
  req.user = user;
  next();
};

// Onboarding check middleware
const checkOnboarding = (req, res, next) => {
  if (!req.user.onboardingCompleted) {
    return res.redirect(`/CustomOnboarding?token=${req.user.token}&email=${encodeURIComponent(req.user.email)}`);
  }
  next();
};

// Protected Routes - Modified for token-based auth
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
  app.get(route, tokenAuth, checkOnboarding, (req, res) => {
    const viewName = route.substring(1); // Remove leading slash
    console.log(`Accessing ${route} for user:`, req.user.email);
    
    res.render(viewName, { 
      user: req.user,
      currentPath: route,
      token: req.user.token
    });
  });
});

// Logout Route
app.get('/logout', (req, res) => {
  const token = req.query.token;
  if (token) {
    tempUserStore.delete(token);
  }
  res.redirect('/');
});

// Cleanup old tokens (run periodically in production)
setInterval(() => {
  const now = new Date();
  const oneHour = 60 * 60 * 1000;
  
  for (const [token, user] of tempUserStore.entries()) {
    if (now - user.createdAt > oneHour) {
      tempUserStore.delete(token);
    }
  }
}, 10 * 60 * 1000); // Run every 10 minutes

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
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;