const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔗 Linking users to tenant...');
  
  // Find or create tenant
  let tenant = await prisma.tenant.findUnique({
    where: { code: 'TEST_SCHOOL_001' },
  });
  
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Test School',
        code: 'TEST_SCHOOL_001',
        email: 'test@school.com',
        phone: '+1234567890',
        address: '123 Test Street, Test City',
      },
    });
    console.log('✅ Created tenant:', tenant.name);
  } else {
    console.log('📋 Tenant exists:', tenant.name, 'ID:', tenant.id);
  }
  
  // Update admin user
  const adminEmail = 'amfp.2706@gmail.com';
  const admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  
  if (admin) {
    if (admin.tenantId === tenant.id) {
      console.log('✅ Admin already linked to tenant');
    } else {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { tenantId: tenant.id },
      });
      console.log('✅ Admin linked to tenant');
    }
  } else {
    console.log('❌ Admin user not found');
  }
  
  // Update teacher user
  const teacherEmail = 'Felix@gmail.com';
  const teacher = await prisma.user.findUnique({
    where: { email: teacherEmail },
  });
  
  if (teacher) {
    if (teacher.tenantId === tenant.id) {
      console.log('✅ Teacher already linked to tenant');
    } else {
      await prisma.user.update({
        where: { email: teacherEmail },
        data: { tenantId: tenant.id },
      });
      console.log('✅ Teacher linked to tenant');
    }
  } else {
    console.log('❌ Teacher user not found');
  }
  
  console.log('🔗 Done!');
}

main()
  .catch(e => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });