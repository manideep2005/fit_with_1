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
  if (!req.session.user.onboardingCompleted) {
    return res.redirect(`/CustomOnboarding?sessionId=undefined&email=${encodeURIComponent(req.session.user.email)}`);
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

// Complete Onboarding
app.post('/complete-onboarding', isAuthenticated, (req, res) => {
  req.session.user.onboardingCompleted = true;
  res.json({ 
    success: true,
    redirectUrl: '/dashboard'
  });
});

// All Protected Routes
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

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404');
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { message: 'Server Error' });
});
// Error Handling Middleware (put this at the end of your middleware chain)
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Set default error message
  err.message = err.message || 'Something went wrong!';
  
  // Determine status code
  const statusCode = err.status || 500;
  
  // Send response
  res.status(statusCode).render('error', {
    message: err.message,
    status: statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 Handler (put this after all your routes)
app.use((req, res) => {
  res.status(404).render('404', {
    path: req.path
  });
});
// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});