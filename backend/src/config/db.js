/**
 * Database Configuration
 * PostgreSQL connection pool (Supabase compatible)
 * Supports both connection string and individual env variables
 * 
 * SSL Configuration:
 * - Uses ssl: { rejectUnauthorized: false } to handle Supabase self-signed certificates
 * - This prevents SELF_SIGNED_CERT_IN_CHAIN errors while maintaining encrypted connection
 */

const { Pool } = require('pg');

// Check if DATABASE_URL is provided (Supabase connection string)
const connectionString = process.env.DATABASE_URL;

// SSL configuration for Supabase
// Supabase uses self-signed certificates which cause SELF_SIGNED_CERT_IN_CHAIN errors
// Setting rejectUnauthorized: false allows the connection while still using SSL encryption
const sslConfig = {
  rejectUnauthorized: false
};

// Database configuration - support both connection string and individual vars
const dbConfig = connectionString
  ? {
      connectionString,
      ssl: sslConfig,
      // Additional pool settings for better connection management
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: sslConfig
    };

console.log('[DB] Database configuration:', 
  connectionString 
    ? `Using DATABASE_URL with SSL (rejectUnauthorized: false)` 
    : `Host: ${dbConfig.host}:${dbConfig.port}, User: ${dbConfig.user}, SSL: ${dbConfig.ssl ? 'enabled' : 'disabled'}`
);

// Create connection pool
let pool = null;

const getDb = () => {
  if (!pool) {
    pool = new Pool(dbConfig);
    console.log('[DB] PostgreSQL pool created successfully with SSL configuration');
    
    // Handle pool events for debugging
    pool.on('connect', () => {
      console.log('[DB] New client connected to PostgreSQL');
    });
    
    pool.on('error', (err) => {
      console.error('[DB] Unexpected PostgreSQL pool error:', err);
    });
  }
  return pool;
};

// Test database connection with detailed error reporting
const testConnection = async () => {
  const client = await getDb().connect();
  try {
    console.log('[DB] Testing PostgreSQL connection...');
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('[DB] PostgreSQL connection successful!');
    console.log('[DB] Server time:', result.rows[0].current_time);
    console.log('[DB] Server version:', result.rows[0].version);
    return true;
  } catch (error) {
    console.error('[DB] PostgreSQL connection failed:', error.message);
    if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      console.error('[DB] SSL Certificate Error: The server certificate is self-signed.');
      console.error('[DB] Solution: Ensure ssl.rejectUnauthorized is set to false in db config.');
    }
    return false;
  } finally {
    client.release();
  }
};

// Execute query with error handling
const query = async (sql, params = []) => {
  try {
    const result = await getDb().query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('[DB] PostgreSQL query error:', {
      message: error.message,
      code: error.code,
      sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
      params: params ? params.length : 0
    });
    throw error;
  }
};

// Transaction helper with proper error handling
const transaction = async (callback) => {
  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DB] Transaction failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Close pool gracefully
const closePool = async () => {
  if (pool) {
    console.log('[DB] Closing PostgreSQL pool...');
    await pool.end();
    pool = null;
    console.log('[DB] PostgreSQL pool closed');
  }
};

// Export configuration for external use (e.g., seed scripts)
const config = dbConfig;

module.exports = {
  getDb,
  query,
  testConnection,
  transaction,
  closePool,
  config
};