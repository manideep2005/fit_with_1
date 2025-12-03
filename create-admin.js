#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Create super admin
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

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ 
      $or: [{ username: adminData.username }, { email: adminData.email }] 
    });

    if (existingAdmin) {
      console.log('Admin already exists!');
      console.log('Username:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
    } else {
      const admin = new Admin(adminData);
      await admin.save();
      
      console.log('✅ Admin created successfully!');
      console.log('Username:', adminData.username);
      console.log('Email:', adminData.email);
      console.log('Password:', adminData.password);
      console.log('Role:', adminData.role);
    }

    console.log('\n🔗 Admin Panel Access:');
    console.log('URL: http://localhost:3009/admin/login');
    console.log('Username: admin');
    console.log('Email: admin@localhost.com');
    console.log('Password: admin123');
    console.log('\n🔧 Direct Access (bypass login):');
    console.log('URL: http://localhost:3009/admin/direct-login');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();