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

// Set EJS as the view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use express-session middleware
app.use(session({
  secret: 'some very secret string', // Change this to a strong secret in production!
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 30 } // 30 minutes session expiry
}));

// Middleware: Authentication
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).json({ success: false, error: 'Not authenticated' });
  }
};

// Middleware: Onboarding Check
const hasCompletedOnboarding = (req, res, next) => {
  if (req.session.user.onboardingCompleted) {
    next();
  } else {
    res.redirect('/CustomOnboarding');
  }
};

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

// Onboarding page
app.get('/CustomOnboarding', isAuthenticated, (req, res) => {
  res.render('customonboarding', { user: req.session.user });
});

// Mark onboarding complete
app.post('/dashboard/complete', isAuthenticated, (req, res) => {
  req.session.user.onboardingCompleted = true;
  res.json({
    success: true,
    message: 'Onboarding completed successfully'
  });
});

// Protected dashboard
app.get('/dashboard', isAuthenticated, hasCompletedOnboarding, (req, res) => {
  res.render('dashboard', { 
    user: req.session.user,
    fullName: req.session.user.fullName 
  });
});

app.get('/workout', isAuthenticated, hasCompletedOnboarding, (req, res) => {
  res.render('workout', { 
    user: req.session.user,
    fullName: req.session.user.fullName 
  });
});


// Signup route
app.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Validate inputs
    if (!email || !fullName || !password) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required (Full name, Email, Password)'
      });
    }

    // Save user info in session
    req.session.user = {
      fullName,
      email,
      onboardingCompleted: false
    };
// Logout route
app.get('/workout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/');
    });
});
    // Send welcome email
    await sendWelcomeEmail(email, fullName);

    res.json({
      success: true,
      message: 'Signup successful! Welcome email sent.'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error during signup. Please try again.'
    });
  }
});
// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/');
    });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
