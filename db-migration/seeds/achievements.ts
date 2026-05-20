import { PrismaClient } from "@prisma/client";
import { AchievementType, AchievementConfig } from "@transcendence/types";

const a = AchievementConfig.achievements;

interface AchievementDefinition {
	name: string;
	description: string;
	tier: AchievementType;
	iconPath: string;
}

const ACHIEVEMENTS: AchievementDefinition[] = [
	// ─── Bronze ───────────────────────────────────────────────────
	{
		name: "First Blood",
		description: "Play your first match",
		tier: AchievementType.BRONZE,
		iconPath: "/icons/first_blood.png",
	},
	{
		name: "Perfectly Balanced",
		description: "Finish a match in a draw",
		tier: AchievementType.BRONZE,
		iconPath: "/icons/balanced.png",
	},
	{
		name: "Tactical Retreat",
		description: "Surrender a match",
		tier: AchievementType.BRONZE,
		iconPath: "/icons/retreat.png",
	},
	{
		name: "Losing Streak",
		description: `Lose ${a.STREAK_THRESHOLD} matches in a row`,
		tier: AchievementType.BRONZE,
		iconPath: "/icons/losing_streak.png",
	},

	// ─── Silver ──────────────────────────────────────────────────
	{
		name: "Conqueror",
		description: "Force your opponent to surrender",
		tier: AchievementType.SILVER,
		iconPath: "/icons/conqueror.png",
	},
	{
		name: "Speed Demon",
		description: `Win a match in under ${a.SPEED_DEMON_SECONDS} seconds`,
		tier: AchievementType.SILVER,
		iconPath: "/icons/speed.png",
	},
	{
		name: "Hades Champion",
		description: `Win ${a.CHAMPION_WINS} matches as Ade`,
		tier: AchievementType.SILVER,
		iconPath: "/icons/hades.png",
	},
	{
		name: "Zeus Champion",
		description: `Win ${a.CHAMPION_WINS} matches as Zeus`,
		tier: AchievementType.SILVER,
		iconPath: "/icons/zeus.png",
	},

	// ─── Gold ────────────────────────────────────────────────────
	{
		name: "Winning Streak",
		description: `Win ${a.STREAK_THRESHOLD} matches in a row`,
		tier: AchievementType.GOLD,
		iconPath: "/icons/winning_streak.png",
	},
	{
		name: "Kill Machine",
		description: `Accumulate ${a.KILL_MACHINE_THRESHOLD} total kills`,
		tier: AchievementType.GOLD,
		iconPath: "/icons/kill_machine.png",
	},
	{
		name: "Clutch Master",
		description: `Make a kill with critical HP (< ${a.CLUTCH_HP_PERCENT}%)`,
		tier: AchievementType.GOLD,
		iconPath: "/icons/clutch.png",
	},

	// ─── Platinum ────────────────────────────────────────────────
	{
		name: "Completionist",
		description: "Unlock all other achievements",
		tier: AchievementType.PLATINUM,
		iconPath: "/icons/completionist.png",
	},
];

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
