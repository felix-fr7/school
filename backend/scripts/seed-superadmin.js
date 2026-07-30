/**
 * SUPER_ADMIN Seed Script
 * Creates the initial SUPER_ADMIN user for MACVEL School Management
 * 
 * Usage:
 *   npm run seed:superadmin
 *   or
 *   node scripts/seed-superadmin.js
 */

require('dotenv').config({ path: '../.env' });
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Database connection configuration with SSL
// Using the same SSL configuration as backend/src/config/db.js
// ssl.rejectUnauthorized: false handles Supabase self-signed certificates
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Additional pool settings
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// SUPER_ADMIN credentials
const SUPER_ADMIN = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'superadmin@macvelschool.com',
  name: 'Super Admin',
  password: 'admin123',
  role: 'SUPER_ADMIN',
  tenant_id: null
};

async function seedSuperAdmin() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Connecting to database...');
    await client.query('SELECT NOW()');
    console.log('✅ Connected to database successfully!');

    // Generate bcrypt hash for the password
    console.log('🔐 Generating password hash...');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(SUPER_ADMIN.password, saltRounds);
    console.log(`✅ Password hashed: ${passwordHash.substring(0, 20)}...`);

    // Check if SUPER_ADMIN already exists
    console.log('🔍 Checking for existing SUPER_ADMIN...');
    const existingUser = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [SUPER_ADMIN.email]
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  SUPER_ADMIN user already exists!');
      console.log('📝 Updating existing user...');
      
      await client.query(
        `UPDATE users 
         SET name = $1, password_hash = $2, role = $3, tenant_id = $4, is_active = true, updated_at = NOW()
         WHERE email = $5`,
        [SUPER_ADMIN.name, passwordHash, SUPER_ADMIN.role, SUPER_ADMIN.tenant_id, SUPER_ADMIN.email]
      );
      
      console.log('✅ SUPER_ADMIN user updated successfully!');
    } else {
      console.log('📝 Creating new SUPER_ADMIN user...');
      
      await client.query(
        `INSERT INTO users (id, email, name, password_hash, role, tenant_id, is_active, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, true, NOW(), NOW())`,
        [
          SUPER_ADMIN.id,
          SUPER_ADMIN.email,
          SUPER_ADMIN.name,
          passwordHash,
          SUPER_ADMIN.role,
          SUPER_ADMIN.tenant_id
        ]
      );
      
      console.log('✅ SUPER_ADMIN user created successfully!');
    }

    // Verify the user was created/updated
    console.log('🔍 Verifying SUPER_ADMIN user...');
    const verifiedUser = await client.query(
      `SELECT id, email, name, role, tenant_id, is_active, created_at 
       FROM users WHERE email = $1`,
      [SUPER_ADMIN.email]
    );

    if (verifiedUser.rows.length > 0) {
      const user = verifiedUser.rows[0];
      console.log('\n📋 SUPER_ADMIN User Details:');
      console.log('┌─────────────────────────────────────────────────────┐');
      console.log(`│ Email:        ${user.email.padEnd(42)}│`);
      console.log(`│ Name:         ${user.name.padEnd(42)}│`);
      console.log(`│ Role:         ${user.role.padEnd(42)}│`);
      console.log(`│ Tenant ID:    ${(user.tenant_id || 'NULL').padEnd(42)}│`);
      console.log(`│ Is Active:    ${String(user.is_active).padEnd(42)}│`);
      console.log(`│ Created:      ${new Date(user.created_at).toLocaleString().padEnd(42)}│`);
      console.log('└─────────────────────────────────────────────────────┘');
      console.log('\n🔑 Login Credentials:');
      console.log(`   Email:    ${SUPER_ADMIN.email}`);
      console.log(`   Password: ${SUPER_ADMIN.password}`);
      console.log('\n✅ Seed completed successfully!');
    } else {
      console.log('❌ Failed to verify SUPER_ADMIN user creation!');
    }

  } catch (error) {
    console.error('❌ Error seeding SUPER_ADMIN:', error.message);
    
    // Provide specific help for SSL errors
    if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      console.error('\n🔒 SSL Certificate Error Detected!');
      console.error('   The server certificate is self-signed.');
      console.error('   Solution: Ensure ssl.rejectUnauthorized is set to false in the connection config.');
      console.error('   Current config: ssl: { rejectUnauthorized: false }');
    }
    
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed script
console.log('🚀 Starting SUPER_ADMIN seed script...\n');
console.log('🔒 SSL Configuration: rejectUnauthorized = false (for Supabase compatibility)');
console.log('');
seedSuperAdmin();