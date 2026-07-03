const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing users with raw SQL...');
  
  // Find or create tenant
  let tenant = await prisma.tenant.findUnique({
    where: { code: 'TEST_SCHOOL_001' },
  });
  
  if (!tenant) {
    // Create tenant using raw SQL to avoid Prisma issues
    await prisma.$executeRaw`
      INSERT INTO tenants (id, name, code, email, phone, address, "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Test School', 'TEST_SCHOOL_001', 'test@school.com', '+1234567890', '123 Test Street, Test City', true, now(), now())
      ON CONFLICT (code) DO NOTHING;
    `;
    
    tenant = await prisma.tenant.findUnique({
      where: { code: 'TEST_SCHOOL_001' },
    });
    
    if (tenant) {
      console.log('✅ Created tenant using raw SQL:', tenant.name);
    }
  } else {
    console.log('📋 Tenant exists:', tenant.name, 'ID:', tenant.id);
  }
  
  if (!tenant) {
    console.log('❌ Could not create or find tenant');
    return;
  }
  
  // Update admin user using raw SQL
  await prisma.$executeRaw`
    UPDATE users SET "tenantId" = ${tenant.id} WHERE email = 'amfp.2706@gmail.com';
  `;
  console.log('✅ Admin user linked to tenant');
  
  // Update teacher user using raw SQL
  await prisma.$executeRaw`
    UPDATE users SET "tenantId" = ${tenant.id} WHERE email = 'Felix@gmail.com';
  `;
  console.log('✅ Teacher user linked to tenant');
  
  // Verify the updates
  const admin = await prisma.user.findUnique({
    where: { email: 'amfp.2706@gmail.com' },
  });
  console.log('Admin tenantId:', admin?.tenantId);
  
  const teacher = await prisma.user.findUnique({
    where: { email: 'Felix@gmail.com' },
  });
  console.log('Teacher tenantId:', teacher?.tenantId);
  
  console.log('🔧 Done!');
}

main()
  .catch(e => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });