/**
 * Database Connection Configuration using node-postgres (pg)
 * 
 * This module provides a connection pool for connecting to Supabase PostgreSQL.
 * It uses the DATABASE_URL or DIRECT_DATABASE_URL environment variable.
 */

const { Pool } = require('pg');

// Get database URL from environment variables
// Prefer DATABASE_URL, fallback to DIRECT_DATABASE_URL
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;
const usedEnvVar = process.env.DATABASE_URL ? 'DATABASE_URL' : 'DIRECT_DATABASE_URL';

// Parse connection info for logging
let dbHostInfo = 'UNKNOWN';
let dbPortInfo = 'UNKNOWN';
let dbUserInfo = 'UNKNOWN';

if (!connectionString) {
  console.warn('Warning: No DATABASE_URL or DIRECT_DATABASE_URL found. Database connections will fail.');
} else {
  // Parse the connection string to extract host information for logging
  try {
    const url = new URL(connectionString);
    dbHostInfo = url.hostname;
    dbPortInfo = url.port;
    dbUserInfo = url.username;
    
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║           DATABASE CONNECTION CONFIGURATION              ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║ Using: ${usedEnvVar.padEnd(50)}║`);
    console.log(`║ Host: ${dbHostInfo.padEnd(50)}║`);
    console.log(`║ Port: ${dbPortInfo.padEnd(50)}║`);
    console.log(`║ User: ${dbUserInfo.padEnd(50)}║`);
    const isPooler = dbHostInfo.includes('pooler.supabase.com');
    console.log(`║ Supabase Pooler: ${isPooler ? 'YES' : 'NO'}${' '.repeat(39 - String(isPooler ? 'YES' : 'NO').length)}║`);
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
  } catch (parseError) {
    console.log(`Database URL configured (parsing failed: ${parseError.message})`);
  }
}

// Create a connection pool with configuration
// Optimized for Supabase Transaction Pooler (port 6543) and cross-region latency
const pool = new Pool({
  connectionString,
  // Connection pool settings - optimized for Supabase transaction pooler mode
  max: 20, // Increased for better concurrency
  idleTimeoutMillis: 30000, // Standard idle timeout
  connectionTimeoutMillis: 10000, // Connection timeout
  // Important for Supabase transaction pooler mode:
  // Disable prepared statements (transaction pooler doesn't support them)
  // Note: This is handled in query() below
  // Application name for better monitoring
  application_name: 'school-backend',
});

// Event handlers for pool monitoring (only log in development)
pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Connected to PostgreSQL database');
  }
});

pool.on('acquire', () => {
  // Connection acquired from pool - silent in production
});

pool.on('remove', () => {
  // Connection removed from pool - silent in production
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute a raw SQL query with parameters
 * Includes retry logic for transient connection errors
 * Disables prepared statements for Supabase transaction pooler compatibility
 * @param {string} text - SQL query text with placeholders ($1, $2, etc.)
 * @param {Array} params - Array of parameters to bind to the query
 * @param {number} retries - Number of retry attempts for transient errors (default: 2)
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params, retries = 2) => {
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const start = Date.now();
    try {
      // Important: Disable prepared statements for Supabase transaction pooler mode
      // The pooler doesn't support named prepared statements, so we use nameless ones
      const result = await pool.query({ text, values: params, name: undefined });
      const duration = Date.now() - start;
      
      // Log slow queries in development
      if (process.env.NODE_ENV === 'development' && duration > 1000) {
        console.log('Slow query:', { text, duration, rows: result.rowCount, attempt });
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Only retry on transient connection errors
      const isTransientError = 
        error.code === '08006' ||  // connection_failure
        error.code === '08003' ||  // connection_does_not_exist
        error.code === '08000' ||  // connection_exception
        error.code === '57014' ||  // query_canceled (timeout)
        error.message.includes('Connection terminated') ||
        error.message.includes('Connection timeout') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT');
      
      if (isTransientError && attempt < retries) {
        // Exponential backoff: 100ms, 200ms, 400ms...
        const delay = Math.min(100 * Math.pow(2, attempt), 1000);
        console.log(`Query retry ${attempt + 1}/${retries} after ${delay}ms (transient error: ${error.code || error.message})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Log error on final attempt
      if (attempt === retries) {
        console.error('═══════════════════════════════════════════════════════════');
        console.error('DATABASE QUERY ERROR (after ${retries + 1} attempts)');
        console.error(`Database Host: ${dbHostInfo}:${dbPortInfo}`);
        console.error(`Database User: ${dbUserInfo}`);
        console.error(`Error Code: ${error.code || 'N/A'}`);
        console.error(`Error Message: ${error.message}`);
        if (error.detail) console.error(`Detail: ${error.detail}`);
        if (error.hint) console.error(`Hint: ${error.hint}`);
        console.error('═══════════════════════════════════════════════════════════');
      }
    }
  }
  
  throw lastError;
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>} Database client
 */
const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);
  
  // Override release to handle errors
  client.release = () => {
    client.query = originalQuery;
    client.release = originalRelease;
    return client.release();
  };
  
  return client;
};

/**
 * Run a transaction with multiple queries
 * @param {Function} callback - Async function that receives a query function
 * @returns {Promise<any>} Result from the callback
 */
const transaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client.query.bind(client));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Close the database connection pool
 * Use this for graceful shutdown
 */
const close = async () => {
  await pool.end();
  console.log('Database connection pool closed');
};

module.exports = {
  pool,
  query,
  getClient,
  transaction,
  close,
};