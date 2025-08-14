const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      if (this.connection && this.connection.readyState === 1) {
        console.log('✅ Database already connected');
        return this.connection;
      }

      console.log('Connecting to MongoDB Atlas...');
      
      const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
      if (!uri) {
        throw new Error('MongoDB URI not found in environment variables');
      }

      console.log('Connection URI:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

      const options = {
        maxPoolSize: process.env.VERCEL ? 5 : 10,
        serverSelectionTimeoutMS: process.env.VERCEL ? 5000 : 10000,
        socketTimeoutMS: process.env.VERCEL ? 20000 : 45000,
        connectTimeoutMS: process.env.VERCEL ? 5000 : 10000,
        heartbeatFrequencyMS: 10000,
      };

      this.connection = await mongoose.connect(uri, options);
      
      console.log('✅ MongoDB connected successfully');
      console.log(`📍 Database: ${mongoose.connection.name}`);
      console.log(`🌐 Host: ${mongoose.connection.host}`);
      
      // Set up event handlers
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });

      return this.connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.connection = null;
        console.log('📴 MongoDB disconnected');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
    }
  }

  getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      status: mongoose.connection.readyState ? states[mongoose.connection.readyState] : 'not_initialized',
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      port: mongoose.connection.port
    };
  }

  async healthCheck() {
    try {
      if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        return {
          healthy: false,
          status: 'disconnected',
          error: 'Database not connected'
        };
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      
      return {
        healthy: true,
        status: 'connected',
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        uptime: process.uptime()
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'error',
        error: error.message
      };
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;