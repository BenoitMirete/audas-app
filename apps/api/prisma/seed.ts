import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@audas.dev' },
    update: {},
    create: {
      email: 'admin@audas.dev',
      passwordHash: adminHash,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  // Create a sample project
  const project = await prisma.project.upsert({
    where: { slug: 'demo-project' },
    update: {},
    create: {
      name: 'Demo Project',
      slug: 'demo-project',
      description: 'A sample Playwright project',
    },
  });

  // Add admin as project member
  await prisma.projectMembership.upsert({
    where: { userId_projectId: { userId: admin.id, projectId: project.id } },
    update: {},
    create: {
      userId: admin.id,
      projectId: project.id,
      role: 'ADMIN',
    },
  });

  // Create an API key for the project (raw key: "demo-api-key-1234")
  const apiKeyHash = await bcrypt.hash('demo-api-key-1234', 10);
  await prisma.apiKey.upsert({
    where: { keyHash: apiKeyHash },
    update: {},
    create: {
      projectId: project.id,
      keyHash: apiKeyHash,
      label: 'Demo key',
    },
  });

  console.log('Seed complete. Admin: admin@audas.dev / admin123');
  console.log('Demo API key: demo-api-key-1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
