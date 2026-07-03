/**
 * Database Seed Script
 * Creates test tenant, users (Admin, Teacher, Student) for development/testing
 * 
 * Usage: npx prisma db seed
 * Or: node backend/prisma/seed.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Common password for test users
  const testPassword = '123456';
  const saltRounds = 10;

  // Hash password once
  const hashedPassword = await bcrypt.hash(testPassword, saltRounds);

  // ============================================
  // Step 1: Create or get the test tenant (school)
  // ============================================
  const schoolCode = 'TEST_SCHOOL_001';
  let tenant = await prisma.tenant.findUnique({
    where: { code: schoolCode },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Test School',
        code: schoolCode,
        email: 'test@school.com',
        phone: '+1234567890',
        address: '123 Test Street, Test City',
      },
    });
    console.log(`✅ Test tenant (school) created: ${tenant.name} (Code: ${tenant.code}, ID: ${tenant.id})`);
  } else {
    console.log(`📋 Test tenant already exists: ${tenant.name} (ID: ${tenant.id})`);
  }

  // ============================================
  // Step 2: Create or update Admin user with proper tenantId
  // ============================================
  const adminEmail = 'amfp.2706@gmail.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    // Skip update to avoid Prisma issues with Supabase auth schema columns
    console.log(`📋 Admin user already exists: ${adminEmail}`);
  } else {
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'School Admin',
        role: 'ADMIN',
        tenantId: tenant.id, // Properly assign to tenant
        phone: '+1234567891',
      },
    });
    console.log(`✅ Admin user created: ${admin.email} (ID: ${admin.id})`);
  }

  // ============================================
  // Step 3: Create or update Teacher user with proper tenantId
  // ============================================
  const teacherEmail = 'Felix@gmail.com';
  const existingTeacher = await prisma.user.findUnique({
    where: { email: teacherEmail },
  });

  if (existingTeacher) {
    // Skip update to avoid Prisma issues with Supabase auth schema columns
    console.log(`📋 Teacher user already exists: ${teacherEmail}`);
  } else {
    const teacher = await prisma.user.create({
      data: {
        email: teacherEmail,
        password: hashedPassword,
        name: 'Felix Teacher',
        role: 'TEACHER',
        tenantId: tenant.id, // Properly assign to tenant
        phone: '+1234567890',
      },
    });
    console.log(`✅ Teacher user created: ${teacher.email} (ID: ${teacher.id})`);
  }

  // ============================================
  // Step 4: Create a test class if it doesn't exist
  // ============================================
  const className = '10th Grade';
  const section = 'A';
  let testClass = await prisma.class.findFirst({
    where: { 
      name: className, 
      section: section,
      tenantId: tenant.id 
    },
  });

  if (!testClass) {
    testClass = await prisma.class.create({
      data: {
        name: className,
        section: section,
        tenantId: tenant.id,
      },
    });
    console.log(`✅ Test class created: ${testClass.name} - ${testClass.section} (ID: ${testClass.id})`);
  } else {
    console.log(`📋 Test class already exists: ${testClass.name} - ${testClass.section}`);
  }

  // ============================================
  // Step 5: Create a test student if doesn't exist
  // ============================================
  const studentEmail = 'student@test.com';
  const studentId = 'STU001';
  const existingStudent = await prisma.user.findFirst({
    where: { 
      OR: [
        { email: studentEmail },
        { studentId: studentId }
      ]
    },
  });

  if (!existingStudent) {
    const student = await prisma.user.create({
      data: {
        email: studentEmail,
        password: hashedPassword,
        name: 'Test Student',
        role: 'STUDENT',
        tenantId: tenant.id,
        studentId: studentId,
        classId: testClass.id,
        phone: '+1234567892',
      },
    });
    console.log(`✅ Test student created: ${student.email} (ID: ${student.id})`);
  } else {
    console.log(`📋 Test student already exists: ${existingStudent.email}`);
  }

  // ============================================
  // Step 6: Create Super Admin if doesn't exist
  // ============================================
  const superAdminEmail = 'superadmin@school.com';
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (!existingSuperAdmin) {
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';
    const hashedSuperAdminPassword = await bcrypt.hash(superAdminPassword, saltRounds);
    
    await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: hashedSuperAdminPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        // No tenantId for super admin - they can access all tenants
      },
    });
    console.log(`✅ Super Admin user created: ${superAdminEmail}`);
  } else {
    console.log(`📋 Super Admin user already exists: ${superAdminEmail}`);
  }

  // ============================================
  // Summary
  // ============================================
  console.log('\n🌱 Database seeding completed successfully!');
  console.log('\n📝 Test Credentials:');
  console.log(`   Admin:    ${adminEmail} / ${testPassword}`);
  console.log(`   Teacher:  ${teacherEmail} / ${testPassword}`);
  console.log(`   Student:  ${studentEmail} / ${testPassword}`);
  console.log(`   Super Admin: ${superAdminEmail} / ${process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123'}`);
  console.log(`\n🏫 Test Tenant: ${tenant.name} (Code: ${tenant.code})`);
  console.log(`📚 Test Class: ${testClass.name} - ${testClass.section}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });