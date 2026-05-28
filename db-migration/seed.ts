import { PrismaClient } from '@prisma/client';
import { seedTestData } from './seeds/test-data';
import { seedAchievementData } from './seeds/achievements';

const prisma = new PrismaClient();

async function main() {
  await seedAchievementData(prisma);

  if (process.env.NODE_ENV !== 'production') {
    const alreadySeeded = await prisma.user.findUnique({ where: { email: 'alice@test.com' } });
    if (!alreadySeeded) {
      await seedTestData(prisma);
    } else {
      console.log('Test data already seeded, skipping.');
    }
  }
}

main()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
