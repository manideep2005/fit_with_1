#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

async function resetAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Delete all existing admins
    await Admin.deleteMany({});
    console.log('✅ Deleted all existing admin accounts');

    // Create new admin
    const adminData = {
      username: 'admin',
      email: 'admin@localhost.com',
      password: 'admin123',
      role: 'super_admin',
      permissions: [
        'users_view', 'users_edit', 'users_delete',
        'content_view', 'content_edit', 'content_delete',
        'analytics_view', 'system_settings', 'admin_manage'
      ]
    };

    const admin = new Admin(adminData);
    await admin.save();
    
    console.log('✅ New admin created successfully!');
    console.log('Username:', adminData.username);
    console.log('Email:', adminData.email);
    console.log('Password:', adminData.password);
    console.log('Role:', adminData.role);

    console.log('\n🔗 Admin Panel Access:');
    console.log('URL: http://localhost:3009/admin/login');
    console.log('Direct: http://localhost:3009/admin/direct-login');

    process.exit(0);
  } catch (error) {
    console.error('Error resetting admin:', error);
    process.exit(1);
  }
}

resetAdmin();