/**
 * Database Seeding Script
 * Populates MongoDB with initial mock/default data for testing
 * 
 * Usage:
 *   npm run seed
 *   or
 *   node src/utils/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User');
const Admin = require('../models/Admin');
const School = require('../models/School');
const Tenant = require('../models/Tenant');
const Class = require('../models/Class');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/macvel_school';

// Default credentials
const DEFAULT_PASSWORD = 'macvel123'; // Default password for all seeded users
const SUPER_ADMIN_EMAIL = 'macvel@school.com';
const SCHOOL_ADMIN_EMAIL = 'schooladmin@demo.school';
const TEACHER_EMAIL = 'teacher@demo.school';
const STUDENT_EMAIL = 'student@demo.school';
const PARENT_EMAIL = 'parent@demo.school';

/**
 * Main seeding function
 */
async function seedDatabase() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║        MACVEL School Management - Database Seeder        ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB successfully!');
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host || 'Atlas'}`);
    console.log('');

    // Check if data already exists
    console.log('🔍 Checking for existing data...');
    const existingSchools = await School.countDocuments();
    const existingTenants = await Tenant.countDocuments();
    const existingUsers = await User.countDocuments();
    const existingAdmins = await Admin.countDocuments();
    const existingClasses = await Class.countDocuments();
    
    const totalRecords = existingSchools + existingTenants + existingUsers + existingAdmins + existingClasses;
    
    if (totalRecords > 0) {
      console.log('⚠️  Database already contains data:');
      console.log(`   - Schools: ${existingSchools}`);
      console.log(`   - Tenants: ${existingTenants}`);
      console.log(`   - Users: ${existingUsers}`);
      console.log(`   - Admins: ${existingAdmins}`);
      console.log(`   - Classes: ${existingClasses}`);
      console.log('');
      console.log('🧹 Clearing existing demo data for fresh seed...');
      
      // Clear all collections including Admin
      await Admin.deleteMany({});
      await User.deleteMany({});
      await Class.deleteMany({});
      await School.deleteMany({});
      await Tenant.deleteMany({});
      
      console.log('✅ Existing data cleared successfully.');
      console.log('');
    }

    console.log('✅ Proceeding with seeding...');
    console.log('');

    // 1. Create Tenant
    console.log('📝 Creating Tenant...');
    const tenantData = {
      name: 'Demo School',
      domainSlug: 'demo-school',
      code: 'DEMO001',
      address: '123 Education Street, Knowledge City, Learning State 12345',
      phone: '+1-555-0123',
      email: 'info@demo.school',
      schoolLogoUrl: 'https://via.placeholder.com/150x150?text=Demo+School',
      subscriptionPlan: 'PREMIUM',
      maxUsers: 500,
      maxStudents: 2000,
      status: 'ACTIVE',
      settings: {
        academicYear: '2024-2025',
        timezone: 'Asia/Kolkata',
        language: 'English',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        features: {
          multiTenant: true,
          classBasedLogin: true,
          fileStorage: true
        }
      }
    };
    
    const tenant = await Tenant.create(tenantData);
    console.log('✅ Tenant created successfully!');
    console.log('');

    // 2. Create School
    console.log('📝 Creating School...');
    const schoolData = {
      schoolName: 'Demo School',
      schoolCode: 'DEMO001',
      address: '123 Education Street, Knowledge City, Learning State 12345',
      contactEmail: 'contact@demo.school',
      contactPhone: '+1-555-0123',
      status: 'Active',
      subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      settings: {
        academicYear: '2024-2025',
        timezone: 'Asia/Kolkata',
        language: 'English',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY'
      }
    };
    
    const school = await School.create(schoolData);
    console.log('✅ School created successfully!');
    console.log('');

    // 3. Create Admins (Super Admin & School Admin in Admin Collection)
    console.log('📝 Creating Admins in Admin Collection...');
    
    const superAdminData = {
      name: 'Super Admin',
      email: SUPER_ADMIN_EMAIL,
      password: DEFAULT_PASSWORD, // Pre-save hook will hash this
      role: 'Super Admin',
      phone: '+1-555-0001',
      isActive: true
    };
    await Admin.create(superAdminData);
    console.log(`✅ Super Admin created: ${SUPER_ADMIN_EMAIL} / ${DEFAULT_PASSWORD}`);

    const schoolAdminData = {
      name: 'School Admin',
      email: SCHOOL_ADMIN_EMAIL,
      password: DEFAULT_PASSWORD,
      role: 'School Admin',
      schoolId: school._id,
      phone: '+1-555-0002',
      isActive: true
    };
    await Admin.create(schoolAdminData);
    console.log(`✅ School Admin created: ${SCHOOL_ADMIN_EMAIL} / ${DEFAULT_PASSWORD}`);
    console.log('');

    // 4. Create Teacher, Student, Parent in User Collection
    console.log('📝 Creating regular Users (Teacher, Student, Parent)...');
    
    const teacherData = {
      name: 'John Teacher',
      email: TEACHER_EMAIL,
      password: DEFAULT_PASSWORD,
      role: 'Teacher',
      schoolId: school._id,
      phone: '+1-555-0003',
      isActive: true,
      gender: 'Male',
      dateOfBirth: new Date('1985-06-15'),
      address: { city: 'Teacher City', state: 'Teacher State', country: 'USA' }
    };
    const teacher = await User.create(teacherData);
    console.log('✅ Teacher user created!');

    const studentData = {
      name: 'Alice Student',
      email: STUDENT_EMAIL,
      password: DEFAULT_PASSWORD,
      role: 'Student',
      schoolId: school._id,
      phone: '+1-555-0004',
      isActive: true,
      gender: 'Female',
      dateOfBirth: new Date('2010-03-20'),
      studentId: 'STU001',
      rollNumber: '01',
      address: { city: 'Student City', state: 'Student State', country: 'USA' }
    };
    const student = await User.create(studentData);
    console.log('✅ Student user created!');

    const parentData = {
      name: 'Mary Parent',
      email: PARENT_EMAIL,
      password: DEFAULT_PASSWORD,
      role: 'Parent',
      schoolId: school._id,
      phone: '+1-555-0005',
      isActive: true,
      gender: 'Female',
      dateOfBirth: new Date('1988-11-10'),
      parentOf: [student._id],
      address: { city: 'Parent City', state: 'Parent State', country: 'USA' }
    };
    await User.create(parentData);
    console.log('✅ Parent user created!');
    console.log('');

    // 5. Create Classes
    console.log('📝 Creating Classes...');
    const class10AData = {
      name: '10th Grade',
      section: 'A',
      tenantId: tenant._id,
      teacherId: teacher._id,
      gradeLevel: 10,
      roomNumber: 'Room 101',
      capacity: 30,
      academicYear: '2024-2025',
      isActive: true
    };
    const class10A = await Class.create(class10AData);

    student.classId = class10A._id;
    await student.save();

    const class9BData = {
      name: '9th Grade',
      section: 'B',
      tenantId: tenant._id,
      gradeLevel: 9,
      roomNumber: 'Room 202',
      capacity: 25,
      academicYear: '2024-2025',
      isActive: true
    };
    await Class.create(class9BData);
    console.log('✅ Classes created successfully!');
    console.log('');

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                     SEEDING COMPLETE                     ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('🔑 Default Login Credentials:');
    console.log(`   Password for all accounts: ${DEFAULT_PASSWORD}`);
    console.log('');
    console.log(`   - Super Admin:    ${SUPER_ADMIN_EMAIL}`);
    console.log(`   - School Admin:   ${SCHOOL_ADMIN_EMAIL}`);
    console.log(`   - Teacher:        ${TEACHER_EMAIL}`);
    console.log(`   - Student:        ${STUDENT_EMAIL}`);
    console.log(`   - Parent:         ${PARENT_EMAIL}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed.');
    }
  }
}

// Run the seed script
console.log('🚀 Starting database seeding...\n');
seedDatabase();