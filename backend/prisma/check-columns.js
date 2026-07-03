const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking database columns...');
  
  // Use raw SQL to check the actual column names in the users table
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position;
  `;
  
  console.log('Users table columns:');
  columns.forEach(col => {
    console.log(`  - ${col.column_name} (${col.data_type})`);
  });
  
  // Check tenants table too
  const tenantColumns = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'tenants' 
    ORDER BY ordinal_position;
  `;
  
  console.log('\nTenants table columns:');
  tenantColumns.forEach(col => {
    console.log(`  - ${col.column_name} (${col.data_type})`);
  });
}

main()
  .catch(e => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });