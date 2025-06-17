const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      // MongoDB connection string from environment variable
      const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URL;
      
      if (!mongoURI) {
        throw new Error('MongoDB connection string not found. Please set MONGODB_URI in your .env file');
      }
      
      console.log('Connecting to MongoDB Atlas...');
      console.log(`Connection URI: ${mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials in logs
      
      // Mongoose connection options optimized for MongoDB Atlas
      const options = {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds (Atlas needs more time)
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
        heartbeatFrequencyMS: 10000, // Send a ping to check server every 10 seconds
       
      };

      this.connection = await mongoose.connect(mongoURI, options);
      
      console.log('✅ MongoDB Atlas connected successfully');
      console.log(`📍 Database: ${this.connection.connection.name}`);
      console.log(`🌐 Host: ${this.connection.connection.host}`);
      console.log(`🔗 Connection State: ${this.connection.connection.readyState}`);
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });

      mongoose.connection.on('connecting', () => {
        console.log('🔄 MongoDB connecting...');
      });

      mongoose.connection.on('connected', () => {
        console.log('🔗 MongoDB connected');
      });

      return this.connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      
      // Provide helpful error messages for common Atlas issues
      if (error.message.includes('authentication failed')) {
        console.log('\n💡 Authentication Error - Check:');
        console.log('1. Username and password in connection string');
        console.log('2. Database user permissions in MongoDB Atlas');
        console.log('3. Make sure the user has read/write access to the database\n');
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        console.log('\n💡 Network Error - Check:');
        console.log('1. Internet connection');
        console.log('2. Network Access settings in MongoDB Atlas');
        console.log('3. Add your IP address to the whitelist');
        console.log('4. Or use 0.0.0.0/0 to allow all IPs (not recommended for production)\n');
      } else if (error.message.includes('ENOTFOUND')) {
        console.log('\n💡 DNS Error - Check:');
        console.log('1. Connection string format');
        console.log('2. Cluster name and region');
        console.log('3. Internet connectivity\n');
      }
      
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        console.log('📴 MongoDB disconnected');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
    }
  }

  // Get connection status
  getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    return {
      status: states[mongoose.connection.readyState],
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  // Health check method
  async healthCheck() {
    try {
      const status = this.getConnectionStatus();
      if (status.status === 'connected') {
        // Try a simple operation to verify connection
        await mongoose.connection.db.admin().ping();
        return { healthy: true, ...status };
      }
      return { healthy: false, ...status };
    } catch (error) {
      return { 
        healthy: false, 
        error: error.message,
        status: this.getConnectionStatus()
      };
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;