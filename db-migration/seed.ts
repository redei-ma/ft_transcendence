/**
 * @file seed.ts
 * @description Entry point for database seeding.
 *
 * Always seeds: -
 * Dev only: test users, matches, friendships, notifications.
 *
 * Run with: npx prisma db seed
 * Re-runnable safely (uses upsert and skipDuplicates).
 */
import { PrismaClient } from "@prisma/client";
import { seedTestData } from "./seeds/test-data";

const prisma = new PrismaClient();

async function main() {
	if (process.env.NODE_ENV !== "production") {
		console.log("\n[DEV] Seeding test data...\n");
		await seedTestData(prisma);
	} else {
		console.log("\n[PROD] Skipping test data");
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
