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
const School = require('../models/School');
const Tenant = require('../models/Tenant');
const Class = require('../models/Class');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/macvel_school';

// Default credentials
const DEFAULT_PASSWORD = 'macvel123'; // Default password for all seeded users
const SUPER_ADMIN_EMAIL = 'superadmin@macvelschool.com';
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

  let client;
  
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
    const existingClasses = await Class.countDocuments();
    
    const totalRecords = existingSchools + existingTenants + existingUsers + existingClasses;
    
    if (totalRecords > 0) {
      console.log('⚠️  Database already contains data:');
      console.log(`   - Schools: ${existingSchools}`);
      console.log(`   - Tenants: ${existingTenants}`);
      console.log(`   - Users: ${existingUsers}`);
      console.log(`   - Classes: ${existingClasses}`);
      console.log('');
      console.log('🧹 Clearing existing demo data for fresh seed...');
      
      // Clear all collections
      await User.deleteMany({});
      await Class.deleteMany({});
      await School.deleteMany({});
      await Tenant.deleteMany({});
      
      console.log('✅ Existing data cleared successfully.');
      console.log('');
    }

    console.log('✅ No existing data found. Proceeding with seeding...');
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
    console.log(`   ID: ${tenant._id}`);
    console.log(`   Name: ${tenant.name}`);
    console.log(`   Code: ${tenant.code}`);
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
      subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
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
    console.log(`   ID: ${school._id}`);
    console.log(`   Name: ${school.schoolName}`);
    console.log(`   Code: ${school.schoolCode}`);
    console.log('');

    // 3. Create Users
    console.log('📝 Creating Users...');
    
    // Note: Passwords are passed as plain text - the User model's pre-save hook will hash them
    
    // Super Admin User
    const superAdminData = {
      name: 'Super Admin',
      email: SUPER_ADMIN_EMAIL,
      password: DEFAULT_PASSWORD,
      role: 'Super Admin',
      phone: '+1-555-0001',
      isActive: true,
      gender: 'Male',
      address: {
        city: 'Admin City',
        state: 'Admin State',
        country: 'USA'
      }
    };
    
    const superAdmin = await User.create(superAdminData);
    console.log('✅ Super Admin user created!');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Role: ${superAdmin.role}`);
    console.log('');

    // School Admin User
    const schoolAdminData = {
      name: 'School Admin',
      email: SCHOOL_ADMIN_EMAIL,
      password: DEFAULT_PASSWORD,
      role: 'School Admin',
      schoolId: school._id,
      phone: '+1-555-0002',
      isActive: true,
      gender: 'Female',
      address: {
        city: 'School City',
        state: 'School State',
        country: 'USA'
      }
    };
    
    const schoolAdmin = await User.create(schoolAdminData);
    console.log('✅ School Admin user created!');
    console.log(`   Email: ${schoolAdmin.email}`);
    console.log(`   Role: ${schoolAdmin.role}`);
    console.log(`   School: ${school.schoolName}`);
    console.log('');

    // Teacher User
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
      address: {
        city: 'Teacher City',
        state: 'Teacher State',
        country: 'USA'
      }
    };
    
    const teacher = await User.create(teacherData);
    console.log('✅ Teacher user created!');
    console.log(`   Email: ${teacher.email}`);
    console.log(`   Role: ${teacher.role}`);
    console.log(`   School: ${school.schoolName}`);
    console.log('');

    // Student User
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
      address: {
        city: 'Student City',
        state: 'Student State',
        country: 'USA'
      }
    };
    
    const student = await User.create(studentData);
    console.log('✅ Student user created!');
    console.log(`   Email: ${student.email}`);
    console.log(`   Role: ${student.role}`);
    console.log(`   School: ${school.schoolName}`);
    console.log(`   Student ID: ${student.studentId}`);
    console.log('');

    // Parent User
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
      parentOf: [student._id], // Link to the student
      address: {
        city: 'Parent City',
        state: 'Parent State',
        country: 'USA'
      },
      emergencyContact: {
        name: 'Emergency Contact',
        phone: '+1-555-9999',
        relationship: 'Spouse'
      }
    };
    
    const parent = await User.create(parentData);
    console.log('✅ Parent user created!');
    console.log(`   Email: ${parent.email}`);
    console.log(`   Role: ${parent.role}`);
    console.log(`   School: ${school.schoolName}`);
    console.log(`   Parent of: ${student.name} (${student.studentId})`);
    console.log('');

    // 4. Create Classes
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
    console.log('✅ Class 10-A created!');
    console.log(`   Name: ${class10A.name} - ${class10A.section}`);
    console.log(`   Class Code: ${class10A.classCode}`);
    console.log(`   Teacher: ${teacher.name}`);
    console.log(`   Room: ${class10A.roomNumber}`);
    console.log('');

    // Update student to link to class
    student.classId = class10A._id;
    await student.save();
    console.log('✅ Student linked to Class 10-A');
    console.log('');

    // Create additional classes for variety
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
    
    const class9B = await Class.create(class9BData);
    console.log('✅ Class 9-B created!');
    console.log(`   Name: ${class9B.name} - ${class9B.section}`);
    console.log(`   Class Code: ${class9B.classCode}`);
    console.log('');

    // 5. Create additional sample students
    console.log('📝 Creating additional sample students...');
    
    const additionalStudents = [
      {
        name: 'Bob Johnson',
        email: 'bob.student@demo.school',
        role: 'Student',
        schoolId: school._id,
        classId: class10A._id,
        studentId: 'STU002',
        rollNumber: '02',
        gender: 'Male',
        dateOfBirth: new Date('2010-05-12')
      },
      {
        name: 'Carol Williams',
        email: 'carol.student@demo.school',
        role: 'Student',
        schoolId: school._id,
        classId: class10A._id,
        studentId: 'STU003',
        rollNumber: '03',
        gender: 'Female',
        dateOfBirth: new Date('2010-08-23')
      },
      {
        name: 'David Brown',
        email: 'david.student@demo.school',
        role: 'Student',
        schoolId: school._id,
        classId: class9B._id,
        studentId: 'STU004',
        rollNumber: '01',
        gender: 'Male',
        dateOfBirth: new Date('2011-02-14')
      }
    ];
    
    for (const studentData of additionalStudents) {
      studentData.password = DEFAULT_PASSWORD;
      studentData.phone = `+1-555-00${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
      studentData.isActive = true;
      studentData.address = {
        city: 'Student City',
        state: 'Student State',
        country: 'USA'
      };
      
      await User.create(studentData);
      console.log(`   ✅ Created student: ${studentData.name} (${studentData.studentId})`);
    }
    console.log('');

    // Summary
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                    SEEDING COMPLETE                      ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Tenants: 1`);
    console.log(`   - Schools: 1`);
    console.log(`   - Users: 7 (1 Super Admin, 1 School Admin, 1 Teacher, 4 Students, 1 Parent)`);
    console.log(`   - Classes: 2`);
    console.log('');
    console.log('🔑 Default Login Credentials:');
    console.log('   Password for all users: demo123');
    console.log('');
    console.log('📧 User Emails:');
    console.log(`   - Super Admin:    ${SUPER_ADMIN_EMAIL}`);
    console.log(`   - School Admin:   ${SCHOOL_ADMIN_EMAIL}`);
    console.log(`   - Teacher:        ${TEACHER_EMAIL}`);
    console.log(`   - Student:        ${STUDENT_EMAIL}`);
    console.log(`   - Parent:         ${PARENT_EMAIL}`);
    console.log(`   - Additional Student 1: bob.student@demo.school`);
    console.log(`   - Additional Student 2: carol.student@demo.school`);
    console.log(`   - Additional Student 3: david.student@demo.school`);
    console.log('');
    console.log('✅ Database is ready for testing!');
    console.log('');

  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
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

// Run the seed script
console.log('🚀 Starting database seeding...\n');
seedDatabase();