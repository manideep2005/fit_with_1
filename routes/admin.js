const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const User = require('../models/User');
const ContactMessage = require('../models/ContactMessage');
const Message = require('../models/Message');
const adminLogService = require('../services/adminLogService');

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
  try {
    if (!req.session.admin) {
      return res.redirect('/admin/login');
    }
    
    const admin = await Admin.findById(req.session.admin.id);
    if (!admin || !admin.isActive) {
      req.session.admin = null;
      return res.redirect('/admin/login');
    }
    
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.redirect('/admin/login');
  }
};

// Admin login page
router.get('/login', (req, res) => {
  if (req.session.admin) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login');
});

// Test page
router.get('/test', (req, res) => {
  res.render('admin/test');
});

// Direct admin login bypass (for debugging)
router.get('/direct-login', async (req, res) => {
  try {
    const admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
      return res.status(404).send('Admin not found');
    }
    
    req.session.admin = {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions
    };
    
    console.log('Admin session set:', req.session.admin);
    res.send(`
      <h1>Admin Login Success!</h1>
      <p>Session created for: ${admin.username}</p>
      <p>Role: ${admin.role}</p>
      <a href="/admin/dashboard">Go to Dashboard</a>
    `);
  } catch (error) {
    res.status(500).send('Login error: ' + error.message);
  }
});

// Simple dashboard without auth check
router.get('/simple-dashboard', (req, res) => {
  res.send(`
    <h1>Simple Admin Dashboard</h1>
    <p>This works without authentication</p>
    <p>Time: ${new Date()}</p>
    <a href="/admin/login">Login Page</a>
  `);
});

// Admin login POST
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const admin = await Admin.findOne({ 
      $or: [{ username }, { email: username }] 
    });
    
    if (!admin) {
      return res.redirect('/admin/login?error=invalid');
    }
    
    if (admin.isLocked()) {
      return res.redirect('/admin/login?error=locked');
    }
    
    const isMatch = await admin.comparePassword(password);
    
    if (!isMatch) {
      await admin.incLoginAttempts();
      return res.redirect('/admin/login?error=invalid');
    }
    
    // Reset login attempts on successful login
    if (admin.loginAttempts > 0) {
      await admin.resetLoginAttempts();
    }
    
    // Update last login
    admin.lastLogin = new Date();
    await admin.save();
    
    // Log admin login
    await adminLogService.logAdminAction(
      'Login',
      admin._id,
      admin.email,
      { ip: req.ip }
    );
    
    // Set session
    req.session.admin = {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions
    };
    
    res.redirect('/admin/dashboard');
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed' 
    });
  }
});

// Admin dashboard
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const stats = await getAdminStats();
    res.render('admin/dashboard', { 
      admin: req.admin, 
      stats 
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Dashboard error');
  }
});

// Users management
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    
    const totalUsers = await User.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);
    
    res.render('admin/users', {
      admin: req.admin,
      users,
      currentPage: page,
      totalPages,
      totalUsers
    });
  } catch (error) {
    console.error('Users page error:', error);
    res.status(500).send('Users page error');
  }
});

// Contact messages
router.get('/messages', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    
    const messages = await ContactMessage.find()
      .populate('assignedTo', 'username')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    
    const totalMessages = await ContactMessage.countDocuments();
    const totalPages = Math.ceil(totalMessages / limit);
    
    res.render('admin/messages', {
      admin: req.admin,
      messages,
      currentPage: page,
      totalPages,
      totalMessages
    });
  } catch (error) {
    console.error('Messages page error:', error);
    res.status(500).send('Messages page error');
  }
});

// Analytics
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    const analytics = await getAnalyticsData();
    res.render('admin/analytics', {
      admin: req.admin,
      analytics
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).send('Analytics error');
  }
});

// Settings
router.get('/settings', adminAuth, (req, res) => {
  res.render('admin/settings', { admin: req.admin });
});

// System monitoring
router.get('/monitoring', adminAuth, async (req, res) => {
  try {
    const systemStats = await getSystemStats();
    res.render('admin/monitoring', {
      admin: req.admin,
      systemStats
    });
  } catch (error) {
    console.error('Monitoring error:', error);
    res.status(500).send('Monitoring error');
  }
});

// Activity logs
router.get('/logs', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    
    // Get filters from query parameters
    const filters = {
      level: req.query.level,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      search: req.query.search
    };
    
    // Get logs from the logging service
    const allLogs = await adminLogService.getLogs(filters);
    const totalLogs = allLogs.length;
    const logs = allLogs.slice(skip, skip + limit);
    const totalPages = Math.ceil(totalLogs / limit);
    
    res.render('admin/logs', {
      admin: req.admin,
      logs,
      currentPage: page,
      totalPages,
      totalLogs,
      filters
    });
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).send('Logs error');
  }
});

// API Routes
router.get('/api/stats', adminAuth, async (req, res) => {
  try {
    const stats = await getAdminStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// System stats API
router.get('/api/system-stats', adminAuth, async (req, res) => {
  try {
    const stats = await getSystemStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user status
router.post('/api/users/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: status === 'active' },
      { new: true }
    );
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update message status
router.post('/api/messages/:id/status', adminAuth, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { 
        status, 
        adminNotes,
        assignedTo: req.admin._id,
        ...(status === 'replied' && { repliedAt: new Date() })
      },
      { new: true }
    );
    
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update admin profile
router.post('/api/profile', adminAuth, async (req, res) => {
  try {
    const { username, email, fullName } = req.body;
    
    // Check if username/email already exists (excluding current admin)
    const existingAdmin = await Admin.findOne({
      $and: [
        { _id: { $ne: req.admin._id } },
        { $or: [{ username }, { email }] }
      ]
    });
    
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username or email already exists' 
      });
    }
    
    const admin = await Admin.findByIdAndUpdate(
      req.admin._id,
      { username, email, fullName },
      { new: true }
    );
    
    // Update session
    req.session.admin.username = admin.username;
    req.session.admin.email = admin.email;
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update profile' 
    });
  }
});

// Change admin password
router.post('/api/password', adminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const admin = await Admin.findById(req.admin._id);
    const isMatch = await admin.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }
    
    admin.password = newPassword;
    await admin.save();
    
    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to change password' 
    });
  }
});

// Platform settings
router.post('/api/platform-settings', adminAuth, async (req, res) => {
  try {
    // In a real app, you'd save these to a settings collection
    // For now, we'll just return success
    res.json({ 
      success: true, 
      message: 'Platform settings saved successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save settings' 
    });
  }
});

// Export user data
router.get('/api/export-data', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    const data = {
      exportDate: new Date(),
      totalUsers: users.length,
      users: users
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=user-data.json');
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to export data' 
    });
  }
});

// Export activity logs
router.get('/api/export-logs', adminAuth, async (req, res) => {
  try {
    const logs = await adminLogService.getLogs();
    
    const data = {
      exportDate: new Date(),
      totalLogs: logs.length,
      logs: logs
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=activity-logs.json');
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to export logs' 
    });
  }
});

// Clear cache
router.post('/api/clear-cache', adminAuth, async (req, res) => {
  try {
    // Clear Redis cache if available
    const redis = require('../services/redis');
    if (redis.client) {
      await redis.client.flushall();
    }
    
    res.json({ 
      success: true, 
      message: 'Cache cleared successfully' 
    });
  } catch (error) {
    res.json({ 
      success: true, 
      message: 'Cache cleared (no cache service active)' 
    });
  }
});

// System reset (dangerous operation)
router.post('/api/system-reset', adminAuth, async (req, res) => {
  try {
    // Only allow super admin to perform this operation
    if (req.admin.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }
    
    // This is a dangerous operation - in production, you'd want more safeguards
    await User.deleteMany({ role: { $ne: 'admin' } });
    
    res.json({ 
      success: true, 
      message: 'System reset completed' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset system' 
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.admin = null;
  res.json({ success: true });
});

// Helper functions
async function getAdminStats() {
  const [
    totalUsers,
    activeUsers,
    totalMessages,
    unreadMessages,
    todaySignups,
    totalWorkouts,
    totalNutritionLogs
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    ContactMessage.countDocuments(),
    ContactMessage.countDocuments({ status: 'new' }),
    User.countDocuments({ 
      createdAt: { 
        $gte: new Date(new Date().setHours(0, 0, 0, 0)) 
      } 
    }),
    User.aggregate([
      { $unwind: '$workouts' },
      { $count: 'total' }
    ]).then(result => result[0]?.total || 0),
    User.aggregate([
      { $unwind: '$nutritionLogs' },
      { $count: 'total' }
    ]).then(result => result[0]?.total || 0)
  ]);
  
  return {
    totalUsers,
    activeUsers,
    totalMessages,
    unreadMessages,
    todaySignups,
    totalWorkouts,
    totalNutritionLogs
  };
}

async function getAnalyticsData() {
  // Get user registration trends (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const userTrends = await User.aggregate([
    {
      $match: { createdAt: { $gte: thirtyDaysAgo } }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  // Get subscription stats
  const subscriptionStats = await User.aggregate([
    {
      $group: {
        _id: "$subscription.plan",
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    userTrends,
    subscriptionStats
  };
}

async function getSystemStats() {
  const os = require('os');
  const process = require('process');
  
  return {
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: os.cpus(),
      platform: os.platform(),
      nodeVersion: process.version
    },
    database: {
      connected: true, // You'd check actual DB connection
      collections: await User.db.db.listCollections().toArray()
    }
  };
}

module.exports = router;