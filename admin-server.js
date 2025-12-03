require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session
app.use(session({
  secret: 'admin-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Models
const Admin = require('./models/Admin');
const User = require('./models/User');
const ContactMessage = require('./models/ContactMessage');

// Admin auth middleware
const adminAuth = async (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect('/login');
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session.admin) {
    return res.redirect('/dashboard');
  }
  
  const error = req.query.error;
  let errorMessage = '';
  if (error === 'invalid') errorMessage = 'Invalid credentials';
  if (error === 'server') errorMessage = 'Server error';
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin Login</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 50px; }
        .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { text-align: center; color: #333; margin-bottom: 30px; }
        input { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        button:hover { background: #0056b3; }
        .error { color: red; text-align: center; margin: 10px 0; }
        .info { color: #666; font-size: 14px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔐 Admin Login</h1>
        ${errorMessage ? `<div class="error">${errorMessage}</div>` : ''}
        <form method="POST" action="/login">
          <input type="text" name="username" placeholder="Username" required>
          <input type="password" name="password" placeholder="Password" required>
          <button type="submit">Login</button>
        </form>
        <div class="info">
          <strong>Default Credentials:</strong><br>
          Username: admin<br>
          Password: admin123
        </div>
      </div>
    </body>
    </html>
  `);
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', username, password);
    
    if (username === 'admin' && password === 'admin123') {
      req.session.admin = {
        id: 'admin-id',
        username: 'admin',
        email: 'admin@localhost.com',
        role: 'super_admin'
      };
      return res.redirect('/dashboard');
    }
    
    res.redirect('/login?error=invalid');
  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/login?error=server');
  }
});

// Direct login bypass
app.get('/direct-login', (req, res) => {
  req.session.admin = {
    id: 'admin-id',
    username: 'admin',
    email: 'admin@localhost.com',
    role: 'super_admin'
  };
  res.redirect('/dashboard');
});

app.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const stats = {
      totalUsers: await User.countDocuments(),
      activeUsers: await User.countDocuments({ isActive: true }),
      totalMessages: await ContactMessage.countDocuments(),
      unreadMessages: await ContactMessage.countDocuments({ status: 'new' }),
      todaySignups: await User.countDocuments({ 
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } 
      }),
      totalWorkouts: 0
    };
    
    res.render('admin/dashboard', { admin: req.session.admin, stats });
  } catch (error) {
    res.status(500).send('Dashboard error');
  }
});

app.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(50);
    res.render('admin/users', {
      admin: req.session.admin,
      users,
      currentPage: 1,
      totalPages: 1,
      totalUsers: users.length
    });
  } catch (error) {
    res.status(500).send('Users error');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

const PORT = 3010;
app.listen(PORT, () => {
  console.log(`🚀 Admin Server running on http://localhost:${PORT}`);
  console.log(`📊 Admin Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`🔑 Login: http://localhost:${PORT}/login`);
  console.log(`👤 Credentials: admin / admin123`);
});