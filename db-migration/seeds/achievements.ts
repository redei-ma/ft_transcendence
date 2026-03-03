import { PrismaClient } from "@prisma/client";
import { ACHIEVEMENTS } from "@transcendence/types";

export async function seedAchievementData(prisma: PrismaClient): Promise<void> {
	console.log("Seeding achievement data...");

	for (const ach of ACHIEVEMENTS) {
		await prisma.achievement.upsert({
			where: { name: ach.name },
			update: {
				description: ach.description,
				tier: ach.tier,
				iconPath: ach.iconPath,
			},
			create: ach,
		});
	}

	console.log(`  ✓ ${ACHIEVEMENTS.length} achievements`);
}
