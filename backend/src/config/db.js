/**
 * Database Configuration
 * MongoDB connection using Mongoose
 * Supports MongoDB Atlas connection
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/macvel_school';

// Connection state
let isConnected = false;

/**
 * Connect to MongoDB database
 * Uses mongoose connection with proper error handling
 */
const connectDB = async () => {
  if (isConnected) {
    console.log('[DB] Using existing MongoDB connection');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    isConnected = true;
    console.log('[DB] MongoDB connected successfully');
    console.log(`[DB] Connection host: ${mongoose.connection.host || 'Atlas'}`);
    console.log(`[DB] Database name: ${mongoose.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('[DB] MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[DB] MongoDB disconnected');
      isConnected = false;
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await closeDB();
      process.exit(0);
    });

  } catch (error) {
    console.error('[DB] MongoDB connection failed:', error.message);
    throw error;
  }
};

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    await connectDB();
    console.log('[DB] MongoDB connection test successful!');
    return true;
  } catch (error) {
    console.error('[DB] MongoDB connection test failed:', error.message);
    return false;
  }
};

/**
 * Close database connection gracefully
 */
const closeDB = async () => {
  if (isConnected) {
    console.log('[DB] Closing MongoDB connection...');
    await mongoose.connection.close();
    isConnected = false;
    console.log('[DB] MongoDB connection closed');
  }
};

/**
 * Get mongoose connection instance
 */
const getConnection = () => {
  return mongoose.connection;
};

/**
 * Check if database is connected
 */
const isDBConnected = () => {
  return isConnected && mongoose.connection.readyState === 1;
};

module.exports = {
  connectDB,
  testConnection,
  closeDB,
  getConnection,
  isDBConnected,
  mongoose
};