/**
 * Admin Login Fix Script
 * This script ensures Super Admin and School Admin accounts exist in the dedicated Admin collection
 * with properly hashed passwords.
 * Run this if you're experiencing 401 Unauthorized errors when trying to login as an admin.
 * 
 * Usage:
 *   npm run fix-admin-login
 *   or
 *   node src/utils/fix-admin-login.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const Admin = require('../models/Admin');
const User = require('../models/User');
const School = require('../models/School');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/macvel_school';

// Default credentials
const DEFAULT_PASSWORD = 'macvel123';
const SUPER_ADMIN_EMAIL = 'macvel@school.com';
const SCHOOL_ADMIN_EMAIL = 'schooladmin@demo.school';

/**
 * Main fix function
 */
async function fixAdminLogin() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║        MACVEL School - Admin Login Fix Utility           ║');
  console.log('║        (Using dedicated Admin collection)                ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  let client;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB successfully!');
    console.log('');

    // Get or create a school for the School Admin
    let school = await School.findOne({ schoolCode: 'DEMO001' });
    if (!school) {
      console.log('📝 Creating Demo School...');
      school = new School({
        schoolName: 'Demo School',
        schoolCode: 'DEMO001',
        address: '123 Education Street',
        contactEmail: 'contact@demo.school',
        contactPhone: '+1-555-0123',
        status: 'Active'
      });
      await school.save();
      console.log('✅ Demo School created!');
    }

    // Fix Super Admin in Admin collection
    console.log('🔧 Checking Super Admin account in Admin collection...');
    let superAdmin = await Admin.findOne({ email: SUPER_ADMIN_EMAIL });
    
    if (superAdmin) {
      console.log(`   Found existing Super Admin: ${superAdmin.email}`);
      // Update password to ensure it's properly hashed
      superAdmin.password = DEFAULT_PASSWORD;
      superAdmin.isActive = true;
      superAdmin.role = 'Super Admin';
      await superAdmin.save();
      console.log('   ✅ Super Admin password updated and verified!');
    } else {
      console.log('   Creating new Super Admin in Admin collection...');
      superAdmin = new Admin({
        name: 'Super Admin',
        email: SUPER_ADMIN_EMAIL,
        password: DEFAULT_PASSWORD, // Will be hashed by pre-save hook
        role: 'Super Admin',
        phone: '+1-555-0001',
        isActive: true
      });
      await superAdmin.save();
      console.log('   ✅ Super Admin created in Admin collection!');
    }
    console.log('');

    // Fix School Admin in Admin collection
    console.log('🔧 Checking School Admin account in Admin collection...');
    let schoolAdmin = await Admin.findOne({ email: SCHOOL_ADMIN_EMAIL });
    
    if (schoolAdmin) {
      console.log(`   Found existing School Admin: ${schoolAdmin.email}`);
      // Update password to ensure it's properly hashed
      schoolAdmin.password = DEFAULT_PASSWORD;
      schoolAdmin.isActive = true;
      schoolAdmin.role = 'School Admin';
      schoolAdmin.schoolId = school._id;
      await schoolAdmin.save();
      console.log('   ✅ School Admin password updated and verified!');
    } else {
      console.log('   Creating new School Admin in Admin collection...');
      schoolAdmin = new Admin({
        name: 'School Admin',
        email: SCHOOL_ADMIN_EMAIL,
        password: DEFAULT_PASSWORD, // Will be hashed by pre-save hook
        role: 'School Admin',
        phone: '+1-555-0002',
        isActive: true,
        schoolId: school._id
      });
      await schoolAdmin.save();
      console.log('   ✅ School Admin created in Admin collection!');
    }
    console.log('');

    // Verify password hashing
    console.log('🔍 Verifying password hashing...');
    const freshSuperAdmin = await Admin.findOne({ email: SUPER_ADMIN_EMAIL }).select('+password');
    if (freshSuperAdmin && freshSuperAdmin.password) {
      const isValid = await bcrypt.compare(DEFAULT_PASSWORD, freshSuperAdmin.password);
      if (isValid) {
        console.log('   ✅ Password hashing verified! Login should now work.');
      } else {
        console.log('   ⚠️  Password verification failed. Please check the database.');
      }
    }
    console.log('');

    // Summary
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                      FIX COMPLETE                        ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log(`   Password: ${DEFAULT_PASSWORD}`);
    console.log('');
    console.log('📧 Admin Emails:');
    console.log(`   - Super Admin:  ${SUPER_ADMIN_EMAIL}`);
    console.log(`   - School Admin: ${SCHOOL_ADMIN_EMAIL}`);
    console.log('');
    console.log('📁 Admin accounts are stored in the dedicated "admins" collection.');
    console.log('   Student/Teacher/Parent accounts remain in the "users" collection.');
    console.log('');
    console.log('✅ Admin accounts are now ready for login!');
    console.log('');

  } catch (error) {
    console.error('❌ Error during fix:', error.message);
    console.error('');
    console.error('Full error details:');
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed.');
    }
  }
}

// Run the fix script
console.log('🚀 Starting admin login fix...\n');
fixAdminLogin();