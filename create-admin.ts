import { PrismaClient } from "@prisma/client";
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function createAdminUser() {
  console.log('🌱 Creating admin user...');

  // Create admin user with your credentials
  const adminEmail = "chandu.kalluru@outlook.com";
  const adminPassword = "Kalluru@145";
  const adminPasswordHash = await argon2.hash(adminPassword);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { 
      role: "ADMIN",
      passwordHash: adminPasswordHash,
      name: "Chandu Kalluru"
    },
    create: { 
      email: adminEmail, 
      name: "Chandu Kalluru", 
      role: "ADMIN", 
      passwordHash: adminPasswordHash 
    },
  });

  console.log('✅ Admin user created/updated:', adminUser.email);
  console.log('✅ Role:', adminUser.role);
}

createAdminUser()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
