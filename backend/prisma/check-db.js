const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst();
    if (user) {
      console.log('User fields:', Object.keys(user));
      console.log('User tenantId:', user.tenantId);
    } else {
      console.log('No users found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();