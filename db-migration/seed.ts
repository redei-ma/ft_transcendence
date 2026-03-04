import { PrismaClient } from "@prisma/client";
import { seedTestData } from "./seeds/test-data";
import { seedAchievementData } from "./seeds/achievements";

const prisma = new PrismaClient();

async function main() {
	await seedAchievementData(prisma);

	if (process.env.NODE_ENV !== "production") {
		await seedTestData(prisma);
	}
}

main()
	.catch((error) => {
		console.error("Seed error:", error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
