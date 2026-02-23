/**
 * @file achievement.data.ts
 * @description Static achievement definitions.
 *
 * Descriptions use AchievementConfig values so they stay aligned
 * with gameplay balance. Upserted on game-service startup.
 */
import { AchievementType } from "@prisma/client";
import { AchievementConfig } from "../../types/achievement.config";

const a = AchievementConfig.achievements;

export interface AchievementDefinition {
	name: string;
	description: string;
	tier: AchievementType;
	iconPath: string;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
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
		name: "Total Defeat",
		description: "Lose without getting a single kill",
		tier: AchievementType.BRONZE,
		iconPath: "/icons/defeat.png",
	},
	{
		name: "Losing Streak",
		description: `Lose ${a.STREAK_THRESHOLD} matches in a row`,
		tier: AchievementType.BRONZE,
		iconPath: "/icons/losing_streak.png",
	},

	// ─── Silver ──────────────────────────────────────────────────
	{
		name: "Flawless Victory",
		description: "Win without dying",
		tier: AchievementType.SILVER,
		iconPath: "/icons/flawless.png",
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
