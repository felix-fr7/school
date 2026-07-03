const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
      AND column_name ILIKE '%updated%' 
    ORDER BY column_name;
  `;
  console.log('Updated columns:', rows);
}

main()
  .catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });