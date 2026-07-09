const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
  console.log("Admins:");
  console.log(admins.map(a => ({ email: a.email })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
