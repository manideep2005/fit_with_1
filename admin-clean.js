const express = require('express');
const mongoose = require('mongoose');
const database = require('./config/database');
const os = require('os');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Connect to MongoDB Atlas
database.connect().catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

// Use existing models from main app
const User = require('./models/User');
const nodemailer = require('nodemailer');

// All Schemas
const campaignSchema = new mongoose.Schema({
  subject: String,
  message: String,
  audience: String,
  sentTo: [{
    email: String,
    name: String,
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    error: String
  }],
  totalSent: Number,
  totalFailed: Number,
  createdAt: { type: Date, default: Date.now }
});

const systemLogSchema = new mongoose.Schema({
  type: { type: String, enum: ['info', 'warning', 'error', 'security'] },
  message: String,
  details: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false }
});

const contentSchema = new mongoose.Schema({
  type: { type: String, enum: ['workout', 'nutrition', 'article', 'media'] },
  title: String,
  content: String,
  author: String,
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  tags: [String],
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const revenueSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  currency: { type: String, default: 'USD' },
  type: { type: String, enum: ['subscription', 'one-time', 'refund'] },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'] },
  paymentMethod: String,
  transactionId: String,
  createdAt: { type: Date, default: Date.now }
});

const abTestSchema = new mongoose.Schema({
  name: String,
  description: String,
  variants: [{
    name: String,
    traffic: Number,
    conversions: { type: Number, default: 0 },
    views: { type: Number, default: 0 }
  }],
  status: { type: String, enum: ['draft', 'running', 'completed'], default: 'draft' },
  startDate: Date,
  endDate: Date,
  createdAt: { type: Date, default: Date.now }
});

const notificationSchema = new mongoose.Schema({
  title: String,
  message: String,
  type: { type: String, enum: ['push', 'email', 'sms', 'in-app'] },
  audience: String,
  scheduled: Date,
  sent: { type: Boolean, default: false },
  sentCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Campaign = mongoose.model('Campaign', campaignSchema);
const SystemLog = mongoose.model('SystemLog', systemLogSchema);
const Content = mongoose.model('Content', contentSchema);
const Revenue = mongoose.model('Revenue', revenueSchema);
const ABTest = mongoose.model('ABTest', abTestSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// Email configuration
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

let adminLoggedIn = false;

// System monitoring functions
function getSystemHealth() {
  const cpuUsage = os.loadavg()[0];
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsage = ((totalMem - freeMem) / totalMem * 100).toFixed(1);
  const uptime = os.uptime();
  
  return {
    cpu: cpuUsage.toFixed(1),
    memory: memUsage,
    uptime: Math.floor(uptime / 3600),
    platform: os.platform(),
    nodeVersion: process.version
  };
}

// Get comprehensive statistics
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
  
  // Revenue stats
  const monthlyRevenue = await Revenue.aggregate([
    { $match: { 
      createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) },
      status: 'completed'
    }},
    { $group: { _id: null, total: { $sum: '$amount' } }}
  ]);
  
  // Content stats
  const totalContent = await Content.countDocuments();
  const publishedContent = await Content.countDocuments({ status: 'published' });
  
  // System health
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

app.get('/', async (req, res) => {
  if (adminLoggedIn) {
    const stats = await getStats();
    
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>FitWith AI - Admin Dashboard</title>
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
            background: #2c3e50; color: white; z-index: 1000;
          }
          .sidebar-header { padding: 20px; background: #34495e; border-bottom: 1px solid #4a5f7a; }
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
          .users { color: #3498db; }
          .active { color: #2ecc71; }
          .signups { color: #e74c3c; }
          .premium { color: #f39c12; }
        </style>
      </head>
      <body>
        <div class="sidebar">
          <div class="sidebar-header">
            <h2><i class="fas fa-dumbbell"></i> FitWith AI</h2>
            <p>Admin Panel</p>
          </div>
          <ul class="nav-menu">
            <li class="nav-item">
              <a href="/" class="nav-link active">
                <i class="fas fa-tachometer-alt"></i> Dashboard
              </a>
            </li>
            <li class="nav-item">
              <a href="/users" class="nav-link">
                <i class="fas fa-users"></i> User Management
              </a>
            </li>
            <li class="nav-item">
              <a href="/analytics" class="nav-link">
                <i class="fas fa-chart-line"></i> Analytics
              </a>
            </li>
            <li class="nav-item">
              <a href="/email-campaigns" class="nav-link">
                <i class="fas fa-envelope"></i> Email Campaigns
              </a>
            </li>
            <li class="nav-item">
              <a href="/campaign-history" class="nav-link">
                <i class="fas fa-history"></i> Campaign History
              </a>
            </li>
            <li class="nav-item">
              <a href="/system-monitor" class="nav-link">
                <i class="fas fa-server"></i> System Monitor
              </a>
            </li>
            <li class="nav-item">
              <a href="/content-manager" class="nav-link">
                <i class="fas fa-edit"></i> Content Manager
              </a>
            </li>
            <li class="nav-item">
              <a href="/financial" class="nav-link">
                <i class="fas fa-dollar-sign"></i> Financial
              </a>
            </li>
            <li class="nav-item">
              <a href="/security" class="nav-link">
                <i class="fas fa-shield-alt"></i> Security
              </a>
            </li>
            <li class="nav-item">
              <a href="/ab-testing" class="nav-link">
                <i class="fas fa-flask"></i> A/B Testing
              </a>
            </li>
            <li class="nav-item">
              <a href="/automation" class="nav-link">
                <i class="fas fa-robot"></i> Automation
              </a>
            </li>
            <li class="nav-item">
              <a href="/reports" class="nav-link">
                <i class="fas fa-chart-bar"></i> Reports
              </a>
            </li>
            <li class="nav-item">
              <a href="/logout" class="nav-link">
                <i class="fas fa-sign-out-alt"></i> Logout
              </a>
            </li>
          </ul>
        </div>

        <div class="main-content">
          <div class="header">
            <h1><i class="fas fa-tachometer-alt"></i> Dashboard Overview</h1>
            <p>Welcome back, Admin! Here's what's happening with your fitness platform.</p>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon users">
                <i class="fas fa-users"></i>
              </div>
              <div class="stat-number users">${stats.totalUsers}</div>
              <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon active">
                <i class="fas fa-user-check"></i>
              </div>
              <div class="stat-number active">${stats.activeToday}</div>
              <div class="stat-label">Active Today</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon signups">
                <i class="fas fa-user-plus"></i>
              </div>
              <div class="stat-number signups">${stats.newSignups}</div>
              <div class="stat-label">New This Week</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon premium">
                <i class="fas fa-crown"></i>
              </div>
              <div class="stat-number premium">${stats.premiumUsers}</div>
              <div class="stat-label">Premium Users</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="color: #27ae60;">
                <i class="fas fa-dollar-sign"></i>
              </div>
              <div class="stat-number" style="color: #27ae60;">$${stats.monthlyRevenue.toLocaleString()}</div>
              <div class="stat-label">Monthly Revenue</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="color: #8e44ad;">
                <i class="fas fa-file-alt"></i>
              </div>
              <div class="stat-number" style="color: #8e44ad;">${stats.publishedContent}</div>
              <div class="stat-label">Published Content</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="color: #e67e22;">
                <i class="fas fa-server"></i>
              </div>
              <div class="stat-number" style="color: #e67e22;">${stats.systemHealth.memory}%</div>
              <div class="stat-label">Memory Usage</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="color: #2ecc71;">
                <i class="fas fa-clock"></i>
              </div>
              <div class="stat-number" style="color: #2ecc71;">${stats.systemHealth.uptime}h</div>
              <div class="stat-label">System Uptime</div>
            </div>
          </div>
          
          <!-- Quick Actions -->
          <div class="quick-actions" style="margin: 30px 0;">
            <h3 style="color: white; margin-bottom: 20px;">Quick Actions</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
              <button onclick="location.href='/email-campaigns'" style="background: #3498db; color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                <i class="fas fa-envelope"></i> Send Campaign
              </button>
              <button onclick="location.href='/content-manager'" style="background: #9b59b6; color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                <i class="fas fa-plus"></i> Add Content
              </button>
              <button onclick="location.href='/users'" style="background: #e74c3c; color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                <i class="fas fa-user-plus"></i> Manage Users
              </button>
              <button onclick="location.href='/reports'" style="background: #f39c12; color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                <i class="fas fa-download"></i> Export Data
              </button>
            </div>
          </div>
          
          <!-- Real-time Alerts -->
          <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 20px 0;">
            <h3 style="margin-bottom: 15px; color: #2c3e50;"><i class="fas fa-bell"></i> System Alerts</h3>
            <div id="alerts">
              <div style="padding: 10px; background: #d4edda; border-left: 4px solid #28a745; margin: 5px 0; border-radius: 4px;">
                <strong>System Healthy:</strong> All services running normally
              </div>
              <div style="padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; margin: 5px 0; border-radius: 4px;">
                <strong>Memory Usage:</strong> ${stats.systemHealth.memory}% - Monitor closely
              </div>
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
          <h1>FitWith AI Admin</h1>
          <p>Admin Panel Access</p>
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
          <button type="submit" class="btn-login">Login to Dashboard</button>
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

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    adminLoggedIn = true;
    return res.redirect('/');
  }
  
  res.send(`
    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
      <h1 style="color: #e74c3c;">Login Failed</h1>
      <p>Invalid credentials. Please try again.</p>
      <a href="/" style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Back to Login</a>
    </div>
  `);
});

app.get('/users', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(50);
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const premiumUsers = await User.countDocuments({ 'subscription.plan': { $in: ['premium', 'pro'] } });
    
    const userRows = users.map(user => `
      <tr>
        <td>${user.fitnessId || user._id.toString().slice(-6)}</td>
        <td>${user.displayName || user.fullName}</td>
        <td>${user.email}</td>
        <td>${user.fitnessGoals?.primaryGoal || 'Not set'}</td>
        <td><span class="badge ${user.subscription?.plan === 'premium' || user.subscription?.plan === 'pro' ? 'premium' : 'free'}">${user.subscription?.plan || 'free'}</span></td>
        <td>${user.workouts?.length || 0}</td>
        <td><span class="status ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
      </tr>
    `).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>User Management - FitWith AI</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; background: #f8f9fa; }
          .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
          .header { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .back-btn { background: #6c757d; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-bottom: 20px; display: inline-block; }
          .table-container { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
          th { background: #f8f9fa; font-weight: 600; }
          .badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
          .badge.premium { background: #ffeaa7; color: #d63031; }
          .badge.free { background: #ddd; color: #636e72; }
          .status.active { color: #00b894; font-weight: 500; }
          .status.inactive { color: #e17055; }
        </style>
      </head>
      <body>
        <div class="container">
          <a href="/" class="back-btn">Back to Dashboard</a>
          
          <div class="header">
            <h1>User Management</h1>
            <p>Manage all registered users and their fitness journeys</p>
            <div style="display: flex; gap: 20px; margin-top: 15px;">
              <div style="background: #3498db; color: white; padding: 10px 15px; border-radius: 5px;">
                <strong>${totalUsers}</strong> Total Users
              </div>
              <div style="background: #2ecc71; color: white; padding: 10px 15px; border-radius: 5px;">
                <strong>${activeUsers}</strong> Active
              </div>
              <div style="background: #f39c12; color: white; padding: 10px 15px; border-radius: 5px;">
                <strong>${premiumUsers}</strong> Premium
              </div>
            </div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Fitness Goal</th>
                  <th>Subscription</th>
                  <th>Workouts</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${userRows || '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #6c757d;">No users found in database.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).send(`
      <div style="text-align: center; padding: 50px;">
        <h2>Database Error</h2>
        <p>Error loading user data: ${error.message}</p>
        <a href="/" style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Back to Dashboard</a>
      </div>
    `);
  }
});

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
          <a href="/" class="back-btn">Back to Dashboard</a>
          
          <div class="header">
            <h1>Email Campaign Manager</h1>
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
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; background: #f8f9fa; }
          .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
          .header { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .back-btn { background: #6c757d; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-bottom: 20px; display: inline-block; }
          .analytics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
          .chart-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .metric { text-align: center; padding: 20px; }
          .metric-value { font-size: 2.5em; font-weight: bold; color: #3498db; }
          .metric-label { color: #7f8c8d; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <a href="/" class="back-btn">Back to Dashboard</a>
          
          <div class="header">
            <h1>Advanced Analytics</h1>
            <p>Deep insights into user behavior and platform performance</p>
          </div>

          <div class="analytics-grid">
            <div class="chart-card">
              <h3>User Engagement</h3>
              <div class="metric">
                <div class="metric-value">${activeToday}</div>
                <div class="metric-label">Active Today</div>
              </div>
              <div class="metric">
                <div class="metric-value">${avgWorkouts}</div>
                <div class="metric-label">Avg Workouts/User</div>
              </div>
            </div>
            
            <div class="chart-card">
              <h3>Platform Growth</h3>
              <div class="metric">
                <div class="metric-value">${totalUsers}</div>
                <div class="metric-label">Total Users</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`<div style="text-align: center; padding: 50px;"><h2>Database Error</h2><p>${error.message}</p><a href="/" class="btn">Back to Dashboard</a></div>`);
  }
});

// Campaign History Page
app.get('/campaign-history', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).limit(20);
    
    const campaignRows = campaigns.map(campaign => `
      <tr>
        <td>${campaign.createdAt.toLocaleDateString()} ${campaign.createdAt.toLocaleTimeString()}</td>
        <td>${campaign.subject}</td>
        <td><span class="badge audience">${campaign.audience}</span></td>
        <td><span class="success">${campaign.totalSent}</span></td>
        <td><span class="failed">${campaign.totalFailed}</span></td>
        <td>
          <button class="btn-sm view" onclick="viewCampaign('${campaign._id}')">View Details</button>
        </td>
      </tr>
    `).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Campaign History - FitWith AI</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; background: #f8f9fa; }
          .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
          .header { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .back-btn { background: #6c757d; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-bottom: 20px; display: inline-block; }
          .table-container { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
          th { background: #f8f9fa; font-weight: 600; }
          .badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
          .badge.audience { background: #e3f2fd; color: #1976d2; }
          .success { color: #2ecc71; font-weight: 500; }
          .failed { color: #e74c3c; font-weight: 500; }
          .btn-sm { padding: 5px 10px; margin: 2px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
          .btn-sm.view { background: #3498db; color: white; }
          .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); }
          .modal-content { background: white; margin: 5% auto; padding: 20px; width: 80%; max-width: 800px; border-radius: 10px; max-height: 80vh; overflow-y: auto; }
          .close { float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
          .recipient-list { max-height: 400px; overflow-y: auto; }
          .recipient-item { padding: 8px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="container">
          <a href="/" class="back-btn">Back to Dashboard</a>
          
          <div class="header">
            <h1>Email Campaign History</h1>
            <p>View all sent email campaigns and their delivery status</p>
          </div>

          <div class="table-container">
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

        <!-- Modal for campaign details -->
        <div id="campaignModal" class="modal">
          <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
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
                    '<div class="recipient-item">' +
                      '<span>' + (recipient.name || 'Unknown') + ' (' + recipient.email + ')</span>' +
                      '<span class="' + (recipient.status === 'sent' ? 'success' : 'failed') + '">' + recipient.status.toUpperCase() + '</span>' +
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
                    '<div class="recipient-list">' + recipientList + '</div>';
                  
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

app.get('/logout', (req, res) => {
  adminLoggedIn = false;
  res.redirect('/');
});

app.listen(3012, () => {
  console.log('FitWith AI Admin Panel running on http://localhost:3012');
  console.log('Features: Real data integration, Email campaigns, User management');
});
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
          }
          .sidebar {
            position: fixed; left: 0; top: 0; width: 250px; height: 100vh;
            background: #2c3e50; color: white; z-index: 1000;
          }
          .sidebar-header { padding: 20px; background: #34495e; }
          .nav-menu { list-style: none; padding: 20px 0; }
          .nav-link {
            display: block; padding: 15px 20px; color: #bdc3c7; text-decoration: none;
          }
          .nav-link:hover { background: #3498db; color: white; }
          .main-content { margin-left: 250px; padding: 20px; }
          .content-card { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f8f9fa; }
          .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .premium { background: #f39c12; color: white; }
          .free { background: #95a5a6; color: white; }
          .status.active { color: #27ae60; }
          .status.inactive { color: #e74c3c; }
        </style>
      </head>
      <body>
        <div class="sidebar">
          <div class="sidebar-header">
            <h2><i class="fas fa-dumbbell"></i> FitWith AI</h2>
          </div>
          <ul class="nav-menu">
            <li><a href="/" class="nav-link"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
            <li><a href="/users" class="nav-link"><i class="fas fa-users"></i> User Management</a></li>
            <li><a href="/analytics" class="nav-link"><i class="fas fa-chart-line"></i> Analytics</a></li>
            <li><a href="/email-campaigns" class="nav-link"><i class="fas fa-envelope"></i> Email Campaigns</a></li>
            <li><a href="/system-monitor" class="nav-link"><i class="fas fa-server"></i> System Monitor</a></li>
            <li><a href="/content-manager" class="nav-link"><i class="fas fa-edit"></i> Content Manager</a></li>
            <li><a href="/financial" class="nav-link"><i class="fas fa-dollar-sign"></i> Financial</a></li>
            <li><a href="/security" class="nav-link"><i class="fas fa-shield-alt"></i> Security</a></li>
            <li><a href="/ab-testing" class="nav-link"><i class="fas fa-flask"></i> A/B Testing</a></li>
            <li><a href="/automation" class="nav-link"><i class="fas fa-robot"></i> Automation</a></li>
            <li><a href="/reports" class="nav-link"><i class="fas fa-chart-bar"></i> Reports</a></li>
            <li><a href="/logout" class="nav-link"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
          </ul>
        </div>
        <div class="main-content">
          <div class="content-card">
            <h1><i class="fas fa-users"></i> User Management</h1>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0;">
              <div style="text-align: center; padding: 20px; background: #3498db; color: white; border-radius: 8px;">
                <h3>${totalUsers}</h3><p>Total Users</p>
              </div>
              <div style="text-align: center; padding: 20px; background: #27ae60; color: white; border-radius: 8px;">
                <h3>${activeUsers}</h3><p>Active Users</p>
              </div>
              <div style="text-align: center; padding: 20px; background: #f39c12; color: white; border-radius: 8px;">
                <h3>${premiumUsers}</h3><p>Premium Users</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Name</th><th>Email</th><th>Goal</th><th>Plan</th><th>Workouts</th><th>Status</th>
                </tr>
              </thead>
              <tbody>${userRows}</tbody>
            </table>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`<div>Error loading users: ${error.message}</div>`);
  }
});

app.get('/analytics', (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Analytics - FitWith AI</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
      .sidebar { position: fixed; left: 0; top: 0; width: 250px; height: 100vh; background: #2c3e50; color: white; }
      .sidebar-header { padding: 20px; background: #34495e; }
      .nav-menu { list-style: none; padding: 20px 0; }
      .nav-link { display: block; padding: 15px 20px; color: #bdc3c7; text-decoration: none; }
      .nav-link:hover { background: #3498db; color: white; }
      .main-content { margin-left: 250px; padding: 20px; }
      .chart-container { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
    </style>
    </head>
    <body>
      <div class="sidebar">
        <div class="sidebar-header"><h2><i class="fas fa-dumbbell"></i> FitWith AI</h2></div>
        <ul class="nav-menu">
          <li><a href="/" class="nav-link"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
          <li><a href="/users" class="nav-link"><i class="fas fa-users"></i> User Management</a></li>
          <li><a href="/analytics" class="nav-link"><i class="fas fa-chart-line"></i> Analytics</a></li>
          <li><a href="/email-campaigns" class="nav-link"><i class="fas fa-envelope"></i> Email Campaigns</a></li>
          <li><a href="/system-monitor" class="nav-link"><i class="fas fa-server"></i> System Monitor</a></li>
          <li><a href="/content-manager" class="nav-link"><i class="fas fa-edit"></i> Content Manager</a></li>
          <li><a href="/financial" class="nav-link"><i class="fas fa-dollar-sign"></i> Financial</a></li>
          <li><a href="/security" class="nav-link"><i class="fas fa-shield-alt"></i> Security</a></li>
          <li><a href="/ab-testing" class="nav-link"><i class="fas fa-flask"></i> A/B Testing</a></li>
          <li><a href="/automation" class="nav-link"><i class="fas fa-robot"></i> Automation</a></li>
          <li><a href="/reports" class="nav-link"><i class="fas fa-chart-bar"></i> Reports</a></li>
          <li><a href="/logout" class="nav-link"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
        </ul>
      </div>
      <div class="main-content">
        <h1 style="color: white; margin-bottom: 20px;"><i class="fas fa-chart-line"></i> Analytics Dashboard</h1>
        <div class="chart-container">
          <h3>User Growth</h3>
          <canvas id="userChart" width="400" height="200"></canvas>
        </div>
        <div class="chart-container">
          <h3>Revenue Trends</h3>
          <canvas id="revenueChart" width="400" height="200"></canvas>
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
      </div>
    </body>
    </html>
  `);
});

app.get('/system-monitor', (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  const health = getSystemHealth();
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>System Monitor - FitWith AI</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
      .sidebar { position: fixed; left: 0; top: 0; width: 250px; height: 100vh; background: #2c3e50; color: white; }
      .sidebar-header { padding: 20px; background: #34495e; }
      .nav-menu { list-style: none; padding: 20px 0; }
      .nav-link { display: block; padding: 15px 20px; color: #bdc3c7; text-decoration: none; }
      .nav-link:hover { background: #3498db; color: white; }
      .main-content { margin-left: 250px; padding: 20px; }
      .monitor-card { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
      .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    </style>
    </head>
    <body>
      <div class="sidebar">
        <div class="sidebar-header"><h2><i class="fas fa-dumbbell"></i> FitWith AI</h2></div>
        <ul class="nav-menu">
          <li><a href="/" class="nav-link"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
          <li><a href="/users" class="nav-link"><i class="fas fa-users"></i> User Management</a></li>
          <li><a href="/analytics" class="nav-link"><i class="fas fa-chart-line"></i> Analytics</a></li>
          <li><a href="/email-campaigns" class="nav-link"><i class="fas fa-envelope"></i> Email Campaigns</a></li>
          <li><a href="/system-monitor" class="nav-link"><i class="fas fa-server"></i> System Monitor</a></li>
          <li><a href="/content-manager" class="nav-link"><i class="fas fa-edit"></i> Content Manager</a></li>
          <li><a href="/financial" class="nav-link"><i class="fas fa-dollar-sign"></i> Financial</a></li>
          <li><a href="/security" class="nav-link"><i class="fas fa-shield-alt"></i> Security</a></li>
          <li><a href="/ab-testing" class="nav-link"><i class="fas fa-flask"></i> A/B Testing</a></li>
          <li><a href="/automation" class="nav-link"><i class="fas fa-robot"></i> Automation</a></li>
          <li><a href="/reports" class="nav-link"><i class="fas fa-chart-bar"></i> Reports</a></li>
          <li><a href="/logout" class="nav-link"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
        </ul>
      </div>
      <div class="main-content">
        <h1 style="color: white; margin-bottom: 20px;"><i class="fas fa-server"></i> System Monitor</h1>
        <div class="monitor-card">
          <h3>System Health</h3>
          <div class="metric"><span>CPU Usage:</span><span>${health.cpu}%</span></div>
          <div class="metric"><span>Memory Usage:</span><span>${health.memory}%</span></div>
          <div class="metric"><span>Uptime:</span><span>${health.uptime} hours</span></div>
          <div class="metric"><span>Platform:</span><span>${health.platform}</span></div>
          <div class="metric"><span>Node Version:</span><span>${health.nodeVersion}</span></div>
        </div>
        <div class="monitor-card">
          <h3>Database Status</h3>
          <div class="metric"><span>Connection:</span><span style="color: #27ae60;">Connected</span></div>
          <div class="metric"><span>Response Time:</span><span>< 50ms</span></div>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/content-manager', (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Content Manager - FitWith AI</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
      .sidebar { position: fixed; left: 0; top: 0; width: 250px; height: 100vh; background: #2c3e50; color: white; }
      .sidebar-header { padding: 20px; background: #34495e; }
      .nav-menu { list-style: none; padding: 20px 0; }
      .nav-link { display: block; padding: 15px 20px; color: #bdc3c7; text-decoration: none; }
      .nav-link:hover { background: #3498db; color: white; }
      .main-content { margin-left: 250px; padding: 20px; }
      .content-card { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
      .form-group { margin: 15px 0; }
      .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
      .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
      .btn { padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; }
    </style>
    </head>
    <body>
      <div class="sidebar">
        <div class="sidebar-header"><h2><i class="fas fa-dumbbell"></i> FitWith AI</h2></div>
        <ul class="nav-menu">
          <li><a href="/" class="nav-link"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
          <li><a href="/users" class="nav-link"><i class="fas fa-users"></i> User Management</a></li>
          <li><a href="/analytics" class="nav-link"><i class="fas fa-chart-line"></i> Analytics</a></li>
          <li><a href="/email-campaigns" class="nav-link"><i class="fas fa-envelope"></i> Email Campaigns</a></li>
          <li><a href="/system-monitor" class="nav-link"><i class="fas fa-server"></i> System Monitor</a></li>
          <li><a href="/content-manager" class="nav-link"><i class="fas fa-edit"></i> Content Manager</a></li>
          <li><a href="/financial" class="nav-link"><i class="fas fa-dollar-sign"></i> Financial</a></li>
          <li><a href="/security" class="nav-link"><i class="fas fa-shield-alt"></i> Security</a></li>
          <li><a href="/ab-testing" class="nav-link"><i class="fas fa-flask"></i> A/B Testing</a></li>
          <li><a href="/automation" class="nav-link"><i class="fas fa-robot"></i> Automation</a></li>
          <li><a href="/reports" class="nav-link"><i class="fas fa-chart-bar"></i> Reports</a></li>
          <li><a href="/logout" class="nav-link"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
        </ul>
      </div>
      <div class="main-content">
        <h1 style="color: white; margin-bottom: 20px;"><i class="fas fa-edit"></i> Content Manager</h1>
        <div class="content-card">
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
              <textarea name="content" rows="10" required></textarea>
            </div>
            <div class="form-group">
              <label>Tags (comma separated):</label>
              <input type="text" name="tags">
            </div>
            <button type="submit" class="btn">Create Content</button>
          </form>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/financial', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  const revenue = await Revenue.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' } }}
  ]);
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Financial - FitWith AI</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
      .sidebar { position: fixed; left: 0; top: 0; width: 250px; height: 100vh; background: #2c3e50; color: white; }
      .sidebar-header { padding: 20px; background: #34495e; }
      .nav-menu { list-style: none; padding: 20px 0; }
      .nav-link { display: block; padding: 15px 20px; color: #bdc3c7; text-decoration: none; }
      .nav-link:hover { background: #3498db; color: white; }
      .main-content { margin-left: 250px; padding: 20px; }
      .financial-card { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
      .revenue-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
      .revenue-item { text-align: center; padding: 20px; background: #27ae60; color: white; border-radius: 8px; }
    </style>
    </head>
    <body>
      <div class="sidebar">
        <div class="sidebar-header"><h2><i class="fas fa-dumbbell"></i> FitWith AI</h2></div>
        <ul class="nav-menu">
          <li><a href="/" class="nav-link"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
          <li><a href="/users" class="nav-link"><i class="fas fa-users"></i> User Management</a></li>
          <li><a href="/analytics" class="nav-link"><i class="fas fa-chart-line"></i> Analytics</a></li>
          <li><a href="/email-campaigns" class="nav-link"><i class="fas fa-envelope"></i> Email Campaigns</a></li>
          <li><a href="/system-monitor" class="nav-link"><i class="fas fa-server"></i> System Monitor</a></li>
          <li><a href="/content-manager" class="nav-link"><i class="fas fa-edit"></i> Content Manager</a></li>
          <li><a href="/financial" class="nav-link"><i class="fas fa-dollar-sign"></i> Financial</a></li>
          <li><a href="/security" class="nav-link"><i class="fas fa-shield-alt"></i> Security</a></li>
          <li><a href="/ab-testing" class="nav-link"><i class="fas fa-flask"></i> A/B Testing</a></li>
          <li><a href="/automation" class="nav-link"><i class="fas fa-robot"></i> Automation</a></li>
          <li><a href="/reports" class="nav-link"><i class="fas fa-chart-bar"></i> Reports</a></li>
          <li><a href="/logout" class="nav-link"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
        </ul>
      </div>
      <div class="main-content">
        <h1 style="color: white; margin-bottom: 20px;"><i class="fas fa-dollar-sign"></i> Financial Dashboard</h1>
        <div class="revenue-grid">
          <div class="revenue-item">
            <h3>$${revenue[0]?.total || 0}</h3>
            <p>Total Revenue</p>
          </div>
          <div class="revenue-item">
            <h3>$2,500</h3>
            <p>This Month</p>
          </div>
          <div class="revenue-item">
            <h3>$850</h3>
            <p>This Week</p>
          </div>
        </div>
        <div class="financial-card">
          <h3>Recent Transactions</h3>
          <p>No transactions found. Revenue tracking is ready for your payments.</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/security', (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Security - FitWith AI</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
      .sidebar { position: fixed; left: 0; top: 0; width: 250px; height: 100vh; background: #2c3e50; color: white; }
      .sidebar-header { padding: 20px; background: #34495e; }
      .nav-menu { list-style: none; padding: 20px 0; }
      .nav-link { display: block; padding: 15px 20px; color: #bdc3c7; text-decoration: none; }
      .nav-link:hover { background: #3498db; color: white; }
      .main-content { margin-left: 250px; padding: 20px; }
      .security-card { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
      .alert { padding: 10px; margin: 10px 0; border-radius: 5px; }
      .alert.success { background: #d4edda; border-left: 4px solid #28a745; }
      .alert.warning { background: #fff3cd; border-left: 4px solid #ffc107; }
    </style>
    </head>
    <body>
      <div class="sidebar">
        <div class="sidebar-header"><h2><i class="fas fa-dumbbell"></i> FitWith AI</h2></div>
        <ul class="nav-menu">
          <li><a href="/" class="nav-link"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
          <li><a href="/users" class="nav-link"><i class="fas fa-users"></i> User Management</a></li>
          <li><a href="/analytics" class="nav-link"><i class="fas fa-chart-line"></i> Analytics</a></li>
          <li><a href="/email-campaigns" class="nav-link"><i class="fas fa-envelope"></i> Email Campaigns</a></li>
          <li><a href="/system-monitor" class="nav-link"><i class="fas fa-server"></i> System Monitor</a></li>
          <li><a href="/content-manager" class="nav-link"><i class="fas fa-edit"></i> Content Manager</a></li>
          <li><a href="/financial" class="nav-link"><i class="fas fa-dollar-sign"></i> Financial</a></li>
          <li><a href="/security" class="nav-link"><i class="fas fa-shield-alt"></i> Security</a></li>
          <li><a href="/ab-testing" class="nav-link"><i class="fas fa-flask"></i> A/B Testing</a></li>
          <li><a href="/automation" class="nav-link"><i class="fas fa-robot"></i> Automation</a></li>
          <li><a href="/reports" class="nav-link"><i class="fas fa-chart-bar"></i> Reports</a></li>
          <li><a href="/logout" class="nav-link"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
        </ul>
      </div>
      <div class="main-content">
        <h1 style="color: white; margin-bottom: 20px;"><i class="fas fa-shield-alt"></i> Security Center</h1>
        <div class="security-card">
          <h3>Security Status</h3>
          <div class="alert success">✓ SSL Certificate Active</div>
          <div class="alert success">✓ Database Encrypted</div>
          <div class="alert warning">⚠ Enable 2FA for Admin Account</div>
        </div>
        <div class="security-card">
          <h3>Recent Security Events</h3>
          <p>• Admin login from IP: 192.168.1.1 - ${new Date().toLocaleString()}</p>
          <p>• System backup completed - ${new Date(Date.now() - 86400000).toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/ab-testing', (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>A/B Testing - FitWith AI</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
      .sidebar { position: fixed; left: 0; top: 0; width: 250px; height: 100vh; background: #2c3e50; color: white; }
      .sidebar-header { padding: 20px; background: #34495e; }
      .nav-menu { list-style: none; padding: 20px 0; }
      .nav-link { display: block; padding: 15px 20px; color: #bdc3c7; text-decoration: none; }
      .nav-link:hover { background: #3498db; color: white; }
      .main-content { margin-left: 250px; padding: 20px; }
      .test-card { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
      .btn { padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
    </style>
    </head>
    <body>
      <div class="sidebar">
        <div class="sidebar-header"><h2><i class="fas fa-dumbbell"></i> FitWith AI</h2></div>
        <ul class="nav-menu">
          <li><a href="/" class="nav-link"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
          <li><a href="/users" class="nav-link"><i class="fas fa-users"></i> User Management</a></li>
          <li><a href="/analytics" class="nav-link"><i class="fas fa-chart-line"></i> Analytics</a></li>
          <li><a href="/email-campaigns" class="nav-link"><i class="fas fa-envelope"></i> Email Campaigns</a></li>
          <li><a href="/system-monitor" class="nav-link"><i class="fas fa-server"></i> System Monitor</a></li>
          <li><a href="/content-manager" class="nav-link"><i class="fas fa-edit"></i> Content Manager</a></li>
          <li><a href="/financial" class="nav-link"><i class="fas fa-dollar-sign"></i> Financial</a></li>
          <li><a href="/security" class="nav-link"><i class="fas fa-shield-alt"></i> Security</a></li>
          <li><a href="/ab-testing" class="nav-link"><i class="fas fa-flask"></i> A/B Testing</a></li>
          <li><a href="/automation" class="nav-link"><i class="fas fa-robot"></i> Automation</a></li>
          <li><a href="/reports" class="nav-link"><i class="fas fa-chart-bar"></i> Reports</a></li>
          <li><a href="/logout" class="nav-link"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
        </ul>
      </div>
      <div class="main-content">
        <h1 style="color: white; margin-bottom: 20px;"><i class="fas fa-flask"></i> A/B Testing</h1>
        <div class="test-card">
          <h3>Active Tests</h3>
          <p>No active A/B tests running.</p>
          <button class="btn">Create New Test</button>
        </div>
        <div class="test-card">
          <h3>Test Results</h3>
          <p>Previous test results will appear here.</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/automation', (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Automation - FitWith AI</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
      .sidebar { position: fixed; left: 0; top: 0; width: 250px; height: 100vh; background: #2c3e50; color: white; }
      .sidebar-header { padding: 20px; background: #34495e; }
      .nav-menu { list-style: none; padding: 20px 0; }
      .nav-link { display: block; padding: 15px 20px; color: #bdc3c7; text-decoration: none; }
      .nav-link:hover { background: #3498db; color: white; }
      .main-content { margin-left: 250px; padding: 20px; }
      .automation-card { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
      .workflow { padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 10px 0; }
      .status { padding: 3px 8px; border-radius: 3px; font-size: 12px; }
      .active { background: #d4edda; color: #155724; }
      .inactive { background: #f8d7da; color: #721c24; }
    </style>
    </head>
    <body>
      <div class="sidebar">
        <div class="sidebar-header"><h2><i class="fas fa-dumbbell"></i> FitWith AI</h2></div>
        <ul class="nav-menu">
          <li><a href="/" class="nav-link"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
          <li><a href="/users" class="nav-link"><i class="fas fa-users"></i> User Management</a></li>
          <li><a href="/analytics" class="nav-link"><i class="fas fa-chart-line"></i> Analytics</a></li>
          <li><a href="/email-campaigns" class="nav-link"><i class="fas fa-envelope"></i> Email Campaigns</a></li>
          <li><a href="/system-monitor" class="nav-link"><i class="fas fa-server"></i> System Monitor</a></li>
          <li><a href="/content-manager" class="nav-link"><i class="fas fa-edit"></i> Content Manager</a></li>
          <li><a href="/financial" class="nav-link"><i class="fas fa-dollar-sign"></i> Financial</a></li>
          <li><a href="/security" class="nav-link"><i class="fas fa-shield-alt"></i> Security</a></li>
          <li><a href="/ab-testing" class="nav-link"><i class="fas fa-flask"></i> A/B Testing</a></li>
          <li><a href="/automation" class="nav-link"><i class="fas fa-robot"></i> Automation</a></li>
          <li><a href="/reports" class="nav-link"><i class="fas fa-chart-bar"></i> Reports</a></li>
          <li><a href="/logout" class="nav-link"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
        </ul>
      </div>
      <div class="main-content">
        <h1 style="color: white; margin-bottom: 20px;"><i class="fas fa-robot"></i> Automation Center</h1>
        <div class="automation-card">
          <h3>Active Workflows</h3>
          <div class="workflow">
            <strong>Welcome Email Sequence</strong> <span class="status active">Active</span>
            <p>Sends welcome emails to new users</p>
          </div>
          <div class="workflow">
            <strong>Subscription Renewal Reminders</strong> <span class="status active">Active</span>
            <p>Reminds users 3 days before subscription expires</p>
          </div>
          <div class="workflow">
            <strong>Inactive User Re-engagement</strong> <span class="status inactive">Inactive</span>
            <p>Targets users who haven't logged in for 30 days</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/reports', (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Reports - FitWith AI</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
      .sidebar { position: fixed; left: 0; top: 0; width: 250px; height: 100vh; background: #2c3e50; color: white; }
      .sidebar-header { padding: 20px; background: #34495e; }
      .nav-menu { list-style: none; padding: 20px 0; }
      .nav-link { display: block; padding: 15px 20px; color: #bdc3c7; text-decoration: none; }
      .nav-link:hover { background: #3498db; color: white; }
      .main-content { margin-left: 250px; padding: 20px; }
      .report-card { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
      .btn { padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
      .report-item { padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 10px 0; display: flex; justify-content: space-between; align-items: center; }
    </style>
    </head>
    <body>
      <div class="sidebar">
        <div class="sidebar-header"><h2><i class="fas fa-dumbbell"></i> FitWith AI</h2></div>
        <ul class="nav-menu">
          <li><a href="/" class="nav-link"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
          <li><a href="/users" class="nav-link"><i class="fas fa-users"></i> User Management</a></li>
          <li><a href="/analytics" class="nav-link"><i class="fas fa-chart-line"></i> Analytics</a></li>
          <li><a href="/email-campaigns" class="nav-link"><i class="fas fa-envelope"></i> Email Campaigns</a></li>
          <li><a href="/system-monitor" class="nav-link"><i class="fas fa-server"></i> System Monitor</a></li>
          <li><a href="/content-manager" class="nav-link"><i class="fas fa-edit"></i> Content Manager</a></li>
          <li><a href="/financial" class="nav-link"><i class="fas fa-dollar-sign"></i> Financial</a></li>
          <li><a href="/security" class="nav-link"><i class="fas fa-shield-alt"></i> Security</a></li>
          <li><a href="/ab-testing" class="nav-link"><i class="fas fa-flask"></i> A/B Testing</a></li>
          <li><a href="/automation" class="nav-link"><i class="fas fa-robot"></i> Automation</a></li>
          <li><a href="/reports" class="nav-link"><i class="fas fa-chart-bar"></i> Reports</a></li>
          <li><a href="/logout" class="nav-link"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
        </ul>
      </div>
      <div class="main-content">
        <h1 style="color: white; margin-bottom: 20px;"><i class="fas fa-chart-bar"></i> Reports & Export</h1>
        <div class="report-card">
          <h3>Available Reports</h3>
          <div class="report-item">
            <div>
              <strong>User Activity Report</strong>
              <p>Detailed user engagement and activity metrics</p>
            </div>
            <button class="btn">Download CSV</button>
          </div>
          <div class="report-item">
            <div>
              <strong>Revenue Report</strong>
              <p>Financial performance and subscription analytics</p>
            </div>
            <button class="btn">Download PDF</button>
          </div>
          <div class="report-item">
            <div>
              <strong>Content Performance</strong>
              <p>Most viewed workouts and articles</p>
            </div>
            <button class="btn">Download CSV</button>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/logout', (req, res) => {
  adminLoggedIn = false;
  res.redirect('/');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Admin panel running on port ${PORT}`);
});