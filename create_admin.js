const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@quizcraft.com' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
    },
    create: {
      email: 'admin@quizcraft.com',
      name: 'QuizCraft Admin',
      password: hashedPassword,
      mobileNumber: '9999999999',
      role: 'ADMIN',
      isActive: true,
      lastLogin: new Date()
    }
  });
  console.log("Admin created:", admin.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
