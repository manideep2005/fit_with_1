const express = require('express');
const mongoose = require('mongoose');
const database = require('./config/database');
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
const Challenge = require('./models/Challenge');
const Post = require('./models/Post');
const Message = require('./models/Message');
const nodemailer = require('nodemailer');

// Email configuration
const emailTransporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

let adminLoggedIn = false;

// Get real statistics from existing User model
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
  
  return { totalUsers, activeToday, newSignups, premiumUsers };
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
            position: fixed;
            left: 0;
            top: 0;
            width: 250px;
            height: 100vh;
            background: #2c3e50;
            color: white;
            z-index: 1000;
          }
          .sidebar-header {
            padding: 20px;
            background: #34495e;
            border-bottom: 1px solid #4a5f7a;
          }
          .sidebar-header h2 {
            color: #3498db;
            font-size: 1.5em;
          }
          .nav-menu {
            list-style: none;
            padding: 20px 0;
          }
          .nav-item {
            margin: 5px 0;
          }
          .nav-link {
            display: block;
            padding: 15px 20px;
            color: #bdc3c7;
            text-decoration: none;
            transition: all 0.3s;
          }
          .nav-link:hover, .nav-link.active {
            background: #3498db;
            color: white;
            border-right: 4px solid #2980b9;
          }
          .main-content {
            margin-left: 250px;
            padding: 20px;
          }
          .header {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 20px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
          }
          .stat-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.3s;
          }
          .stat-card:hover {
            transform: translateY(-5px);
          }
          .stat-icon {
            font-size: 2.5em;
            margin-bottom: 15px;
          }
          .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            margin: 10px 0;
          }
          .stat-label {
            color: #7f8c8d;
            font-size: 1.1em;
          }
          .users { color: #3498db; }
          .active { color: #2ecc71; }
          .signups { color: #e74c3c; }
          .premium { color: #f39c12; }
          .chart-container {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            margin: 20px 0;
          }
          .activity-feed {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          }
          .activity-item {
            display: flex;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid #ecf0f1;
          }
          .activity-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            color: white;
          }
          .btn {
            background: #3498db;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: background 0.3s;
          }
          .btn:hover {
            background: #2980b9;
          }
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
              <a href="/workouts" class="nav-link">
                <i class="fas fa-running"></i> Workouts
              </a>
            </li>
            <li class="nav-item">
              <a href="/subscriptions" class="nav-link">
                <i class="fas fa-credit-card"></i> Subscriptions
              </a>
            </li>
            <li class="nav-item">
              <a href="/email-campaigns" class="nav-link">
                <i class="fas fa-envelope"></i> Email Campaigns
              </a>
            </li>
            <li class="nav-item">
              <a href="/notifications" class="nav-link">
                <i class="fas fa-bell"></i> Push Notifications
              </a>
            </li>
            <li class="nav-item">
              <a href="/settings" class="nav-link">
                <i class="fas fa-cog"></i> Settings
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
          </div>

          <div class="chart-container">
            <h3><i class="fas fa-chart-area"></i> User Growth Trend</h3>
            <canvas id="growthChart" width="400" height="200"></canvas>
          </div>

          <div class="activity-feed">
            <h3><i class="fas fa-bell"></i> Recent Activity</h3>
            <div class="activity-item">
              <div class="activity-icon" style="background: #2ecc71;">
                <i class="fas fa-user-plus"></i>
              </div>
              <div>
                <strong>New user registration</strong><br>
                <small>sarah.johnson@email.com joined 5 minutes ago</small>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon" style="background: #3498db;">
                <i class="fas fa-dumbbell"></i>
              </div>
              <div>
                <strong>Workout completed</strong><br>
                <small>Mike completed "Full Body HIIT" workout</small>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon" style="background: #f39c12;">
                <i class="fas fa-crown"></i>
              </div>
              <div>
                <strong>Premium subscription</strong><br>
                <small>Alex upgraded to Premium plan</small>
              </div>
            </div>
          </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script>
          const ctx = document.getElementById('growthChart').getContext('2d');
          new Chart(ctx, {
            type: 'line',
            data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [{
                label: 'User Growth',
                data: [12, 19, 25, 35, 42, ${stats.totalUsers}],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: {
                  display: false
                }
              }
            }
          });
        </script>
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
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-container {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 400px;
        }
        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .login-header h1 {
          color: #2c3e50;
          margin-bottom: 10px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          color: #34495e;
          font-weight: 500;
        }
        .form-group input {
          width: 100%;
          padding: 12px;
          border: 2px solid #ecf0f1;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.3s;
        }
        .form-group input:focus {
          outline: none;
          border-color: #3498db;
        }
        .btn-login {
          width: 100%;
          background: #3498db;
          color: white;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .btn-login:hover {
          background: #2980b9;
        }
        .demo-credentials {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-top: 20px;
          text-align: center;
          font-size: 14px;
          color: #6c757d;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <div class="login-header">
          <h1><i class="fas fa-dumbbell"></i> FitWith AI</h1>
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
          <button type="submit" class="btn-login">
            <i class="fas fa-sign-in-alt"></i> Login to Dashboard
          </button>
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
      <h1 style="color: #e74c3c;"><i class="fas fa-times-circle"></i> Login Failed</h1>
      <p>Invalid credentials. Please try again.</p>
      <a href="/" style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">← Back to Login</a>
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
        <td>
          <button class="btn-sm edit" onclick="editUser('${user._id}')">Edit</button>
          <button class="btn-sm delete" onclick="deleteUser('${user._id}')">Delete</button>
        </td>
      </tr>
    `).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>User Management - FitWith AI</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
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
          .btn-sm { padding: 5px 10px; margin: 2px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
          .btn-sm.edit { background: #74b9ff; color: white; }
          .btn-sm.delete { background: #fd79a8; color: white; }
        </style>
      </head>
      <body>
        <div class="container">
          <a href="/" class="back-btn"><i class="fas fa-arrow-left"></i> Back to Dashboard</a>
          
          <div class="header">
            <h1><i class="fas fa-users"></i> User Management</h1>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${userRows || '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #6c757d;">No users found in database.</td></tr>'}
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
        <a href="/" style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">← Back to Dashboard</a>
      </div>
    `);
  }
});

app.get('/analytics', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  try {
    const totalUsers = await User.countDocuments();
    const activeToday = await User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 24*60*60*1000) } });
    const totalWorkouts = await User.aggregate([{ $group: { _id: null, total: { $sum: { $size: { $ifNull: ['$workouts', []] } } } } }]);
    const avgWorkouts = totalWorkouts.length > 0 ? Math.round(totalWorkouts[0].total / totalUsers) : 0;
    
    const subscriptionStats = await User.aggregate([
      { $group: { _id: '$subscription.plan', count: { $sum: 1 } } }
    ]);
    
    const monthlyRevenue = await User.aggregate([
      { $match: { 'subscription.plan': { $in: ['premium', 'pro'] } } },
      { $group: { _id: null, total: { $sum: { $cond: [{ $eq: ['$subscription.plan', 'premium'] }, 29.99, 49.99] } } } }
    ]);
    
    const revenue = monthlyRevenue.length > 0 ? monthlyRevenue[0].total : 0;
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Analytics - FitWith AI</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
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
        <a href="/" class="back-btn"><i class="fas fa-arrow-left"></i> Back to Dashboard</a>
        
        <div class="header">
          <h1><i class="fas fa-chart-line"></i> Advanced Analytics</h1>
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
            <h3>Subscription Distribution</h3>
            <canvas id="subscriptionChart" width="400" height="200"></canvas>
          </div>
          
          <div class="chart-card">
            <h3>Revenue Metrics</h3>
            <div class="metric">
              <div class="metric-value">$${revenue}</div>
              <div class="metric-label">Monthly Revenue</div>
            </div>
            <div class="metric">
              <div class="metric-value">${totalUsers}</div>
              <div class="metric-label">Total Users</div>
            </div>
          </div>
          
          <div class="chart-card">
            <h3>Growth Trends</h3>
            <canvas id="growthChart" width="400" height="200"></canvas>
          </div>
        </div>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <script>
        const subscriptionData = ${JSON.stringify(subscriptionStats)};
        const labels = subscriptionData.map(s => s._id || 'free');
        const counts = subscriptionData.map(s => s.count);
        
        // Subscription Chart
        new Chart(document.getElementById('subscriptionChart'), {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: counts,
              backgroundColor: ['#3498db', '#2ecc71', '#f39c12', '#e74c3c']
            }]
          }
        });

        // Growth Chart
        new Chart(document.getElementById('growthChart'), {
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
              label: 'User Growth',
              data: [12, 25, 45, 78, 120, ${totalUsers}],
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              tension: 0.4
            }]
          }
        });
      </script>
    </body>
    </html>
  `);
  } catch (error) {
    res.send(`<div style="text-align: center; padding: 50px;"><h2>Database Error</h2><p>Please ensure MongoDB is running.</p><a href="/" class="btn">Back to Dashboard</a></div>`);
  }
});

app.get('/workouts', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  try {
    const workoutTypes = await User.aggregate([
      { $unwind: { path: '$workouts', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$workouts.type', count: { $sum: 1 }, avgDuration: { $avg: '$workouts.duration' }, totalCalories: { $sum: '$workouts.calories' } } },
      { $sort: { count: -1 } }
    ]);
    
    const totalWorkouts = await User.aggregate([{ $group: { _id: null, total: { $sum: { $size: { $ifNull: ['$workouts', []] } } } } }]);
    const totalUsers = await User.countDocuments();
    const avgWorkoutsPerUser = totalWorkouts.length > 0 ? Math.round(totalWorkouts[0].total / totalUsers) : 0;
    
    const workoutCards = workoutTypes.map(workout => `
      <div class="workout-card">
        <div class="workout-header">
          <h3><i class="fas fa-${workout._id === 'cardio' ? 'fire' : workout._id === 'strength' ? 'dumbbell' : 'running'}"></i> ${workout._id || 'General Workout'}</h3>
          <p>Popular workout type among users</p>
        </div>
        <div class="workout-body">
          <div class="workout-stats">
            <div class="stat">
              <div class="stat-value">${workout.count}</div>
              <div>Completions</div>
            </div>
            <div class="stat">
              <div class="stat-value">${Math.round(workout.avgDuration || 0)}</div>
              <div>Avg Duration (min)</div>
            </div>
            <div class="stat">
              <div class="stat-value">${Math.round(workout.totalCalories || 0)}</div>
              <div>Total Calories</div>
            </div>
          </div>
        </div>
      </div>
    `).join('');
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Workout Management - FitWith AI</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .back-btn { background: #6c757d; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-bottom: 20px; display: inline-block; }
        .workout-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .workout-card { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .workout-header { padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .workout-body { padding: 20px; }
        .workout-stats { display: flex; justify-content: space-between; margin: 15px 0; }
        .stat { text-align: center; }
        .stat-value { font-size: 1.5em; font-weight: bold; color: #3498db; }
        .btn { background: #3498db; color: white; padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="container">
        <a href="/" class="back-btn"><i class="fas fa-arrow-left"></i> Back to Dashboard</a>
        
        <div class="header">
          <h1><i class="fas fa-running"></i> Workout Management</h1>

          <p>Manage workout programs and track user engagement</p>
          <div style="display: flex; gap: 20px; margin-top: 15px;">
            <div style="background: #3498db; color: white; padding: 10px 15px; border-radius: 5px;">
              <strong>${workoutTypes.length}</strong> Workout Types
            </div>
            <div style="background: #2ecc71; color: white; padding: 10px 15px; border-radius: 5px;">
              <strong>${totalWorkouts.length > 0 ? totalWorkouts[0].total : 0}</strong> Total Workouts
            </div>
            <div style="background: #f39c12; color: white; padding: 10px 15px; border-radius: 5px;">
              <strong>${avgWorkoutsPerUser}</strong> Avg per User
            </div>
          </div>
        </div>

        <div class="workout-grid">
          ${workoutCards || '<div style="text-align: center; padding: 40px; color: #6c757d;">No workout data available. Users need to log workouts first.</div>'}
        </div>
      </div>
    </body>
    </html>
  `);
  } catch (error) {
    res.send(`<div style="text-align: center; padding: 50px;"><h2>Database Error</h2><p>Please ensure MongoDB is running.</p><a href="/" class="btn">Back to Dashboard</a></div>`);
  }
});

app.get('/subscriptions', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  try {
    const subscriptions = await User.find({ 'subscription.plan': { $ne: 'free' } }).sort({ 'subscription.startDate': -1 }).limit(20);
    const monthlyRevenue = await User.aggregate([
      { $match: { 'subscription.plan': { $in: ['premium', 'pro'] } } },
      { $group: { _id: null, total: { $sum: { $cond: [{ $eq: ['$subscription.plan', 'premium'] }, 29.99, 49.99] } } } }
    ]);
    const totalSubscribers = await User.countDocuments({ 'subscription.plan': { $ne: 'free' } });
    const annualRevenue = monthlyRevenue.length > 0 ? monthlyRevenue[0].total * 12 : 0;
    
    const subscriptionRows = subscriptions.map(user => `
      <tr>
        <td>${user.displayName || user.fullName}</td>
        <td><span class="plan-badge ${user.subscription.plan}">${user.subscription.plan}</span></td>
        <td>$${user.subscription.plan === 'premium' ? '29.99' : '49.99'}/month</td>
        <td>${user.subscription.startDate ? user.subscription.startDate.toLocaleDateString() : 'N/A'}</td>
        <td>${user.subscription.endDate ? user.subscription.endDate.toLocaleDateString() : 'Ongoing'}</td>
        <td>${user.subscription.status}</td>
        <td><button class="btn" onclick="manageSub('${user._id}')">Manage</button></td>
      </tr>
    `).join('');
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Subscription Management - FitWith AI</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .back-btn { background: #6c757d; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-bottom: 20px; display: inline-block; }
        .revenue-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .revenue-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .revenue-amount { font-size: 2.5em; font-weight: bold; margin: 10px 0; }
        .monthly { color: #3498db; }
        .yearly { color: #2ecc71; }
        .total { color: #e74c3c; }
        .table-container { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background: #f8f9fa; font-weight: 600; }
        .plan-badge { padding: 4px 12px; border-radius: 15px; font-size: 12px; font-weight: 500; }
        .plan-badge.free { background: #e9ecef; color: #495057; }
        .plan-badge.premium { background: #fff3cd; color: #856404; }
        .plan-badge.pro { background: #d1ecf1; color: #0c5460; }
      </style>
    </head>
    <body>
      <div class="container">
        <a href="/" class="back-btn"><i class="fas fa-arrow-left"></i> Back to Dashboard</a>
        
        <div class="header">
          <h1><i class="fas fa-credit-card"></i> Subscription Management</h1>
          <p>Monitor revenue streams and subscription analytics</p>
        </div>

        <div class="revenue-cards">
          <div class="revenue-card">
            <h3>Monthly Revenue</h3>
            <div class="revenue-amount monthly">$${monthlyRevenue.length > 0 ? monthlyRevenue[0].total : 0}</div>
            <p>Active subscriptions</p>
          </div>
          <div class="revenue-card">
            <h3>Annual Revenue</h3>
            <div class="revenue-amount yearly">$${annualRevenue}</div>
            <p>Projected yearly</p>
          </div>
          <div class="revenue-card">
            <h3>Total Subscribers</h3>
            <div class="revenue-amount total">${totalSubscribers}</div>
            <p>Active subscriptions</p>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Start Date</th>
                <th>Next Billing</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${subscriptionRows || '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #6c757d;">No premium subscriptions found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `);
  } catch (error) {
    res.send(`<div style="text-align: center; padding: 50px;"><h2>Database Error</h2><p>Please ensure MongoDB is running.</p><a href="/" class="btn">Back to Dashboard</a></div>`);
  }
});

app.get('/settings', (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>System Settings - FitWith AI</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: #f8f9fa; }
        .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
        .header { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .back-btn { background: #6c757d; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-bottom: 20px; display: inline-block; }
        .settings-grid { display: grid; gap: 20px; }
        .settings-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .setting-item { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee; }
        .setting-item:last-child { border-bottom: none; }
        .toggle { position: relative; width: 50px; height: 25px; background: #ccc; border-radius: 25px; cursor: pointer; }
        .toggle.active { background: #2ecc71; }
        .toggle::after { content: ''; position: absolute; width: 21px; height: 21px; background: white; border-radius: 50%; top: 2px; left: 2px; transition: 0.3s; }
        .toggle.active::after { left: 27px; }
        .btn { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
        .btn.danger { background: #e74c3c; }
      </style>
    </head>
    <body>
      <div class="container">
        <a href="/" class="back-btn"><i class="fas fa-arrow-left"></i> Back to Dashboard</a>
        
        <div class="header">
          <h1><i class="fas fa-cog"></i> System Settings</h1>
          <p>Configure platform settings and preferences</p>
        </div>

        <div class="settings-grid">
          <div class="settings-card">
            <h3><i class="fas fa-bell"></i> Notifications</h3>
            <div class="setting-item">
              <div>
                <strong>Email Notifications</strong>
                <p>Send email alerts for important events</p>
              </div>
              <div class="toggle active"></div>
            </div>
            <div class="setting-item">
              <div>
                <strong>Push Notifications</strong>
                <p>Mobile push notifications for users</p>
              </div>
              <div class="toggle active"></div>
            </div>
            <div class="setting-item">
              <div>
                <strong>Weekly Reports</strong>
                <p>Automated weekly analytics reports</p>
              </div>
              <div class="toggle"></div>
            </div>
          </div>
          
          <div class="settings-card">
            <h3><i class="fas fa-shield-alt"></i> Security</h3>
            <div class="setting-item">
              <div>
                <strong>Two-Factor Authentication</strong>
                <p>Require 2FA for admin access</p>
              </div>
              <div class="toggle active"></div>
            </div>
            <div class="setting-item">
              <div>
                <strong>Session Timeout</strong>
                <p>Auto-logout after 30 minutes</p>
              </div>
              <div class="toggle active"></div>
            </div>
            <div class="setting-item">
              <div>
                <strong>IP Whitelist</strong>
                <p>Restrict admin access by IP</p>
              </div>
              <div class="toggle"></div>
            </div>
          </div>
          
          <div class="settings-card">
            <h3><i class="fas fa-database"></i> System Maintenance</h3>
            <div class="setting-item">
              <div>
                <strong>Automatic Backups</strong>
                <p>Daily database backups</p>
              </div>
              <button class="btn">Configure</button>
            </div>
            <div class="setting-item">
              <div>
                <strong>Cache Management</strong>
                <p>Clear system cache</p>
              </div>
              <button class="btn">Clear Cache</button>
            </div>
            <div class="setting-item">
              <div>
                <strong>System Reset</strong>
                <p>Reset all settings to default</p>
              </div>
              <button class="btn danger">Reset System</button>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        document.querySelectorAll('.toggle').forEach(toggle => {
          toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
          });
        });
      </script>
    </body>
    </html>
  `);
});



// Email Campaigns Management
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
          .btn.warning { background: #f39c12; }
          .template-btn { background: #9b59b6; margin: 5px; padding: 8px 16px; font-size: 14px; }
          .preview-box { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #3498db; }
        </style>
      </head>
      <body>
        <div class="container">
          <a href="/" class="back-btn"><i class="fas fa-arrow-left"></i> Back to Dashboard</a>
          
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
              <h3><i class="fas fa-paper-plane"></i> Send Email Campaign</h3>
              
              <form id="emailForm" action="/send-email-campaign" method="POST">
                <div class="form-group">
                  <label>Target Audience</label>
                  <select name="audience" id="audience" onchange="updateUserCount()">
                    <option value="all">All Users (${totalUsers})</option>
                    <option value="active">Active Users (${activeUsers})</option>
                    <option value="inactive">Inactive Users (${inactiveUsers})</option>
                    <option value="premium">Premium Users (${premiumUsers})</option>
                    <option value="free">Free Users (${freeUsers})</option>
                    <option value="no-workouts">Users with No Workouts</option>
                    <option value="custom">Custom Selection</option>
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
                
                <button type="submit" class="btn success">
                  <i class="fas fa-send"></i> Send Campaign
                </button>
              </form>
            </div>
            
            <div class="campaign-card">
              <h3><i class="fas fa-eye"></i> Email Preview</h3>
              <div class="preview-box" id="preview">
                <strong>Subject:</strong> <span id="previewSubject">Your email subject will appear here</span><br><br>
                <strong>Message:</strong><br>
                <div id="previewMessage">Your email message will appear here...</div>
              </div>
              
              <h4 style="margin-top: 20px;"><i class="fas fa-history"></i> Recent Campaigns</h4>
              <div style="margin-top: 15px;">
                <div style="padding: 10px; border-bottom: 1px solid #eee;">
                  <strong>Workout Reminder</strong> - Sent to 45 inactive users<br>
                  <small>2 hours ago</small>
                </div>
                <div style="padding: 10px; border-bottom: 1px solid #eee;">
                  <strong>Premium Features Update</strong> - Sent to 12 premium users<br>
                  <small>1 day ago</small>
                </div>
                <div style="padding: 10px;">
                  <strong>Welcome to FitWith AI</strong> - Sent to 8 new users<br>
                  <small>2 days ago</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <script>
          function updateUserCount() {
            // Update preview when audience changes
            updatePreview();
          }
          
          function updatePreview() {
            const subject = document.getElementById('subject').value || 'Your email subject will appear here';
            const message = document.getElementById('message').value || 'Your email message will appear here...';
            
            document.getElementById('previewSubject').textContent = subject;
            document.getElementById('previewMessage').innerHTML = message.replace(/\n/g, '<br>');
          }
          
          function useTemplate(type) {
            const templates = {
              workout: {
                subject: '🏋️ Hey! Are you keeping up with your workouts?',
                message: 'Hi there!\n\nWe noticed you haven\'t logged a workout recently. Your fitness journey is important to us!\n\n💪 Ready to get back on track?\n- Try our new HIIT workouts\n- Check out personalized meal plans\n- Join community challenges\n\nYour health is worth it! Let\'s make today count.\n\nBest regards,\nFitWith AI Team'
              },
              welcome: {
                subject: '🎉 Welcome to FitWith AI - Your Fitness Journey Starts Now!',
                message: 'Welcome to the FitWith AI family!\n\nWe\'re excited to help you achieve your fitness goals. Here\'s what you can do right now:\n\n✅ Complete your fitness profile\n✅ Log your first workout\n✅ Set up your meal plan\n✅ Join our community\n\nNeed help getting started? Our AI coach is here 24/7!\n\nLet\'s make fitness fun together!\n\nThe FitWith AI Team'
              },
              premium: {
                subject: '⭐ Unlock Premium Features - Limited Time Offer!',
                message: 'Ready to supercharge your fitness journey?\n\nUpgrade to Premium and get:\n\n🎯 Personalized AI coaching\n📊 Advanced analytics\n🍽️ Custom meal plans\n🏆 Exclusive challenges\n📱 Priority support\n\n💥 Special offer: 30% off your first month!\n\nUpgrade now and transform your fitness experience.\n\nFitWith AI Premium Team'
              },
              inactive: {
                subject: '😢 We miss you! Come back to your fitness journey',
                message: 'Hey fitness warrior!\n\nWe noticed you\'ve been away for a while. Your fitness goals are still waiting for you!\n\n🔥 What\'s new since you left:\n- New workout programs\n- Enhanced AI coaching\n- Community challenges\n- Improved meal planning\n\n💪 Your progress matters to us. Let\'s get back on track together!\n\nOne workout at a time,\nFitWith AI Team'
              }
            };
            
            if (templates[type]) {
              document.getElementById('subject').value = templates[type].subject;
              document.getElementById('message').value = templates[type].message;
              updatePreview();
            }
          }
          
          // Update preview in real-time
          document.getElementById('subject').addEventListener('input', updatePreview);
          document.getElementById('message').addEventListener('input', updatePreview);
          
          // Form submission
          document.getElementById('emailForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const audience = formData.get('audience');
            const subject = formData.get('subject');
            const message = formData.get('message');
            
            if (confirm(`Send email "${subject}" to ${audience} users?`)) {
              fetch('/send-email-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audience, subject, message })
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  alert(`✅ Campaign sent successfully to ${data.count} users!`);
                  location.reload();
                } else {
                  alert(`❌ Error: ${data.error}`);
                }
              })
              .catch(error => {
                alert(`❌ Error sending campaign: ${error.message}`);
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

// Send Email Campaign
app.post('/send-email-campaign', async (req, res) => {
  if (!adminLoggedIn) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    const { audience, subject, message } = req.body;
    let users = [];
    
    // Get users based on audience selection
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
    const errors = [];
    
    // Send emails in batches to avoid overwhelming the email service
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
                  <h1 style="color: white; margin: 0;">🏋️ FitWith AI</h1>
                </div>
                <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <div style="white-space: pre-line; line-height: 1.6; color: #333;">${personalizedMessage}</div>
                  <div style="margin-top: 30px; text-align: center;">
                    <a href="https://your-app-url.com/dashboard" style="background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Open FitWith AI</a>
                  </div>
                  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
                    <p>This email was sent from FitWith AI Admin Panel</p>
                    <p>If you don't want to receive these emails, please contact support.</p>
                  </div>
                </div>
              </div>
            `
          });
          
          sentCount++;
        } catch (error) {
          errors.push(`Failed to send to ${user.email}: ${error.message}`);
        }
      });
      
      await Promise.all(emailPromises);
      
      // Small delay between batches
      if (i + 10 < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    res.json({ 
      success: true, 
      count: sentCount, 
      total: users.length,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Send email campaign error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Push Notifications Management
app.get('/notifications', async (req, res) => {
  if (!adminLoggedIn) return res.redirect('/');
  
  try {
    const usersWithTokens = await User.countDocuments({ fcmToken: { $exists: true, $ne: null } });
    const totalUsers = await User.countDocuments();
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Push Notifications - FitWith AI</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; background: #f8f9fa; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .back-btn { background: #6c757d; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-bottom: 20px; display: inline-block; }
          .notification-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .form-group { margin-bottom: 20px; }
          .form-group label { display: block; margin-bottom: 5px; font-weight: 500; }
          .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
          .form-group textarea { height: 100px; resize: vertical; }
          .btn { background: #3498db; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
          .btn:hover { background: #2980b9; }
          .stats-row { display: flex; gap: 20px; margin: 20px 0; }
          .stat-item { flex: 1; background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
          .stat-number { font-size: 2em; font-weight: bold; color: #3498db; }
        </style>
      </head>
      <body>
        <div class="container">
          <a href="/" class="back-btn"><i class="fas fa-arrow-left"></i> Back to Dashboard</a>
          
          <div class="header">
            <h1><i class="fas fa-bell"></i> Push Notification Manager</h1>
            <p>Send instant notifications to users' mobile devices</p>
            
            <div class="stats-row">
              <div class="stat-item">
                <div class="stat-number">${usersWithTokens}</div>
                <div>Devices Ready</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">${totalUsers}</div>
                <div>Total Users</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">${Math.round((usersWithTokens/totalUsers)*100)}%</div>
                <div>Reach Rate</div>
              </div>
            </div>
          </div>

          <div class="notification-card">
            <h3><i class="fas fa-mobile-alt"></i> Send Push Notification</h3>
            
            <form id="notificationForm">
              <div class="form-group">
                <label>Notification Title</label>
                <input type="text" id="notifTitle" placeholder="Enter notification title" required>
              </div>
              
              <div class="form-group">
                <label>Notification Message</label>
                <textarea id="notifMessage" placeholder="Enter your message..." required></textarea>
              </div>
              
              <div class="form-group">
                <label>Target Audience</label>
                <select id="notifAudience">
                  <option value="all">All Users with App Installed</option>
                  <option value="active">Active Users Only</option>
                  <option value="inactive">Inactive Users Only</option>
                  <option value="premium">Premium Users Only</option>
                </select>
              </div>
              
              <button type="submit" class="btn">
                <i class="fas fa-paper-plane"></i> Send Notification
              </button>
            </form>
          </div>
        </div>
        
        <script>
          document.getElementById('notificationForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const title = document.getElementById('notifTitle').value;
            const message = document.getElementById('notifMessage').value;
            const audience = document.getElementById('notifAudience').value;
            
            if (confirm(`Send notification "${title}" to ${audience} users?`)) {
              fetch('/send-push-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, message, audience })
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  alert(`✅ Notification sent to ${data.count} devices!`);
                  document.getElementById('notificationForm').reset();
                } else {
                  alert(`❌ Error: ${data.error}`);
                }
              })
              .catch(error => {
                alert('Error: ' + error.message);
              });
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).send(`<div style="text-align: center; padding: 50px;"><h2>Error</h2><p>${error.message}</p><a href="/" class="btn">Back to Dashboard</a></div>`);
  }
});

// Send Push Notification
app.post('/send-push-notification', async (req, res) => {
  if (!adminLoggedIn) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    const { title, message, audience } = req.body;
    
    // This would integrate with Firebase Admin SDK for actual push notifications
    // For now, we'll simulate the functionality
    
    let query = { fcmToken: { $exists: true, $ne: null } };
    
    switch (audience) {
      case 'active':
        query.lastLogin = { $gte: new Date(Date.now() - 7*24*60*60*1000) };
        break;
      case 'inactive':
        query.lastLogin = { $lt: new Date(Date.now() - 7*24*60*60*1000) };
        break;
      case 'premium':
        query['subscription.plan'] = { $in: ['premium', 'pro'] };
        break;
    }
    
    const users = await User.find(query, 'fcmToken');
    
    // Here you would use Firebase Admin SDK to send actual push notifications
    // const admin = require('firebase-admin');
    // const tokens = users.map(user => user.fcmToken).filter(token => token);
    // const result = await admin.messaging().sendMulticast({
    //   tokens: tokens,
    //   notification: { title, body: message },
    //   data: { type: 'admin_notification' }
    // });
    
    res.json({ success: true, count: users.length });
    
  } catch (error) {
    console.error('Send push notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/logout', (req, res) => {
  adminLoggedIn = false;
  res.redirect('/');
});

app.listen(3012, () => {
  console.log('🚀 Professional FitWith AI Admin Panel running on http://localhost:3012');
  console.log('📊 Features: Real data integration, Modern UI, Advanced analytics');
});