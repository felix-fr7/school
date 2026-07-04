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
const pool = new Pool({
  connectionString,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 10000, // How long to wait when connecting a new client
});

// Event handlers for pool monitoring
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute a raw SQL query with parameters
 * @param {string} text - SQL query text with placeholders ($1, $2, etc.)
 * @param {Array} params - Array of parameters to bind to the query
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.log('Slow query:', { text, duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    // Enhanced error logging with database host info
    console.error('═══════════════════════════════════════════════════════════');
    console.error('DATABASE QUERY ERROR');
    console.error(`Database Host: ${dbHostInfo}:${dbPortInfo}`);
    console.error(`Database User: ${dbUserInfo}`);
    console.error(`Error Code: ${error.code || 'N/A'}`);
    console.error(`Error Message: ${error.message}`);
    if (error.detail) console.error(`Detail: ${error.detail}`);
    if (error.hint) console.error(`Hint: ${error.hint}`);
    console.error('═══════════════════════════════════════════════════════════');
    throw error;
  }
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