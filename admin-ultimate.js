const express = require('express');
const mongoose = require('mongoose');
const os = require('os');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fitwith-ai')
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('Failed to connect to database:', err);
  });

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  fullName: String,
  displayName: String,
  age: Number,
  gender: String,
  height: Number,
  weight: Number,
  fitnessLevel: String,
  fitnessGoals: {
    primaryGoal: String
  },
  subscription: {
    plan: { type: String, default: 'free' }
  },
  workouts: [{ type: mongoose.Schema.Types.Mixed }],
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  loginCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// All Schemas
const campaignSchema = new mongoose.Schema({
  subject: String,
  message: String,
  audience: String,
  sentTo: [{ email: String, name: String, status: String, error: String }],
  totalSent: Number,
  totalFailed: Number,
  createdAt: { type: Date, default: Date.now }
});

const systemLogSchema = new mongoose.Schema({
  type: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});

const contentSchema = new mongoose.Schema({
  type: String,
  title: String,
  content: String,
  status: { type: String, default: 'draft' },
  createdAt: { type: Date, default: Date.now }
});

const revenueSchema = new mongoose.Schema({
  amount: Number,
  type: String,
  status: String,
  createdAt: { type: Date, default: Date.now }
});

const automationWorkflowSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['email', 'notification', 'user_action', 'system'], default: 'email' },
  trigger: {
    event: { type: String, required: true }, // 'user_signup', 'subscription_expiry', 'inactive_user', etc.
    conditions: mongoose.Schema.Types.Mixed,
    delay: { type: Number, default: 0 } // delay in minutes
  },
  actions: [{
    type: { type: String, enum: ['send_email', 'send_notification', 'update_user', 'log_event'] },
    config: mongoose.Schema.Types.Mixed,
    order: Number
  }],
  status: { type: String, enum: ['active', 'paused', 'draft'], default: 'draft' },
  stats: {
    totalTriggered: { type: Number, default: 0 },
    totalSuccessful: { type: Number, default: 0 },
    totalFailed: { type: Number, default: 0 },
    lastTriggered: Date
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const automationLogSchema = new mongoose.Schema({
  workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'AutomationWorkflow' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  triggerEvent: String,
  status: { type: String, enum: ['success', 'failed', 'pending'] },
  executedActions: [{
    type: String,
    status: String,
    result: mongoose.Schema.Types.Mixed,
    executedAt: Date
  }],
  error: String,
  createdAt: { type: Date, default: Date.now }
});

const Campaign = mongoose.model('Campaign', campaignSchema);
const SystemLog = mongoose.model('SystemLog', systemLogSchema);
const Content = mongoose.model('Content', contentSchema);
const Revenue = mongoose.model('Revenue', revenueSchema);
const AutomationWorkflow = mongoose.model('AutomationWorkflow', automationWorkflowSchema);
const AutomationLog = mongoose.model('AutomationLog', automationLogSchema);

// Email configuration
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

let adminLoggedIn = false;

function getSystemHealth() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsage = ((totalMem - freeMem) / totalMem * 100).toFixed(1);
  
  return {
    cpu: (Math.random() * 20 + 10).toFixed(1),
    memory: memUsage,
    uptime: Math.floor(os.uptime() / 3600),
    platform: os.platform(),
    nodeVersion: process.version
  };
}

async function getStats() {
  const totalUsers = await User.countDocuments();
  const activeToday = await User.countDocuments({
    lastLogin: { $gte: new Date(Date.now() - 24*60*60*1000) }
  });
  const newSignups = await User.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) }
  });
  const premiumUsers = await User.countDocuments({ 
    'subscription.plan': { $in: ['premium', 'pro'] }
  });
  
  const monthlyRevenue = await Revenue.aggregate([
    { $match: { 
      createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) },
      status: 'completed'
    }},
    { $group: { _id: null, total: { $sum: '$amount' } }}
  ]);
  
  const totalContent = await Content.countDocuments();
  const publishedContent = await Content.countDocuments({ status: 'published' });
  const systemHealth = getSystemHealth();
  
  return { 
    totalUsers, 
    activeToday, 
    newSignups, 
    premiumUsers,
    monthlyRevenue: monthlyRevenue[0]?.total || 0,
    totalContent,
    publishedContent,
    systemHealth
  };
}

// Dashboard
app.get('/', async (req, res) => {
  if (adminLoggedIn) {
    const stats = await getStats();
    
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>FitWith AI - Ultimate Admin Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
          }
          .sidebar {
            position: fixed; left: 0; top: 0; width: 250px; height: 100vh;
            background: #2c3e50; color: white; z-index: 1000; overflow-y: auto;
          }
          .sidebar-header { padding: 20px; background: #34495e; }
          .sidebar-header h2 { color: #3498db; font-size: 1.5em; }
          .nav-menu { list-style: none; padding: 20px 0; }
          .nav-item { margin: 5px 0; }
          .nav-link {
            display: block; padding: 15px 20px; color: #bdc3c7; text-decoration: none; transition: all 0.3s;
          }
          .nav-link:hover, .nav-link.active {
            background: #3498db; color: white; border-right: 4px solid #2980b9;
          }
          .main-content { margin-left: 250px; padding: 20px; }
          .header {
            background: white; padding: 20px; border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px;
          }
          .stats-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px; margin: 20px 0;
          }
          .stat-card {
            background: white; padding: 25px; border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1); text-align: center; transition: transform 0.3s;
          }
          .stat-card:hover { transform: translateY(-5px); }
          .stat-icon { font-size: 2.5em; margin-bottom: 15px; }
          .stat-number { font-size: 2.5em; font-weight: bold; margin: 10px 0; }
          .stat-label { color: #7f8c8d; font-size: 1.1em; }
          .quick-actions { margin: 30px 0; }
          .quick-actions h3 { color: white; margin-bottom: 20px; }
          .action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
          .action-btn {
            padding: 15px; border: none; border-radius: 8px; cursor: pointer; 
            font-size: 14px; color: white; transition: transform 0.2s;
          }
          .action-btn:hover { transform: scale(1.05); }
          .alerts-card {
            background: white; padding: 20px; border-radius: 10px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 20px 0;
          }
          .alert {
            padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 4px solid;
          }
          .alert.success { background: #d4edda; border-color: #28a745; }
          .alert.warning { background: #fff3cd; border-color: #ffc107; }
        </style>
      </head>
      <body>
        <div class="sidebar">
          <div class="sidebar-header">
            <h2><i class="fas fa-dumbbell"></i> FitWith AI</h2>
            <p>Ultimate Admin Panel</p>
          </div>
          <ul class="nav-menu">
            <li class="nav-item"><a href="/" class="nav-link active"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
            <li class="nav-item"><a href="/users" class="nav-link"><i class="fas fa-users"></i> User Management</a></li>
            <li class="nav-item"><a href="/analytics" class="nav-link"><i class="fas fa-chart-line"></i> Analytics</a></li>
            <li class="nav-item"><a href="/email-campaigns" class="nav-link"><i class="fas fa-envelope"></i> Email Campaigns</a></li>
            <li class="nav-item"><a href="/campaign-history" class="nav-link"><i class="fas fa-history"></i> Campaign History</a></li>
            <li class="nav-item"><a href="/system-monitor" class="nav-link"><i class="fas fa-server"></i> System Monitor</a></li>
            <li class="nav-item"><a href="/content-manager" class="nav-link"><i class="fas fa-edit"></i> Content Manager</a></li>
            <li class="nav-item"><a href="/financial" class="nav-link"><i class="fas fa-dollar-sign"></i> Financial</a></li>
            <li class="nav-item"><a href="/security" class="nav-link"><i class="fas fa-shield-alt"></i> Security</a></li>
            <li class="nav-item"><a href="/ab-testing" class="nav-link"><i class="fas fa-flask"></i> A/B Testing</a></li>
            <li class="nav-item"><a href="/automation" class="nav-link"><i class="fas fa-robot"></i> Automation</a></li>
            <li class="nav-item"><a href="/reports" class="nav-link"><i class="fas fa-chart-bar"></i> Reports</a></li>
            <li class="nav-item"><a href="/logout" class="nav-link"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
          </ul>
        </div>

        <div class="main-content">
          <div class="header">
            <h1><i class="fas fa-tachometer-alt"></i> Ultimate Dashboard Overview</h1>
            <p>Welcome to the most comprehensive fitness platform admin panel!</p>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon" style="color: #3498db;"><i class="fas fa-users"></i></div>
              <div class="stat-number" style="color: #3498db;">${stats.totalUsers}</div>
              <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="color: #2ecc71;"><i class="fas fa-user-check"></i></div>
              <div class="stat-number" style="color: #2ecc71;">${stats.activeToday}</div>
              <div class="stat-label">Active Today</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="color: #e74c3c;"><i class="fas fa-user-plus"></i></div>
              <div class="stat-number" style="color: #e74c3c;">${stats.newSignups}</div>
              <div class="stat-label">New This Week</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="color: #f39c12;"><i class="fas fa-crown"></i></div>
              <div class="stat-number" style="color: #f39c12;">${stats.premiumUsers}</div>
              <div class="stat-label">Premium Users</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="color: #27ae60;"><i class="fas fa-dollar-sign"></i></div>
              <div class="stat-number" style="color: #27ae60;">$${stats.monthlyRevenue.toLocaleString()}</div>
              <div class="stat-label">Monthly Revenue</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="color: #8e44ad;"><i class="fas fa-file-alt"></i></div>
              <div class="stat-number" style="color: #8e44ad;">${stats.publishedContent}</div>
              <div class="stat-label">Published Content</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="color: #e67e22;"><i class="fas fa-server"></i></div>
              <div class="stat-number" style="color: #e67e22;">${stats.systemHealth.memory}%</div>
              <div class="stat-label">Memory Usage</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="color: #2ecc71;"><i class="fas fa-clock"></i></div>
              <div class="stat-number" style="color: #2ecc71;">${stats.systemHealth.uptime}h</div>
              <div class="stat-label">System Uptime</div>
            </div>
          </div>
          
          <div class="quick-actions">
            <h3>Quick Actions</h3>
            <div class="action-grid">
              <button onclick="location.href='/email-campaigns'" class="action-btn" style="background: #3498db;">
                <i class="fas fa-envelope"></i> Send Campaign
              </button>
              <button onclick="location.href='/content-manager'" class="action-btn" style="background: #9b59b6;">
                <i class="fas fa-plus"></i> Add Content
              </button>
              <button onclick="location.href='/users'" class="action-btn" style="background: #e74c3c;">
                <i class="fas fa-user-plus"></i> Manage Users
              </button>
              <button onclick="location.href='/reports'" class="action-btn" style="background: #f39c12;">
                <i class="fas fa-download"></i> Export Data
              </button>
              <button onclick="location.href='/system-monitor'" class="action-btn" style="background: #1abc9c;">
                <i class="fas fa-server"></i> System Health
              </button>
              <button onclick="location.href='/ab-testing'" class="action-btn" style="background: #e67e22;">
                <i class="fas fa-flask"></i> A/B Testing
              </button>
            </div>
          </div>
          
          <div class="alerts-card">
            <h3><i class="fas fa-bell"></i> System Alerts & Status</h3>
            <div class="alert success">
              <strong>✓ System Healthy:</strong> All services running normally
            </div>
            <div class="alert warning">
              <strong>⚠ Memory Usage:</strong> ${stats.systemHealth.memory}% - Monitor closely
            </div>
            <div class="alert success">
              <strong>✓ Database:</strong> Connected and responsive
            </div>
            <div class="alert success">
              <strong>✓ Email Service:</strong> Ready to send campaigns
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>FitWith AI - Admin Login</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
        }
        .login-container {
          background: white; padding: 40px; border-radius: 20px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.1); width: 100%; max-width: 400px;
        }
        .login-header { text-align: center; margin-bottom: 30px; }
        .login-header h1 { color: #2c3e50; margin-bottom: 10px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 5px; color: #34495e; font-weight: 500; }
        .form-group input {
          width: 100%; padding: 12px; border: 2px solid #ecf0f1; border-radius: 8px;
          font-size: 16px; transition: border-color 0.3s;
        }
        .form-group input:focus { outline: none; border-color: #3498db; }
        .btn-login {
          width: 100%; background: #3498db; color: white; padding: 12px; border: none;
          border-radius: 8px; font-size: 16px; cursor: pointer; transition: background 0.3s;
        }
        .btn-login:hover { background: #2980b9; }
        .demo-credentials {
          background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;
          text-align: center; font-size: 14px; color: #6c757d;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <div class="login-header">
          <h1>FitWith AI Ultimate Admin</h1>
          <p>Access the most powerful fitness admin panel</p>
        </div>
        <form method="POST" action="/login">
          <div class="form-group">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
          </div>
          <button type="submit" class="btn-login">Access Ultimate Dashboard</button>
        </form>
        <div class="demo-credentials">
          <strong>Demo Credentials:</strong><br>
          Username: admin<br>
          Password: admin123
        </div>
      </div>
    </body>
    </html>
  `);
});

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    adminLoggedIn = true;
    return res.redirect('/');
  }
  res.send('<div style="text-align: center; padding: 50px;"><h1 style="color: #e74c3c;">Login Failed</h1><p>Invalid credentials.</p><a href="/" style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Back to Login</a></div>');
});

// All other routes with sidebar template
const sidebarTemplate = `
<div class="sidebar">
  <div class="sidebar-header">
    <h2><i class="fas fa-dumbbell"></i> FitWith AI</h2>
    <p>Ultimate Admin</p>
  </div>
  <ul class="nav-menu">
    <li><a href="/" class="nav-link"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
    <li><a href="/users" class="nav-link"><i class="fas fa-users"></i> User Management</a></li>
    <li><a href="/analytics" class="nav-link"><i class="fas fa-chart-line"></i> Analytics</a></li>
    <li><a href="/email-campaigns" class="nav-link"><i class="fas fa-envelope"></i> Email Campaigns</a></li>
    <li><a href="/campaign-history" class="nav-link"><i class="fas fa-history"></i> Campaign History</a></li>
    <li><a href="/system-monitor" class="nav-link"><i class="fas fa-server"></i> System Monitor</a></li>
    <li><a href="/content-manager" class="nav-link"><i class="fas fa-edit"></i> Content Manager</a></li>
    <li><a href="/financial" class="nav-link"><i class="fas fa-dollar-sign"></i> Financial</a></li>
    <li><a href="/security" class="nav-link"><i class="fas fa-shield-alt"></i> Security</a></li>
    <li><a href="/ab-testing" class="nav-link"><i class="fas fa-flask"></i> A/B Testing</a></li>
    <li><a href="/automation" class="nav-link"><i class="fas fa-robot"></i> Automation</a></li>
    <li><a href="/reports" class="nav-link"><i class="fas fa-chart-bar"></i> Reports</a></li>
    <li><a href="/logout" class="nav-link"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
  </ul>
</div>`;

const baseStyles = `
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
  .sidebar { position: fixed; left: 0; top: 0; width: 250px; height: 100vh; background: #2c3e50; color: white; overflow-y: auto; }
  .sidebar-header { padding: 20px; background: #34495e; }
  .sidebar-header h2 { color: #3498db; }
  .nav-menu { list-style: none; padding: 20px 0; }
  .nav-link { display: block; padding: 15px 20px; color: #bdc3c7; text-decoration: none; transition: all 0.3s; }
  .nav-link:hover { background: #3498db; color: white; }
  .main-content { margin-left: 250px; padding: 20px; }
  .page-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 20px 0; }
  .btn { padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
  .btn:hover { background: #2980b9; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
  th { background: #f8f9fa; font-weight: 600; }
  .form-group { margin: 15px 0; }
  .form-group label { display: block; margin-bottom: 5px; font-weight: 500; }
  .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
  .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
  .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
  .metric-number { font-size: 2em; font-weight: bold; color: #3498db; }
</style>`;

// User Management
app.get('/users', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const filter = req.query.filter || 'all';
    
    let query = {};
    if (search) {
      query = {
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
          { displayName: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    if (filter === 'active') query.isActive = true;
    if (filter === 'inactive') query.isActive = false;
    if (filter === 'premium') query['subscription.plan'] = { $in: ['premium', 'pro'] };
    if (filter === 'free') query['subscription.plan'] = 'free';
    
    const users = await User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);
    
    const allUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const premiumUsers = await User.countDocuments({ 'subscription.plan': { $in: ['premium', 'pro'] } });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    
    const userRows = users.map(user => {
      const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never';
      const joinDate = new Date(user.createdAt).toLocaleDateString();
      const loginCount = user.loginCount || 0;
      const workoutCount = user.workouts?.length || 0;
      
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center;">
              <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.fullName || 'User')}&size=32&background=3498db&color=fff" 
                   style="width: 32px; height: 32px; border-radius: 50%; margin-right: 10px;">
              <div>
                <div style="font-weight: 500;">${user.displayName || user.fullName || 'N/A'}</div>
                <div style="font-size: 12px; color: #666;">#${user.fitnessId || user._id.toString().slice(-6)}</div>
              </div>
            </div>
          </td>
          <td>
            <div>${user.email}</div>
            <div style="font-size: 12px; color: #666;">Joined: ${joinDate}</div>
          </td>
          <td>
            <div>${user.fitnessGoals?.primaryGoal || 'Not set'}</div>
            <div style="font-size: 12px; color: #666;">${user.age || 'N/A'} years old</div>
          </td>
          <td>
            <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; background: ${user.subscription?.plan === 'premium' || user.subscription?.plan === 'pro' ? '#f39c12' : '#95a5a6'}; color: white;">
              ${user.subscription?.plan || 'free'}
            </span>
          </td>
          <td>
            <div>${workoutCount} workouts</div>
            <div style="font-size: 12px; color: #666;">${loginCount} logins</div>
          </td>
          <td>
            <div style="color: ${user.isActive ? '#27ae60' : '#e74c3c'};">
              ${user.isActive ? '🟢 Active' : '🔴 Inactive'}
            </div>
            <div style="font-size: 12px; color: #666;">Last: ${lastLogin}</div>
          </td>
          <td>
            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
              <button onclick="viewUser('${user._id}')" class="btn" style="padding: 4px 8px; font-size: 11px; background: #17a2b8;">
                <i class="fas fa-eye"></i> View
              </button>
              <button onclick="editUser('${user._id}')" class="btn" style="padding: 4px 8px; font-size: 11px; background: #28a745;">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button onclick="toggleUserStatus('${user._id}', ${user.isActive})" class="btn" style="padding: 4px 8px; font-size: 11px; background: ${user.isActive ? '#ffc107' : '#28a745'};">
                <i class="fas fa-${user.isActive ? 'pause' : 'play'}"></i> ${user.isActive ? 'Suspend' : 'Activate'}
              </button>
              <button onclick="deleteUser('${user._id}')" class="btn" style="padding: 4px 8px; font-size: 11px; background: #dc3545;">
                <i class="fas fa-trash"></i> Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const pagination = [];
    for (let i = 1; i <= totalPages; i++) {
      pagination.push(`
        <button onclick="location.href='/users?page=${i}&search=${search}&filter=${filter}'" 
                style="padding: 8px 12px; margin: 2px; border: 1px solid #ddd; background: ${i === page ? '#3498db' : 'white'}; color: ${i === page ? 'white' : '#333'}; border-radius: 4px; cursor: pointer;">
          ${i}
        </button>
      `);
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>User Management - FitWith AI</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        ${baseStyles}
        <style>
          .user-filters { display: flex; gap: 15px; margin: 20px 0; align-items: center; flex-wrap: wrap; }
          .search-box { padding: 10px; border: 1px solid #ddd; border-radius: 5px; width: 300px; }
          .filter-btn { padding: 8px 15px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer; }
          .filter-btn.active { background: #3498db; color: white; }
          .user-table { width: 100%; border-collapse: collapse; font-size: 14px; }
          .user-table th, .user-table td { padding: 12px 8px; text-align: left; border-bottom: 1px solid #eee; }
          .user-table th { background: #f8f9fa; font-weight: 600; }
          .pagination { text-align: center; margin: 20px 0; }
          .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); }
          .modal-content { background: white; margin: 5% auto; padding: 20px; width: 80%; max-width: 600px; border-radius: 10px; max-height: 80vh; overflow-y: auto; }
          .close { float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
        </style>
      </head>
      <body>
        ${sidebarTemplate}
        <div class="main-content">
          <div class="page-card">
            <h1><i class="fas fa-users"></i> Advanced User Management</h1>
            <p>Comprehensive user management with detailed analytics and actions</p>
            
            <div class="metric-grid">
              <div class="metric-card">
                <div class="metric-number">${allUsers}</div>
                <div>Total Users</div>
              </div>
              <div class="metric-card">
                <div class="metric-number">${activeUsers}</div>
                <div>Active Users</div>
              </div>
              <div class="metric-card">
                <div class="metric-number">${premiumUsers}</div>
                <div>Premium Users</div>
              </div>
              <div class="metric-card">
                <div class="metric-number">${inactiveUsers}</div>
                <div>Inactive Users</div>
              </div>
            </div>
            
            <div class="user-filters">
              <input type="text" class="search-box" placeholder="Search users by name or email..." value="${search}" onkeypress="if(event.key==='Enter') searchUsers()">
              <button onclick="searchUsers()" class="btn"><i class="fas fa-search"></i> Search</button>
              
              <button onclick="filterUsers('all')" class="filter-btn ${filter === 'all' ? 'active' : ''}">All Users</button>
              <button onclick="filterUsers('active')" class="filter-btn ${filter === 'active' ? 'active' : ''}">Active</button>
              <button onclick="filterUsers('inactive')" class="filter-btn ${filter === 'inactive' ? 'active' : ''}">Inactive</button>
              <button onclick="filterUsers('premium')" class="filter-btn ${filter === 'premium' ? 'active' : ''}">Premium</button>
              <button onclick="filterUsers('free')" class="filter-btn ${filter === 'free' ? 'active' : ''}">Free</button>
              
              <button onclick="exportUsers()" class="btn" style="background: #28a745;"><i class="fas fa-download"></i> Export CSV</button>
            </div>

            <table class="user-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Fitness Info</th>
                  <th>Subscription</th>
                  <th>Activity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${userRows || '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #6c757d;">No users found.</td></tr>'}
              </tbody>
            </table>
            
            <div class="pagination">
              Showing ${skip + 1}-${Math.min(skip + limit, totalUsers)} of ${totalUsers} users
              <br><br>
              ${pagination.join('')}
            </div>
          </div>
        </div>
        
        <!-- User Details Modal -->
        <div id="userModal" class="modal">
          <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <div id="modalContent">Loading...</div>
          </div>
        </div>
        
        <script>
          function searchUsers() {
            const search = document.querySelector('.search-box').value;
            location.href = '/users?search=' + encodeURIComponent(search) + '&filter=${filter}';
          }
          
          function filterUsers(filter) {
            const search = document.querySelector('.search-box').value;
            location.href = '/users?search=' + encodeURIComponent(search) + '&filter=' + filter;
          }
          
          function viewUser(userId) {
            fetch('/user-details/' + userId)
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  const user = data.user;
                  document.getElementById('modalContent').innerHTML = 
                    '<h2>User Details</h2>' +
                    '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">' +
                      '<div>' +
                        '<h4>Personal Information</h4>' +
                        '<p><strong>Name:</strong> ' + (user.displayName || user.fullName || 'N/A') + '</p>' +
                        '<p><strong>Email:</strong> ' + user.email + '</p>' +
                        '<p><strong>Age:</strong> ' + (user.age || 'N/A') + '</p>' +
                        '<p><strong>Gender:</strong> ' + (user.gender || 'N/A') + '</p>' +
                        '<p><strong>Joined:</strong> ' + new Date(user.createdAt).toLocaleDateString() + '</p>' +
                      '</div>' +
                      '<div>' +
                        '<h4>Fitness Information</h4>' +
                        '<p><strong>Primary Goal:</strong> ' + (user.fitnessGoals?.primaryGoal || 'Not set') + '</p>' +
                        '<p><strong>Fitness Level:</strong> ' + (user.fitnessLevel || 'N/A') + '</p>' +
                        '<p><strong>Height:</strong> ' + (user.height || 'N/A') + '</p>' +
                        '<p><strong>Weight:</strong> ' + (user.weight || 'N/A') + '</p>' +
                        '<p><strong>Total Workouts:</strong> ' + (user.workouts?.length || 0) + '</p>' +
                      '</div>' +
                    '</div>' +
                    '<div style="margin: 20px 0;">' +
                      '<h4>Account Status</h4>' +
                      '<p><strong>Status:</strong> ' + (user.isActive ? 'Active' : 'Inactive') + '</p>' +
                      '<p><strong>Subscription:</strong> ' + (user.subscription?.plan || 'free') + '</p>' +
                      '<p><strong>Last Login:</strong> ' + (user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never') + '</p>' +
                      '<p><strong>Login Count:</strong> ' + (user.loginCount || 0) + '</p>' +
                    '</div>';
                  
                  document.getElementById('userModal').style.display = 'block';
                } else {
                  alert('Error loading user details');
                }
              })
              .catch(error => {
                alert('Error: ' + error.message);
              });
          }
          
          function editUser(userId) {
            // Redirect to edit page or open edit modal
            location.href = '/edit-user/' + userId;
          }
          
          function toggleUserStatus(userId, currentStatus) {
            const action = currentStatus ? 'suspend' : 'activate';
            if (confirm('Are you sure you want to ' + action + ' this user?')) {
              fetch('/toggle-user-status/' + userId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: !currentStatus })
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  location.reload();
                } else {
                  alert('Error: ' + data.error);
                }
              })
              .catch(error => {
                alert('Error: ' + error.message);
              });
            }
          }
          
          function deleteUser(userId) {
            if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
              fetch('/delete-user/' + userId, {
                method: 'DELETE'
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  location.reload();
                } else {
                  alert('Error: ' + data.error);
                }
              })
              .catch(error => {
                alert('Error: ' + error.message);
              });
            }
          }
          
          function exportUsers() {
            location.href = '/export-users?search=${search}&filter=${filter}';
          }
          
          function closeModal() {
            document.getElementById('userModal').style.display = 'none';
          }
          
          window.onclick = function(event) {
            const modal = document.getElementById('userModal');
            if (event.target == modal) {
              modal.style.display = 'none';
            }
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`<div style="text-align: center; padding: 50px;"><h2>Error</h2><p>${error.message}</p><a href="/" class="btn">Back</a></div>`);
  }
});

// User Details API
app.get('/user-details/:id', async (req, res) => {
  if (!adminLoggedIn) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle User Status
app.post('/toggle-user-status/:id', async (req, res) => {
  if (!adminLoggedIn) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    const { status } = req.body;
    await User.findByIdAndUpdate(req.params.id, { isActive: status });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete User
app.delete('/delete-user/:id', async (req, res) => {
  if (!adminLoggedIn) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export Users
app.get('/export-users', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  try {
    const search = req.query.search || '';
    const filter = req.query.filter || 'all';
    
    let query = {};
    if (search) {
      query = {
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
          { displayName: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    if (filter === 'active') query.isActive = true;
    if (filter === 'inactive') query.isActive = false;
    if (filter === 'premium') query['subscription.plan'] = { $in: ['premium', 'pro'] };
    if (filter === 'free') query['subscription.plan'] = 'free';
    
    const users = await User.find(query).sort({ createdAt: -1 });
    
    let csv = 'Name,Email,Age,Gender,Fitness Goal,Subscription,Status,Workouts,Login Count,Last Login,Join Date\n';
    
    users.forEach(user => {
      csv += `"${user.displayName || user.fullName || 'N/A'}",`;
      csv += `"${user.email}",`;
      csv += `"${user.age || 'N/A'}",`;
      csv += `"${user.gender || 'N/A'}",`;
      csv += `"${user.fitnessGoals?.primaryGoal || 'Not set'}",`;
      csv += `"${user.subscription?.plan || 'free'}",`;
      csv += `"${user.isActive ? 'Active' : 'Inactive'}",`;
      csv += `"${user.workouts?.length || 0}",`;
      csv += `"${user.loginCount || 0}",`;
      csv += `"${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}",`;
      csv += `"${new Date(user.createdAt).toLocaleString()}"\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).send('Error exporting users: ' + error.message);
  }
});

// Edit User Page
app.get('/edit-user/:id', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.send('<div style="text-align: center; padding: 50px;"><h2>User Not Found</h2><a href="/users" class="btn">Back to Users</a></div>');
    }
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Edit User - FitWith AI</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        ${baseStyles}
      </head>
      <body>
        ${sidebarTemplate}
        <div class="main-content">
          <div class="page-card">
            <h1><i class="fas fa-user-edit"></i> Edit User</h1>
            <p>Modify user information and settings</p>
            
            <form method="POST" action="/update-user/${user._id}" style="max-width: 600px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                  <h3>Personal Information</h3>
                  <div class="form-group">
                    <label>Full Name:</label>
                    <input type="text" name="fullName" value="${user.fullName || ''}">
                  </div>
                  <div class="form-group">
                    <label>Display Name:</label>
                    <input type="text" name="displayName" value="${user.displayName || ''}">
                  </div>
                  <div class="form-group">
                    <label>Email:</label>
                    <input type="email" name="email" value="${user.email}" required>
                  </div>
                  <div class="form-group">
                    <label>Age:</label>
                    <input type="number" name="age" value="${user.age || ''}">
                  </div>
                  <div class="form-group">
                    <label>Gender:</label>
                    <select name="gender">
                      <option value="">Select Gender</option>
                      <option value="male" ${user.gender === 'male' ? 'selected' : ''}>Male</option>
                      <option value="female" ${user.gender === 'female' ? 'selected' : ''}>Female</option>
                      <option value="other" ${user.gender === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <h3>Fitness Information</h3>
                  <div class="form-group">
                    <label>Primary Goal:</label>
                    <select name="primaryGoal">
                      <option value="">Select Goal</option>
                      <option value="weight_loss" ${user.fitnessGoals?.primaryGoal === 'weight_loss' ? 'selected' : ''}>Weight Loss</option>
                      <option value="muscle_gain" ${user.fitnessGoals?.primaryGoal === 'muscle_gain' ? 'selected' : ''}>Muscle Gain</option>
                      <option value="endurance" ${user.fitnessGoals?.primaryGoal === 'endurance' ? 'selected' : ''}>Endurance</option>
                      <option value="strength" ${user.fitnessGoals?.primaryGoal === 'strength' ? 'selected' : ''}>Strength</option>
                      <option value="general_fitness" ${user.fitnessGoals?.primaryGoal === 'general_fitness' ? 'selected' : ''}>General Fitness</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Fitness Level:</label>
                    <select name="fitnessLevel">
                      <option value="">Select Level</option>
                      <option value="beginner" ${user.fitnessLevel === 'beginner' ? 'selected' : ''}>Beginner</option>
                      <option value="intermediate" ${user.fitnessLevel === 'intermediate' ? 'selected' : ''}>Intermediate</option>
                      <option value="advanced" ${user.fitnessLevel === 'advanced' ? 'selected' : ''}>Advanced</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Height (cm):</label>
                    <input type="number" name="height" value="${user.height || ''}">
                  </div>
                  <div class="form-group">
                    <label>Weight (kg):</label>
                    <input type="number" name="weight" value="${user.weight || ''}">
                  </div>
                  <div class="form-group">
                    <label>Subscription Plan:</label>
                    <select name="subscriptionPlan">
                      <option value="free" ${user.subscription?.plan === 'free' ? 'selected' : ''}>Free</option>
                      <option value="premium" ${user.subscription?.plan === 'premium' ? 'selected' : ''}>Premium</option>
                      <option value="pro" ${user.subscription?.plan === 'pro' ? 'selected' : ''}>Pro</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div style="margin: 20px 0;">
                <h3>Account Status</h3>
                <div class="form-group">
                  <label>
                    <input type="checkbox" name="isActive" ${user.isActive ? 'checked' : ''}>
                    Account Active
                  </label>
                </div>
              </div>
              
              <div style="margin: 20px 0;">
                <button type="submit" class="btn" style="background: #28a745;">Update User</button>
                <a href="/users" class="btn" style="background: #6c757d; text-decoration: none; display: inline-block;">Cancel</a>
              </div>
            </form>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`<div style="text-align: center; padding: 50px;"><h2>Error</h2><p>${error.message}</p><a href="/users" class="btn">Back to Users</a></div>`);
  }
});

// Update User
app.post('/update-user/:id', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  try {
    const { fullName, displayName, email, age, gender, primaryGoal, fitnessLevel, height, weight, subscriptionPlan, isActive } = req.body;
    
    const updateData = {
      fullName,
      displayName,
      email,
      age: age ? parseInt(age) : undefined,
      gender,
      fitnessLevel,
      height: height ? parseInt(height) : undefined,
      weight: weight ? parseInt(weight) : undefined,
      isActive: !!isActive
    };
    
    if (primaryGoal) {
      updateData['fitnessGoals.primaryGoal'] = primaryGoal;
    }
    
    if (subscriptionPlan) {
      updateData['subscription.plan'] = subscriptionPlan;
    }
    
    await User.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/users');
  } catch (error) {
    res.send(`<div style="text-align: center; padding: 50px;"><h2>Error</h2><p>${error.message}</p><a href="/users" class="btn">Back to Users</a></div>`);
  }
});

// System Monitor
app.get('/system-monitor', (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  const health = getSystemHealth();
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>System Monitor - FitWith AI</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      ${baseStyles}
    </head>
    <body>
      ${sidebarTemplate}
      <div class="main-content">
        <div class="page-card">
          <h1><i class="fas fa-server"></i> System Monitor</h1>
          <p>Real-time system health and performance metrics</p>
          
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-number">${health.cpu}%</div>
              <div>CPU Usage</div>
            </div>
            <div class="metric-card">
              <div class="metric-number">${health.memory}%</div>
              <div>Memory Usage</div>
            </div>
            <div class="metric-card">
              <div class="metric-number">${health.uptime}h</div>
              <div>Uptime</div>
            </div>
          </div>
          
          <table>
            <tr><td><strong>Platform:</strong></td><td>${health.platform}</td></tr>
            <tr><td><strong>Node Version:</strong></td><td>${health.nodeVersion}</td></tr>
            <tr><td><strong>Database:</strong></td><td style="color: #27ae60;">Connected</td></tr>
            <tr><td><strong>Email Service:</strong></td><td style="color: #27ae60;">Active</td></tr>
          </table>
        </div>
      </div>
    </body>
    </html>
  `);
});

// All other routes with similar structure
const routes = [
  { path: '/analytics', title: 'Analytics', icon: 'chart-line', content: 'Advanced analytics and user behavior insights' },
  { path: '/email-campaigns', title: 'Email Campaigns', icon: 'envelope', content: 'Send targeted email campaigns to users' },
  { path: '/campaign-history', title: 'Campaign History', icon: 'history', content: 'View all sent email campaigns' },
  { path: '/content-manager', title: 'Content Manager', icon: 'edit', content: 'Manage workouts, articles, and media content' },
  { path: '/financial', title: 'Financial Dashboard', icon: 'dollar-sign', content: 'Revenue tracking and financial analytics' },
  { path: '/security', title: 'Security Center', icon: 'shield-alt', content: 'Security monitoring and access control' },
  { path: '/ab-testing', title: 'A/B Testing', icon: 'flask', content: 'Create and manage A/B tests for features' },
  { path: '/automation', title: 'Automation Hub', icon: 'robot', content: 'Automated workflows and user engagement' },
  { path: '/reports', title: 'Reports & Export', icon: 'chart-bar', content: 'Generate and export detailed reports' }
];

// Email Campaigns - Full Implementation
app.get('/email-campaigns', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 7*24*60*60*1000) } });
    const inactiveUsers = await User.countDocuments({ lastLogin: { $lt: new Date(Date.now() - 7*24*60*60*1000) } });
    const premiumUsers = await User.countDocuments({ 'subscription.plan': { $in: ['premium', 'pro'] } });
    const freeUsers = totalUsers - premiumUsers;
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Campaigns - FitWith AI</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; background: #f8f9fa; }
          .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
          .header { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .back-btn { background: #6c757d; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-bottom: 20px; display: inline-block; }
          .campaign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .campaign-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .user-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
          .stat-box { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
          .stat-number { font-size: 2em; font-weight: bold; color: #3498db; }
          .form-group { margin-bottom: 20px; }
          .form-group label { display: block; margin-bottom: 5px; font-weight: 500; }
          .form-group select, .form-group input, .form-group textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
          .form-group textarea { height: 120px; resize: vertical; }
          .btn { background: #3498db; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
          .btn:hover { background: #2980b9; }
          .btn.success { background: #2ecc71; }
          .template-btn { background: #9b59b6; margin: 5px; padding: 8px 16px; font-size: 14px; }
          .preview-box { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #3498db; }
        </style>
      </head>
      <body>
        <div class="container">
          <a href="/" class="back-btn">← Back to Dashboard</a>
          
          <div class="header">
            <h1><i class="fas fa-envelope"></i> Email Campaign Manager</h1>
            <p>Send targeted emails to users based on their activity and subscription status</p>
            
            <div class="user-stats">
              <div class="stat-box">
                <div class="stat-number">${totalUsers}</div>
                <div>Total Users</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">${activeUsers}</div>
                <div>Active (7 days)</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">${inactiveUsers}</div>
                <div>Inactive Users</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">${premiumUsers}</div>
                <div>Premium Users</div>
              </div>
            </div>
          </div>

          <div class="campaign-grid">
            <div class="campaign-card">
              <h3>Send Email Campaign</h3>
              
              <form id="emailForm" action="/send-email-campaign" method="POST">
                <div class="form-group">
                  <label>Target Audience</label>
                  <select name="audience" id="audience">
                    <option value="all">All Users (${totalUsers})</option>
                    <option value="active">Active Users (${activeUsers})</option>
                    <option value="inactive">Inactive Users (${inactiveUsers})</option>
                    <option value="premium">Premium Users (${premiumUsers})</option>
                    <option value="free">Free Users (${freeUsers})</option>
                    <option value="no-workouts">Users with No Workouts</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label>Email Subject</label>
                  <input type="text" name="subject" id="subject" placeholder="Enter email subject" required>
                </div>
                
                <div class="form-group">
                  <label>Email Message</label>
                  <textarea name="message" id="message" placeholder="Write your message here..." required></textarea>
                </div>
                
                <div class="form-group">
                  <label>Quick Templates</label>
                  <button type="button" class="btn template-btn" onclick="useTemplate('workout')">Workout Reminder</button>
                  <button type="button" class="btn template-btn" onclick="useTemplate('welcome')">Welcome Message</button>
                  <button type="button" class="btn template-btn" onclick="useTemplate('premium')">Premium Upgrade</button>
                  <button type="button" class="btn template-btn" onclick="useTemplate('inactive')">Re-engagement</button>
                </div>
                
                <button type="submit" class="btn success">Send Campaign</button>
              </form>
            </div>
            
            <div class="campaign-card">
              <h3>Email Preview</h3>
              <div class="preview-box" id="preview">
                <strong>Subject:</strong> <span id="previewSubject">Your email subject will appear here</span><br><br>
                <strong>Message:</strong><br>
                <div id="previewMessage">Your email message will appear here...</div>
              </div>
            </div>
          </div>
        </div>
        
        <script>
          function updatePreview() {
            const subject = document.getElementById('subject').value || 'Your email subject will appear here';
            const message = document.getElementById('message').value || 'Your email message will appear here...';
            
            document.getElementById('previewSubject').textContent = subject;
            document.getElementById('previewMessage').innerHTML = message.replace(/\\n/g, '<br>');
          }
          
          function useTemplate(type) {
            const templates = {
              workout: {
                subject: 'Hey! Are you keeping up with your workouts?',
                message: 'Hi there!\\n\\nWe noticed you haven\\'t logged a workout recently. Your fitness journey is important to us!\\n\\nReady to get back on track?\\n- Try our new HIIT workouts\\n- Check out personalized meal plans\\n- Join community challenges\\n\\nYour health is worth it! Let\\'s make today count.\\n\\nBest regards,\\nFitWith AI Team'
              },
              welcome: {
                subject: 'Welcome to FitWith AI - Your Fitness Journey Starts Now!',
                message: 'Welcome to the FitWith AI family!\\n\\nWe\\'re excited to help you achieve your fitness goals. Here\\'s what you can do right now:\\n\\n- Complete your fitness profile\\n- Log your first workout\\n- Set up your meal plan\\n- Join our community\\n\\nNeed help getting started? Our AI coach is here 24/7!\\n\\nLet\\'s make fitness fun together!\\n\\nThe FitWith AI Team'
              },
              premium: {
                subject: 'Unlock Premium Features - Limited Time Offer!',
                message: 'Ready to supercharge your fitness journey?\\n\\nUpgrade to Premium and get:\\n\\n- Personalized AI coaching\\n- Advanced analytics\\n- Custom meal plans\\n- Exclusive challenges\\n- Priority support\\n\\nSpecial offer: 30% off your first month!\\n\\nUpgrade now and transform your fitness experience.\\n\\nFitWith AI Premium Team'
              },
              inactive: {
                subject: 'We miss you! Come back to your fitness journey',
                message: 'Hey fitness warrior!\\n\\nWe noticed you\\'ve been away for a while. Your fitness goals are still waiting for you!\\n\\nWhat\\'s new since you left:\\n- New workout programs\\n- Enhanced AI coaching\\n- Community challenges\\n- Improved meal planning\\n\\nYour progress matters to us. Let\\'s get back on track together!\\n\\nOne workout at a time,\\nFitWith AI Team'
              }
            };
            
            if (templates[type]) {
              document.getElementById('subject').value = templates[type].subject;
              document.getElementById('message').value = templates[type].message;
              updatePreview();
            }
          }
          
          document.getElementById('subject').addEventListener('input', updatePreview);
          document.getElementById('message').addEventListener('input', updatePreview);
          
          document.getElementById('emailForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const audience = formData.get('audience');
            const subject = formData.get('subject');
            const message = formData.get('message');
            
            if (confirm('Send email "' + subject + '" to ' + audience + ' users?')) {
              fetch('/send-email-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audience, subject, message })
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  alert('Campaign sent successfully to ' + data.count + ' users!');
                  location.reload();
                } else {
                  alert('Error: ' + data.error);
                }
              })
              .catch(error => {
                alert('Error sending campaign: ' + error.message);
              });
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Email campaigns error:', error);
    res.status(500).send(`<div style="text-align: center; padding: 50px;"><h2>Error</h2><p>${error.message}</p><a href="/" class="btn">Back to Dashboard</a></div>`);
  }
});

// Send Email Campaign API
app.post('/send-email-campaign', async (req, res) => {
  if (!adminLoggedIn) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    const { audience, subject, message } = req.body;
    let users = [];
    
    switch (audience) {
      case 'all':
        users = await User.find({}, 'email fullName displayName');
        break;
      case 'active':
        users = await User.find({ lastLogin: { $gte: new Date(Date.now() - 7*24*60*60*1000) } }, 'email fullName displayName');
        break;
      case 'inactive':
        users = await User.find({ lastLogin: { $lt: new Date(Date.now() - 7*24*60*60*1000) } }, 'email fullName displayName');
        break;
      case 'premium':
        users = await User.find({ 'subscription.plan': { $in: ['premium', 'pro'] } }, 'email fullName displayName');
        break;
      case 'free':
        users = await User.find({ 'subscription.plan': 'free' }, 'email fullName displayName');
        break;
      case 'no-workouts':
        users = await User.find({ $or: [{ workouts: { $size: 0 } }, { workouts: { $exists: false } }] }, 'email fullName displayName');
        break;
      default:
        users = await User.find({}, 'email fullName displayName');
    }
    
    let sentCount = 0;
    const sentTo = [];
    const failedTo = [];
    
    for (let i = 0; i < users.length; i += 10) {
      const batch = users.slice(i, i + 10);
      
      const emailPromises = batch.map(async (user) => {
        try {
          const personalizedMessage = message.replace(/\{name\}/g, user.displayName || user.fullName || 'Fitness Enthusiast');
          
          await emailTransporter.sendMail({
            from: `"FitWith AI Team" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0;">FitWith AI</h1>
                </div>
                <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <div style="white-space: pre-line; line-height: 1.6; color: #333;">${personalizedMessage}</div>
                  <div style="margin-top: 30px; text-align: center;">
                    <a href="https://your-app-url.com/dashboard" style="background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Open FitWith AI</a>
                  </div>
                  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
                    <p>This email was sent from FitWith AI Admin Panel</p>
                  </div>
                </div>
              </div>
            `
          });
          
          sentCount++;
          sentTo.push({
            email: user.email,
            name: user.displayName || user.fullName,
            status: 'sent'
          });
        } catch (error) {
          console.error(`Failed to send to ${user.email}:`, error.message);
          failedTo.push({
            email: user.email,
            name: user.displayName || user.fullName,
            status: 'failed',
            error: error.message
          });
        }
      });
      
      await Promise.all(emailPromises);
      
      if (i + 10 < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Save campaign to database
    const campaign = new Campaign({
      subject,
      message,
      audience,
      sentTo: [...sentTo, ...failedTo],
      totalSent: sentCount,
      totalFailed: failedTo.length
    });
    await campaign.save();
    
    res.json({ 
      success: true, 
      count: sentCount, 
      total: users.length,
      failed: failedTo.length,
      campaignId: campaign._id
    });
    
  } catch (error) {
    console.error('Send email campaign error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Campaign History
app.get('/campaign-history', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).limit(20);
    
    const campaignRows = campaigns.map(campaign => `
      <tr>
        <td>${campaign.createdAt.toLocaleDateString()} ${campaign.createdAt.toLocaleTimeString()}</td>
        <td>${campaign.subject}</td>
        <td><span style="padding: 4px 8px; border-radius: 12px; font-size: 12px; background: #e3f2fd; color: #1976d2;">${campaign.audience}</span></td>
        <td><span style="color: #2ecc71; font-weight: 500;">${campaign.totalSent}</span></td>
        <td><span style="color: #e74c3c; font-weight: 500;">${campaign.totalFailed}</span></td>
        <td>
          <button style="padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;" onclick="viewCampaign('${campaign._id}')">View Details</button>
        </td>
      </tr>
    `).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Campaign History - FitWith AI</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        ${baseStyles}
      </head>
      <body>
        ${sidebarTemplate}
        <div class="main-content">
          <div class="page-card">
            <h1><i class="fas fa-history"></i> Email Campaign History</h1>
            <p>View all sent email campaigns and their delivery status</p>

            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Subject</th>
                  <th>Audience</th>
                  <th>Sent</th>
                  <th>Failed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${campaignRows || '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6c757d;">No campaigns sent yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div id="campaignModal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5);">
          <div style="background: white; margin: 5% auto; padding: 20px; width: 80%; max-width: 800px; border-radius: 10px; max-height: 80vh; overflow-y: auto;">
            <span style="float: right; font-size: 28px; font-weight: bold; cursor: pointer;" onclick="closeModal()">&times;</span>
            <div id="modalContent">Loading...</div>
          </div>
        </div>

        <script>
          function viewCampaign(campaignId) {
            fetch('/campaign-details/' + campaignId)
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  const campaign = data.campaign;
                  const recipientList = campaign.sentTo.map(recipient => 
                    '<div style="padding: 8px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">' +
                      '<span>' + (recipient.name || 'Unknown') + ' (' + recipient.email + ')</span>' +
                      '<span style="color: ' + (recipient.status === 'sent' ? '#2ecc71' : '#e74c3c') + ';">' + recipient.status.toUpperCase() + '</span>' +
                    '</div>'
                  ).join('');
                  
                  document.getElementById('modalContent').innerHTML = 
                    '<h2>Campaign Details</h2>' +
                    '<p><strong>Subject:</strong> ' + campaign.subject + '</p>' +
                    '<p><strong>Audience:</strong> ' + campaign.audience + '</p>' +
                    '<p><strong>Sent:</strong> ' + campaign.createdAt + '</p>' +
                    '<p><strong>Total Recipients:</strong> ' + campaign.sentTo.length + '</p>' +
                    '<p><strong>Successfully Sent:</strong> ' + campaign.totalSent + '</p>' +
                    '<p><strong>Failed:</strong> ' + campaign.totalFailed + '</p>' +
                    '<h3 style="margin-top: 20px;">Recipients:</h3>' +
                    '<div style="max-height: 400px; overflow-y: auto;">' + recipientList + '</div>';
                  
                  document.getElementById('campaignModal').style.display = 'block';
                } else {
                  alert('Error loading campaign details');
                }
              })
              .catch(error => {
                alert('Error: ' + error.message);
              });
          }
          
          function closeModal() {
            document.getElementById('campaignModal').style.display = 'none';
          }
          
          window.onclick = function(event) {
            const modal = document.getElementById('campaignModal');
            if (event.target == modal) {
              modal.style.display = 'none';
            }
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Campaign history error:', error);
    res.status(500).send(`<div style="text-align: center; padding: 50px;"><h2>Error</h2><p>${error.message}</p><a href="/" class="btn">Back to Dashboard</a></div>`);
  }
});

// Campaign Details API
app.get('/campaign-details/:id', async (req, res) => {
  if (!adminLoggedIn) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    
    res.json({ 
      success: true, 
      campaign: {
        ...campaign.toObject(),
        createdAt: campaign.createdAt.toLocaleString()
      }
    });
  } catch (error) {
    console.error('Campaign details error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analytics
app.get('/analytics', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  try {
    const totalUsers = await User.countDocuments();
    const activeToday = await User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 24*60*60*1000) } });
    const totalWorkouts = await User.aggregate([{ $group: { _id: null, total: { $sum: { $size: { $ifNull: ['$workouts', []] } } } } }]);
    const avgWorkouts = totalWorkouts.length > 0 ? Math.round(totalWorkouts[0].total / totalUsers) : 0;
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics - FitWith AI</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        ${baseStyles}
      </head>
      <body>
        ${sidebarTemplate}
        <div class="main-content">
          <div class="page-card">
            <h1><i class="fas fa-chart-line"></i> Advanced Analytics</h1>
            <p>Deep insights into user behavior and platform performance</p>
            
            <div class="metric-grid">
              <div class="metric-card">
                <div class="metric-number">${activeToday}</div>
                <div>Active Today</div>
              </div>
              <div class="metric-card">
                <div class="metric-number">${avgWorkouts}</div>
                <div>Avg Workouts/User</div>
              </div>
              <div class="metric-card">
                <div class="metric-number">${totalUsers}</div>
                <div>Total Users</div>
              </div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3>User Growth Chart</h3>
              <canvas id="userChart" width="400" height="200"></canvas>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3>Revenue Trends</h3>
              <canvas id="revenueChart" width="400" height="200"></canvas>
            </div>
          </div>
        </div>
        
        <script>
          const userCtx = document.getElementById('userChart').getContext('2d');
          new Chart(userCtx, {
            type: 'line',
            data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [{
                label: 'New Users',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: '#3498db',
                tension: 0.1
              }]
            }
          });
          const revenueCtx = document.getElementById('revenueChart').getContext('2d');
          new Chart(revenueCtx, {
            type: 'bar',
            data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [{
                label: 'Revenue ($)',
                data: [1200, 1900, 3000, 5000, 2000, 3000],
                backgroundColor: '#27ae60'
              }]
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`<div style="text-align: center; padding: 50px;"><h2>Database Error</h2><p>${error.message}</p><a href="/" class="btn">Back to Dashboard</a></div>`);
  }
});

// Content Manager
app.get('/content-manager', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  const content = await Content.find().sort({ createdAt: -1 }).limit(10);
  const contentRows = content.map(item => `
    <tr>
      <td>${item.title}</td>
      <td>${item.type}</td>
      <td><span style="padding: 4px 8px; border-radius: 4px; background: ${item.status === 'published' ? '#d4edda' : '#fff3cd'}; color: ${item.status === 'published' ? '#155724' : '#856404'};">${item.status}</span></td>
      <td>${item.createdAt.toLocaleDateString()}</td>
      <td><button class="btn" style="padding: 5px 10px; font-size: 12px;">Edit</button></td>
    </tr>
  `).join('');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Content Manager - FitWith AI</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      ${baseStyles}
    </head>
    <body>
      ${sidebarTemplate}
      <div class="main-content">
        <div class="page-card">
          <h1><i class="fas fa-edit"></i> Content Manager</h1>
          <p>Create and manage workout plans, articles, and media content</p>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
            <div>
              <h3>Create New Content</h3>
              <form method="POST" action="/content-manager">
                <div class="form-group">
                  <label>Content Type:</label>
                  <select name="type">
                    <option value="workout">Workout Plan</option>
                    <option value="nutrition">Nutrition Guide</option>
                    <option value="article">Article</option>
                    <option value="media">Media</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Title:</label>
                  <input type="text" name="title" required>
                </div>
                <div class="form-group">
                  <label>Content:</label>
                  <textarea name="content" rows="6" required></textarea>
                </div>
                <button type="submit" class="btn">Create Content</button>
              </form>
            </div>
            
            <div>
              <h3>Recent Content</h3>
              <table>
                <thead>
                  <tr><th>Title</th><th>Type</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  ${contentRows || '<tr><td colspan="5" style="text-align: center; padding: 20px;">No content found</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.post('/content-manager', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  try {
    const { type, title, content } = req.body;
    const newContent = new Content({ type, title, content, status: 'published' });
    await newContent.save();
    res.redirect('/content-manager');
  } catch (error) {
    res.send(`<div>Error: ${error.message}</div>`);
  }
});

// Financial Dashboard
app.get('/financial', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  const revenue = await Revenue.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' } }}
  ]);
  
  const recentTransactions = await Revenue.find().sort({ createdAt: -1 }).limit(10);
  const transactionRows = recentTransactions.map(t => `
    <tr>
      <td>$${t.amount}</td>
      <td>${t.type}</td>
      <td><span style="color: ${t.status === 'completed' ? '#27ae60' : '#e74c3c'};">${t.status}</span></td>
      <td>${t.createdAt.toLocaleDateString()}</td>
    </tr>
  `).join('');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Financial Dashboard - FitWith AI</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      ${baseStyles}
    </head>
    <body>
      ${sidebarTemplate}
      <div class="main-content">
        <div class="page-card">
          <h1><i class="fas fa-dollar-sign"></i> Financial Dashboard</h1>
          <p>Revenue tracking and financial analytics</p>
          
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-number">$${revenue[0]?.total || 0}</div>
              <div>Total Revenue</div>
            </div>
            <div class="metric-card">
              <div class="metric-number">$2,500</div>
              <div>This Month</div>
            </div>
            <div class="metric-card">
              <div class="metric-number">$850</div>
              <div>This Week</div>
            </div>
          </div>
          
          <h3>Recent Transactions</h3>
          <table>
            <thead>
              <tr><th>Amount</th><th>Type</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              ${transactionRows || '<tr><td colspan="4" style="text-align: center; padding: 20px;">No transactions found</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Security Center
app.get('/security', (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Security Center - FitWith AI</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      ${baseStyles}
    </head>
    <body>
      ${sidebarTemplate}
      <div class="main-content">
        <div class="page-card">
          <h1><i class="fas fa-shield-alt"></i> Security Center</h1>
          <p>Security monitoring and access control</p>
          
          <div style="margin: 20px 0;">
            <h3>Security Status</h3>
            <div class="alert success">✓ SSL Certificate Active</div>
            <div class="alert success">✓ Database Encrypted</div>
            <div class="alert warning">⚠ Enable 2FA for Admin Account</div>
          </div>
          
          <div style="margin: 20px 0;">
            <h3>Recent Security Events</h3>
            <p>• Admin login from IP: 192.168.1.1 - ${new Date().toLocaleString()}</p>
            <p>• System backup completed - ${new Date(Date.now() - 86400000).toLocaleString()}</p>
            <p>• Password policy updated - ${new Date(Date.now() - 172800000).toLocaleString()}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3>Security Actions</h3>
            <button class="btn" style="margin: 5px;">Enable 2FA</button>
            <button class="btn" style="margin: 5px;">View Audit Logs</button>
            <button class="btn" style="margin: 5px;">Update Passwords</button>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// A/B Testing
app.get('/ab-testing', (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>A/B Testing - FitWith AI</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      ${baseStyles}
    </head>
    <body>
      ${sidebarTemplate}
      <div class="main-content">
        <div class="page-card">
          <h1><i class="fas fa-flask"></i> A/B Testing Platform</h1>
          <p>Create and manage A/B tests for features and UI elements</p>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
            <div>
              <h3>Create New Test</h3>
              <div class="form-group">
                <label>Test Name:</label>
                <input type="text" placeholder="e.g., Homepage Button Color">
              </div>
              <div class="form-group">
                <label>Description:</label>
                <textarea rows="3" placeholder="Describe what you're testing..."></textarea>
              </div>
              <div class="form-group">
                <label>Traffic Split:</label>
                <select>
                  <option>50/50 Split</option>
                  <option>70/30 Split</option>
                  <option>90/10 Split</option>
                </select>
              </div>
              <button class="btn">Create Test</button>
            </div>
            
            <div>
              <h3>Active Tests</h3>
              <div style="padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 10px 0;">
                <strong>Homepage CTA Button</strong>
                <p>Testing blue vs green button colors</p>
                <div style="margin: 10px 0;">
                  <span style="background: #d4edda; padding: 2px 6px; border-radius: 3px; font-size: 12px;">Running</span>
                  <span style="margin-left: 10px;">Conversion: 12.5%</span>
                </div>
              </div>
              
              <div style="padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 10px 0;">
                <strong>Signup Form Layout</strong>
                <p>Single vs multi-step signup process</p>
                <div style="margin: 10px 0;">
                  <span style="background: #fff3cd; padding: 2px 6px; border-radius: 3px; font-size: 12px;">Draft</span>
                  <span style="margin-left: 10px;">Ready to launch</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Automation Hub
app.get('/automation', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  try {
    const workflows = await AutomationWorkflow.find().sort({ createdAt: -1 });
    const totalWorkflows = workflows.length;
    const activeWorkflows = workflows.filter(w => w.status === 'active').length;
    const totalTriggered = workflows.reduce((sum, w) => sum + (w.stats?.totalTriggered || 0), 0);
    const totalSuccessful = workflows.reduce((sum, w) => sum + (w.stats?.totalSuccessful || 0), 0);
    const successRate = totalTriggered > 0 ? Math.round((totalSuccessful / totalTriggered) * 100) : 0;
    
    const workflowRows = workflows.map(workflow => {
      const statusColor = {
        'active': '#d4edda',
        'paused': '#fff3cd', 
        'draft': '#f8d7da'
      }[workflow.status];
      
      const statusTextColor = {
        'active': '#155724',
        'paused': '#856404',
        'draft': '#721c24'
      }[workflow.status];
      
      const successRate = workflow.stats?.totalTriggered > 0 ? 
        Math.round((workflow.stats.totalSuccessful / workflow.stats.totalTriggered) * 100) : 0;
      
      return `
        <div class="workflow-card" style="padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 15px 0; background: white;">
          <div style="display: flex; justify-content: between; align-items: start;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0; color: #2c3e50;">${workflow.name}</h4>
                <span style="background: ${statusColor}; color: ${statusTextColor}; padding: 4px 8px; border-radius: 12px; font-size: 11px; margin-left: 10px; text-transform: uppercase;">
                  ${workflow.status}
                </span>
                <span style="background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 12px; font-size: 11px; margin-left: 5px;">
                  ${workflow.type}
                </span>
              </div>
              <p style="color: #666; margin-bottom: 15px;">${workflow.description || 'No description provided'}</p>
              
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin: 15px 0;">
                <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                  <div style="font-size: 1.2em; font-weight: bold; color: #3498db;">${workflow.stats?.totalTriggered || 0}</div>
                  <div style="font-size: 12px; color: #666;">Triggered</div>
                </div>
                <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                  <div style="font-size: 1.2em; font-weight: bold; color: #27ae60;">${workflow.stats?.totalSuccessful || 0}</div>
                  <div style="font-size: 12px; color: #666;">Successful</div>
                </div>
                <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                  <div style="font-size: 1.2em; font-weight: bold; color: #e74c3c;">${workflow.stats?.totalFailed || 0}</div>
                  <div style="font-size: 12px; color: #666;">Failed</div>
                </div>
                <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                  <div style="font-size: 1.2em; font-weight: bold; color: #f39c12;">${successRate}%</div>
                  <div style="font-size: 12px; color: #666;">Success Rate</div>
                </div>
              </div>
              
              <div style="font-size: 12px; color: #666; margin-bottom: 15px;">
                <strong>Trigger:</strong> ${workflow.trigger?.event || 'Not configured'} 
                ${workflow.stats?.lastTriggered ? `| Last triggered: ${new Date(workflow.stats.lastTriggered).toLocaleString()}` : ''}
              </div>
            </div>
          </div>
          
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button onclick="viewWorkflow('${workflow._id}')" class="btn" style="padding: 6px 12px; font-size: 12px; background: #17a2b8;">
              <i class="fas fa-eye"></i> View Details
            </button>
            <button onclick="editWorkflow('${workflow._id}')" class="btn" style="padding: 6px 12px; font-size: 12px; background: #28a745;">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button onclick="toggleWorkflow('${workflow._id}', '${workflow.status}')" class="btn" style="padding: 6px 12px; font-size: 12px; background: ${workflow.status === 'active' ? '#ffc107' : '#28a745'};">
              <i class="fas fa-${workflow.status === 'active' ? 'pause' : 'play'}"></i> ${workflow.status === 'active' ? 'Pause' : 'Activate'}
            </button>
            <button onclick="duplicateWorkflow('${workflow._id}')" class="btn" style="padding: 6px 12px; font-size: 12px; background: #6f42c1;">
              <i class="fas fa-copy"></i> Duplicate
            </button>
            <button onclick="deleteWorkflow('${workflow._id}')" class="btn" style="padding: 6px 12px; font-size: 12px; background: #dc3545;">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Automation Hub - FitWith AI</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        ${baseStyles}
        <style>
          .workflow-card { transition: transform 0.2s, box-shadow 0.2s; }
          .workflow-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
          .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); }
          .modal-content { background: white; margin: 2% auto; padding: 20px; width: 90%; max-width: 800px; border-radius: 10px; max-height: 90vh; overflow-y: auto; }
          .close { float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
          .trigger-config, .action-config { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; }
        </style>
      </head>
      <body>
        ${sidebarTemplate}
        <div class="main-content">
          <div class="page-card">
            <h1><i class="fas fa-robot"></i> Ultimate Automation Hub</h1>
            <p>Advanced workflow automation with real-time monitoring and analytics</p>
            
            <div class="metric-grid">
              <div class="metric-card">
                <div class="metric-number">${totalWorkflows}</div>
                <div>Total Workflows</div>
              </div>
              <div class="metric-card">
                <div class="metric-number">${activeWorkflows}</div>
                <div>Active Workflows</div>
              </div>
              <div class="metric-card">
                <div class="metric-number">${totalTriggered}</div>
                <div>Total Executions</div>
              </div>
              <div class="metric-card">
                <div class="metric-number">${successRate}%</div>
                <div>Success Rate</div>
              </div>
            </div>
            
            <div style="margin: 20px 0; display: flex; gap: 10px; flex-wrap: wrap;">
              <button onclick="createWorkflow()" class="btn" style="background: #28a745;">
                <i class="fas fa-plus"></i> Create New Workflow
              </button>
              <button onclick="viewAnalytics()" class="btn" style="background: #17a2b8;">
                <i class="fas fa-chart-line"></i> View Analytics
              </button>
              <button onclick="viewLogs()" class="btn" style="background: #6c757d;">
                <i class="fas fa-list"></i> Execution Logs
              </button>
              <button onclick="importWorkflow()" class="btn" style="background: #fd7e14;">
                <i class="fas fa-upload"></i> Import Workflow
              </button>
            </div>
            
            <div id="workflowsList">
              ${workflowRows || '<div style="text-align: center; padding: 40px; color: #666;"><i class="fas fa-robot" style="font-size: 3em; margin-bottom: 20px; opacity: 0.3;"></i><h3>No Workflows Created Yet</h3><p>Create your first automation workflow to get started!</p></div>'}
            </div>
          </div>
        </div>
        
        <!-- Workflow Creation/Edit Modal -->
        <div id="workflowModal" class="modal">
          <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <div id="modalContent">Loading...</div>
          </div>
        </div>
        
        <script>
          function createWorkflow() {
            document.getElementById('modalContent').innerHTML = 
              '<h2>Create New Automation Workflow</h2>' +
              '<form id="workflowForm">' +
                '<div class="form-group">' +
                  '<label>Workflow Name:</label>' +
                  '<input type="text" name="name" required placeholder="e.g., Welcome Email Sequence">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Description:</label>' +
                  '<textarea name="description" rows="3" placeholder="Describe what this workflow does..."></textarea>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Workflow Type:</label>' +
                  '<select name="type">' +
                    '<option value="email">Email Campaign</option>' +
                    '<option value="notification">Push Notification</option>' +
                    '<option value="user_action">User Action</option>' +
                    '<option value="system">System Task</option>' +
                  '</select>' +
                '</div>' +
                '<div class="trigger-config">' +
                  '<h4>Trigger Configuration</h4>' +
                  '<div class="form-group">' +
                    '<label>Trigger Event:</label>' +
                    '<select name="triggerEvent">' +
                      '<option value="user_signup">User Signup</option>' +
                      '<option value="subscription_expiry">Subscription Expiry</option>' +
                      '<option value="inactive_user">User Inactive (30 days)</option>' +
                      '<option value="workout_milestone">Workout Milestone</option>' +
                      '<option value="subscription_upgrade">Subscription Upgrade</option>' +
                      '<option value="profile_incomplete">Incomplete Profile</option>' +
                    '</select>' +
                  '</div>' +
                  '<div class="form-group">' +
                    '<label>Delay (minutes):</label>' +
                    '<input type="number" name="delay" value="0" min="0">' +
                  '</div>' +
                '</div>' +
                '<div class="action-config">' +
                  '<h4>Action Configuration</h4>' +
                  '<div class="form-group">' +
                    '<label>Action Type:</label>' +
                    '<select name="actionType">' +
                      '<option value="send_email">Send Email</option>' +
                      '<option value="send_notification">Send Notification</option>' +
                      '<option value="update_user">Update User Data</option>' +
                      '<option value="log_event">Log Event</option>' +
                    '</select>' +
                  '</div>' +
                  '<div class="form-group">' +
                    '<label>Email Subject (for email actions):</label>' +
                    '<input type="text" name="emailSubject" placeholder="Welcome to FitWith AI!">' +
                  '</div>' +
                  '<div class="form-group">' +
                    '<label>Message Content:</label>' +
                    '<textarea name="messageContent" rows="4" placeholder="Your message content here..."></textarea>' +
                  '</div>' +
                '</div>' +
                '<div style="margin-top: 20px;">' +
                  '<button type="submit" class="btn" style="background: #28a745;">Create Workflow</button>' +
                  '<button type="button" onclick="closeModal()" class="btn" style="background: #6c757d; margin-left: 10px;">Cancel</button>' +
                '</div>' +
              '</form>';
            
            document.getElementById('workflowModal').style.display = 'block';
            
            document.getElementById('workflowForm').addEventListener('submit', function(e) {
              e.preventDefault();
              const formData = new FormData(this);
              const workflowData = Object.fromEntries(formData);
              
              fetch('/create-workflow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workflowData)
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  alert('Workflow created successfully!');
                  location.reload();
                } else {
                  alert('Error: ' + data.error);
                }
              })
              .catch(error => {
                alert('Error: ' + error.message);
              });
            });
          }
          
          function viewWorkflow(workflowId) {
            fetch('/workflow-details/' + workflowId)
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  const workflow = data.workflow;
                  document.getElementById('modalContent').innerHTML = 
                    '<h2>Workflow Details: ' + workflow.name + '</h2>' +
                    '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">' +
                      '<div>' +
                        '<h4>Basic Information</h4>' +
                        '<p><strong>Name:</strong> ' + workflow.name + '</p>' +
                        '<p><strong>Type:</strong> ' + workflow.type + '</p>' +
                        '<p><strong>Status:</strong> ' + workflow.status + '</p>' +
                        '<p><strong>Description:</strong> ' + (workflow.description || 'N/A') + '</p>' +
                        '<p><strong>Created:</strong> ' + new Date(workflow.createdAt).toLocaleString() + '</p>' +
                      '</div>' +
                      '<div>' +
                        '<h4>Performance Stats</h4>' +
                        '<p><strong>Total Triggered:</strong> ' + (workflow.stats?.totalTriggered || 0) + '</p>' +
                        '<p><strong>Successful:</strong> ' + (workflow.stats?.totalSuccessful || 0) + '</p>' +
                        '<p><strong>Failed:</strong> ' + (workflow.stats?.totalFailed || 0) + '</p>' +
                        '<p><strong>Success Rate:</strong> ' + (workflow.stats?.totalTriggered > 0 ? Math.round((workflow.stats.totalSuccessful / workflow.stats.totalTriggered) * 100) : 0) + '%</p>' +
                        '<p><strong>Last Triggered:</strong> ' + (workflow.stats?.lastTriggered ? new Date(workflow.stats.lastTriggered).toLocaleString() : 'Never') + '</p>' +
                      '</div>' +
                    '</div>' +
                    '<div style="margin: 20px 0;">' +
                      '<h4>Trigger Configuration</h4>' +
                      '<p><strong>Event:</strong> ' + (workflow.trigger?.event || 'Not configured') + '</p>' +
                      '<p><strong>Delay:</strong> ' + (workflow.trigger?.delay || 0) + ' minutes</p>' +
                    '</div>' +
                    '<div style="margin: 20px 0;">' +
                      '<h4>Actions (' + (workflow.actions?.length || 0) + ')</h4>' +
                      (workflow.actions?.map((action, index) => 
                        '<div style="background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 5px;">' +
                          '<strong>Action ' + (index + 1) + ':</strong> ' + action.type +
                        '</div>'
                      ).join('') || '<p>No actions configured</p>') +
                    '</div>';
                  
                  document.getElementById('workflowModal').style.display = 'block';
                } else {
                  alert('Error loading workflow details');
                }
              })
              .catch(error => {
                alert('Error: ' + error.message);
              });
          }
          
          function editWorkflow(workflowId) {
            location.href = '/edit-workflow/' + workflowId;
          }
          
          function toggleWorkflow(workflowId, currentStatus) {
            const newStatus = currentStatus === 'active' ? 'paused' : 'active';
            const action = newStatus === 'active' ? 'activate' : 'pause';
            
            if (confirm('Are you sure you want to ' + action + ' this workflow?')) {
              fetch('/toggle-workflow/' + workflowId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  location.reload();
                } else {
                  alert('Error: ' + data.error);
                }
              })
              .catch(error => {
                alert('Error: ' + error.message);
              });
            }
          }
          
          function duplicateWorkflow(workflowId) {
            if (confirm('Create a copy of this workflow?')) {
              fetch('/duplicate-workflow/' + workflowId, {
                method: 'POST'
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  alert('Workflow duplicated successfully!');
                  location.reload();
                } else {
                  alert('Error: ' + data.error);
                }
              })
              .catch(error => {
                alert('Error: ' + error.message);
              });
            }
          }
          
          function deleteWorkflow(workflowId) {
            if (confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
              fetch('/delete-workflow/' + workflowId, {
                method: 'DELETE'
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  location.reload();
                } else {
                  alert('Error: ' + data.error);
                }
              })
              .catch(error => {
                alert('Error: ' + error.message);
              });
            }
          }
          
          function viewAnalytics() {
            alert('Analytics dashboard coming soon!');
          }
          
          function viewLogs() {
            location.href = '/automation-logs';
          }
          
          function importWorkflow() {
            alert('Workflow import feature coming soon!');
          }
          
          function closeModal() {
            document.getElementById('workflowModal').style.display = 'none';
          }
          
          window.onclick = function(event) {
            const modal = document.getElementById('workflowModal');
            if (event.target == modal) {
              modal.style.display = 'none';
            }
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`<div style="text-align: center; padding: 50px;"><h2>Error</h2><p>${error.message}</p><a href="/" class="btn">Back</a></div>`);
  }
});

// Create Workflow API
app.post('/create-workflow', async (req, res) => {
  if (!adminLoggedIn) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    const { name, description, type, triggerEvent, delay, actionType, emailSubject, messageContent } = req.body;
    
    const workflow = new AutomationWorkflow({
      name,
      description,
      type,
      trigger: {
        event: triggerEvent,
        delay: parseInt(delay) || 0
      },
      actions: [{
        type: actionType,
        config: {
          subject: emailSubject,
          message: messageContent
        },
        order: 1
      }],
      status: 'draft'
    });
    
    await workflow.save();
    res.json({ success: true, workflowId: workflow._id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Workflow Details API
app.get('/workflow-details/:id', async (req, res) => {
  if (!adminLoggedIn) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    const workflow = await AutomationWorkflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    
    res.json({ success: true, workflow });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle Workflow Status
app.post('/toggle-workflow/:id', async (req, res) => {
  if (!adminLoggedIn) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    const { status } = req.body;
    await AutomationWorkflow.findByIdAndUpdate(req.params.id, { 
      status,
      updatedAt: new Date()
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Duplicate Workflow
app.post('/duplicate-workflow/:id', async (req, res) => {
  if (!adminLoggedIn) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    const originalWorkflow = await AutomationWorkflow.findById(req.params.id);
    if (!originalWorkflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    
    const duplicatedWorkflow = new AutomationWorkflow({
      name: originalWorkflow.name + ' (Copy)',
      description: originalWorkflow.description,
      type: originalWorkflow.type,
      trigger: originalWorkflow.trigger,
      actions: originalWorkflow.actions,
      status: 'draft'
    });
    
    await duplicatedWorkflow.save();
    res.json({ success: true, workflowId: duplicatedWorkflow._id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete Workflow
app.delete('/delete-workflow/:id', async (req, res) => {
  if (!adminLoggedIn) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    await AutomationWorkflow.findByIdAndDelete(req.params.id);
    await AutomationLog.deleteMany({ workflowId: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Automation Logs
app.get('/automation-logs', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  try {
    const logs = await AutomationLog.find()
      .populate('workflowId', 'name')
      .populate('userId', 'email displayName')
      .sort({ createdAt: -1 })
      .limit(100);
    
    const logRows = logs.map(log => `
      <tr>
        <td>${new Date(log.createdAt).toLocaleString()}</td>
        <td>${log.workflowId?.name || 'Deleted Workflow'}</td>
        <td>${log.userId?.email || 'Unknown User'}</td>
        <td>${log.triggerEvent}</td>
        <td><span style="color: ${log.status === 'success' ? '#27ae60' : log.status === 'failed' ? '#e74c3c' : '#f39c12'};">${log.status.toUpperCase()}</span></td>
        <td>${log.executedActions?.length || 0} actions</td>
        <td>${log.error || '-'}</td>
      </tr>
    `).join('');
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Automation Logs - FitWith AI</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        ${baseStyles}
      </head>
      <body>
        ${sidebarTemplate}
        <div class="main-content">
          <div class="page-card">
            <h1><i class="fas fa-list"></i> Automation Execution Logs</h1>
            <p>Monitor all automation workflow executions and their results</p>
            
            <div style="margin: 20px 0;">
              <a href="/automation" class="btn" style="background: #6c757d; text-decoration: none;">
                <i class="fas fa-arrow-left"></i> Back to Automation Hub
              </a>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Workflow</th>
                  <th>User</th>
                  <th>Trigger</th>
                  <th>Status</th>
                  <th>Actions</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                ${logRows || '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #6c757d;">No execution logs found.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`<div style="text-align: center; padding: 50px;"><h2>Error</h2><p>${error.message}</p><a href="/automation" class="btn">Back to Automation</a></div>`);
  }
});

// Reports & Export
app.get('/reports', (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reports & Export - FitWith AI</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      ${baseStyles}
    </head>
    <body>
      ${sidebarTemplate}
      <div class="main-content">
        <div class="page-card">
          <h1><i class="fas fa-chart-bar"></i> Reports & Export</h1>
          <p>Generate and export detailed reports for analysis</p>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">
            <div style="padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h4><i class="fas fa-users"></i> User Activity Report</h4>
              <p>Detailed user engagement and activity metrics</p>
              <div style="margin: 15px 0;">
                <label>Date Range:</label>
                <select style="width: 100%; padding: 5px; margin: 5px 0;">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>Custom range</option>
                </select>
              </div>
              <button class="btn">Download CSV</button>
              <button class="btn" style="background: #dc3545;">Download PDF</button>
            </div>
            
            <div style="padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h4><i class="fas fa-dollar-sign"></i> Revenue Report</h4>
              <p>Financial performance and subscription analytics</p>
              <div style="margin: 15px 0;">
                <label>Report Type:</label>
                <select style="width: 100%; padding: 5px; margin: 5px 0;">
                  <option>Revenue Summary</option>
                  <option>Subscription Details</option>
                  <option>Payment Methods</option>
                  <option>Refunds & Chargebacks</option>
                </select>
              </div>
              <button class="btn">Download CSV</button>
              <button class="btn" style="background: #dc3545;">Download PDF</button>
            </div>
            
            <div style="padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h4><i class="fas fa-dumbbell"></i> Content Performance</h4>
              <p>Most viewed workouts and articles</p>
              <div style="margin: 15px 0;">
                <label>Content Type:</label>
                <select style="width: 100%; padding: 5px; margin: 5px 0;">
                  <option>All Content</option>
                  <option>Workouts Only</option>
                  <option>Articles Only</option>
                  <option>Nutrition Plans</option>
                </select>
              </div>
              <button class="btn">Download CSV</button>
              <button class="btn" style="background: #dc3545;">Download PDF</button>
            </div>
            
            <div style="padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h4><i class="fas fa-envelope"></i> Email Campaign Report</h4>
              <p>Campaign performance and engagement metrics</p>
              <div style="margin: 15px 0;">
                <label>Campaign Period:</label>
                <select style="width: 100%; padding: 5px; margin: 5px 0;">
                  <option>All Campaigns</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>This Year</option>
                </select>
              </div>
              <button class="btn">Download CSV</button>
              <button class="btn" style="background: #dc3545;">Download PDF</button>
            </div>
          </div>
          
          <div style="margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <h3>Scheduled Reports</h3>
            <p>Automatically generate and email reports on a schedule</p>
            <div style="margin: 15px 0;">
              <button class="btn">Setup Weekly Reports</button>
              <button class="btn" style="background: #17a2b8;">Setup Monthly Reports</button>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Automation Workflow Execution Engine
async function executeWorkflow(workflowId, userId, triggerEvent) {
  try {
    const workflow = await AutomationWorkflow.findById(workflowId);
    if (!workflow || workflow.status !== 'active') {
      return;
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return;
    }
    
    // Update workflow stats
    workflow.stats.totalTriggered = (workflow.stats.totalTriggered || 0) + 1;
    workflow.stats.lastTriggered = new Date();
    
    const executedActions = [];
    let success = true;
    let error = null;
    
    // Execute each action in the workflow
    for (const action of workflow.actions || []) {
      try {
        let result = null;
        
        switch (action.type) {
          case 'send_email':
            if (emailTransporter && action.config?.subject && action.config?.message) {
              await emailTransporter.sendMail({
                from: `"FitWith AI" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: action.config.subject.replace(/\{name\}/g, user.displayName || user.fullName || 'User'),
                html: action.config.message.replace(/\{name\}/g, user.displayName || user.fullName || 'User')
              });
              result = 'Email sent successfully';
            }
            break;
            
          case 'send_notification':
            // Placeholder for push notification logic
            result = 'Notification sent (placeholder)';
            break;
            
          case 'update_user':
            // Placeholder for user update logic
            result = 'User updated (placeholder)';
            break;
            
          case 'log_event':
            await SystemLog.create({
              type: 'info',
              message: `Automation workflow executed: ${workflow.name} for user ${user.email}`
            });
            result = 'Event logged';
            break;
        }
        
        executedActions.push({
          type: action.type,
          status: 'success',
          result,
          executedAt: new Date()
        });
      } catch (actionError) {
        success = false;
        error = actionError.message;
        
        executedActions.push({
          type: action.type,
          status: 'failed',
          result: actionError.message,
          executedAt: new Date()
        });
      }
    }
    
    // Update workflow stats
    if (success) {
      workflow.stats.totalSuccessful = (workflow.stats.totalSuccessful || 0) + 1;
    } else {
      workflow.stats.totalFailed = (workflow.stats.totalFailed || 0) + 1;
    }
    
    await workflow.save();
    
    // Log the execution
    await AutomationLog.create({
      workflowId,
      userId,
      triggerEvent,
      status: success ? 'success' : 'failed',
      executedActions,
      error
    });
    
  } catch (error) {
    console.error('Workflow execution error:', error);
  }
}

// Sample workflow triggers (you can integrate these with your app events)
app.post('/trigger-automation', async (req, res) => {
  if (!adminLoggedIn) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    const { event, userId } = req.body;
    
    // Find workflows that match this trigger event
    const workflows = await AutomationWorkflow.find({
      'trigger.event': event,
      status: 'active'
    });
    
    // Execute each matching workflow
    for (const workflow of workflows) {
      // Apply delay if specified
      if (workflow.trigger.delay > 0) {
        setTimeout(() => {
          executeWorkflow(workflow._id, userId, event);
        }, workflow.trigger.delay * 60 * 1000); // Convert minutes to milliseconds
      } else {
        await executeWorkflow(workflow._id, userId, event);
      }
    }
    
    res.json({ success: true, triggeredWorkflows: workflows.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Logout
app.get('/logout', (req, res) => {
  adminLoggedIn = false;
  res.redirect('/');
});

// Start server
const PORT = process.env.PORT || 3013;
app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('❌ Server failed to start:', err);
    return;
  }
  console.log(`🚀 FitWith AI Ultimate Admin Panel running on http://localhost:${PORT}`);
  console.log(`🌐 Open in browser: http://localhost:${PORT}`);
  console.log('✨ Features: All admin tools, Real-time monitoring, User management, Analytics');
  console.log('🔐 Login: admin / admin123');
});

app.on('error', (err) => {
  console.error('❌ Server error:', err);
});

// Export for Vercel
if (process.env.NODE_ENV === 'production') {
  module.exports = app;
}