const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing users with simple SQL...');
  
  // Get tenant
  const tenant = await prisma.tenant.findUnique({
    where: { code: 'TEST_SCHOOL_001' },
  });
  
  if (!tenant) {
    console.log('❌ Tenant not found');
    return;
  }
  
  console.log('Tenant ID:', tenant.id);
  
  // Update admin user using simple SQL
  const adminResult = await prisma.$executeRawUnsafe(
    `UPDATE users SET "tenantId" = '${tenant.id}' WHERE email = 'amfp.2706@gmail.com'`
  );
  console.log('✅ Admin updated:', adminResult, 'rows affected');
  
  // Update teacher user using simple SQL
  const teacherResult = await prisma.$executeRawUnsafe(
    `UPDATE users SET "tenantId" = '${tenant.id}' WHERE email = 'Felix@gmail.com'`
  );
  console.log('✅ Teacher updated:', teacherResult, 'rows affected');
  
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