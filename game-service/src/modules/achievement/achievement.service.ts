import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CharacterName, AchievementConfig } from "@transcendence/types";
import { MatchResult } from "../../types/match-result.interface";

/** Stats snapshot after the match transaction has been committed */
export interface UpdatedPlayerStats {
	userId: number;
	totalWins: number;
	totalLosses: number;
	totalDraws: number;
	totalKills: number;
	totalDeaths: number;
	currentWinStreak: number;
	currentLoseStreak: number;
	characterWins: Map<CharacterName, number>;
}

@Injectable()
export class AchievementService implements OnModuleInit {
	private readonly logger = new Logger(AchievementService.name);

	/** In-memory cache: achievement name → achievement id */
	private achMap = new Map<string, number>();
	private totalCount = 0;

	constructor(private readonly prisma: PrismaService) {}

	// ─── Startup: Cache ────────────────────────────────────

	async onModuleInit(): Promise<void> {
		await this.loadCache();
	}

	/** Loads all achievements into memory to avoid DB queries on every match */
	private async loadCache(): Promise<void> {
		const achievements = await this.prisma.achievement.findMany();
		this.achMap.clear();

		for (const ach of achievements) {
			this.achMap.set(ach.name, ach.id);
		}

		this.totalCount = achievements.length;
		this.logger.log(`${this.totalCount} achievements cached`);
	}

	// ─── Post-Match Achievement Check ─────────────────────────────

	/**
	 * Checks all achievement conditions for each real player in the match.
	 *
	 * Called AFTER the match + stats transaction is committed.
	 * Uses match result (live data) and updated stats (cumulative data)
	 * to determine which achievements to unlock.
	 *
	 * @returns Array of { userId, achievementName } for newly unlocked achievements
	 */
	async checkAchievements(
		matchResult: MatchResult,
		playersStats: UpdatedPlayerStats[],
	): Promise<{ userId: number; achievementName: string }[]> {
		const unlocked: { userId: number; achievementName: string }[] = [];
		const a = AchievementConfig.achievements;

		// Load already unlocked achievements for all players in one query
		const playerIds = playersStats.map((p) => p.userId);
		const existing = await this.prisma.userAchievement.findMany({
			where: { userId: { in: playerIds } },
			select: { userId: true, achievementId: true },
		});
		const alreadyUnlocked = new Set(
			existing.map((e) => `${e.userId}-${e.achievementId}`),
		);

		for (const stats of playersStats) {
			const player = matchResult.players.find(
				(p) => p.userId === stats.userId,
			);
			if (!player) continue;

			const isWinner =
				matchResult.winningTeamId !== null &&
				player.teamId === matchResult.winningTeamId;
			const isLoser =
				matchResult.winningTeamId !== null &&
				player.teamId !== matchResult.winningTeamId;
			const isDraw = matchResult.winningTeamId === null;

			const earned: string[] = [];

			// ─── Bronze ───────────────────────────────────────

			// First Blood: first match ever
			const totalMatches =
				stats.totalWins + stats.totalLosses + stats.totalDraws;
			if (totalMatches === 1) {
				earned.push("First Blood");
			}

			// Perfectly Balanced: draw
			if (isDraw) {
				earned.push("Perfectly Balanced");
			}

			// Total Defeat: lose with 0 kills
			if (isLoser && player.kills === 0) {
				earned.push("Total Defeat");
			}

			// Losing Streak
			if (stats.currentLoseStreak >= a.STREAK_THRESHOLD) {
				earned.push("Losing Streak");
			}

			// ─── Silver ──────────────────────────────────────

			// Flawless Victory: win with 0 deaths
			if (isWinner && player.deaths === 0) {
				earned.push("Flawless Victory");
			}

			// Speed Demon: win fast
			if (
				isWinner &&
				matchResult.durationSeconds < a.SPEED_DEMON_SECONDS
			) {
				earned.push("Speed Demon");
			}

			// Hades Champion: N wins as Ade
			if (
				player.characterName === CharacterName.ADE &&
				(stats.characterWins.get(CharacterName.ADE) ?? 0) >=
					a.CHAMPION_WINS
			) {
				earned.push("Hades Champion");
			}

			// Zeus Champion: N wins as Zeus
			if (
				player.characterName === CharacterName.ZEUS &&
				(stats.characterWins.get(CharacterName.ZEUS) ?? 0) >=
					a.CHAMPION_WINS
			) {
				earned.push("Zeus Champion");
			}

			// ─── Gold ────────────────────────────────────────

			// Winning Streak
			if (stats.currentWinStreak >= a.STREAK_THRESHOLD) {
				earned.push("Winning Streak");
			}

			// Kill Machine: cumulative kills
			if (stats.totalKills >= a.KILL_MACHINE_THRESHOLD) {
				earned.push("Kill Machine");
			}

			// Clutch Master: win with low HP
			if (player.clutchMasterUnlook) {
				earned.push("Clutch Master");
			}

			// ─── Save newly earned achievements ──────────────

			for (const name of earned) {
				const achId = this.achMap.get(name);
				if (!achId) continue;

				const key = `${stats.userId}-${achId}`;
				if (alreadyUnlocked.has(key)) continue;

				await this.prisma.userAchievement.create({
					data: {
						userId: stats.userId,
						achievementId: achId,
					},
				});

				alreadyUnlocked.add(key);
				unlocked.push({ userId: stats.userId, achievementName: name });
			}

			// ─── Platinum (check after all others) ───────────

			const completionistId = this.achMap.get("Completionist");
			if (!completionistId) continue;

			const userUnlockedCount = [...alreadyUnlocked].filter((k: string) =>
				k.startsWith(`${stats.userId}-`),
			).length;

			// -1 because Completionist itself doesn't count
			if (
				userUnlockedCount >= this.totalCount - 1 &&
				!alreadyUnlocked.has(`${stats.userId}-${completionistId}`)
			) {
				await this.prisma.userAchievement.create({
					data: {
						userId: stats.userId,
						achievementId: completionistId,
					},
				});
				unlocked.push({
					userId: stats.userId,
					achievementName: "Completionist",
				});
			}
		}

		if (unlocked.length > 0) {
			this.logger.log(
				`Achievements unlocked: ${unlocked.map((u) => `${u.userId}:${u.achievementName}`).join(", ")}`,
			);
		}

		return unlocked;
	}
}
