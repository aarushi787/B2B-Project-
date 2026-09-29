const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
  console.log('Deleted services and accounts');
}
main().catch(console.error).finally(() => prisma.$disconnect());
