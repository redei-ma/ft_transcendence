import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MatchMode, MatchType, CharacterName } from "@transcendence/types";
import { Prisma } from "@prisma/client";
import { MatchResult, PlayerResult } from "../../types/match-result.interface";
import {
	AchievementService,
	UpdatedPlayerStats,
} from "../achievement/achievement.service";

@Injectable()
export class MatchResultService {
	private readonly logger = new Logger(MatchResultService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly achievementService: AchievementService,
	) {}

	/**
	 * Processes the end of a match: saves all data and checks achievements.
	 *
	 * Called by the game engine when a match ends. The MatchResult object
	 * contains all live data from the match (kills, deaths, HP, duration).
	 *
	 * @returns Newly unlocked achievements (for notification purposes)
	 */
	async processMatchEnd(
		matchResult: MatchResult,
	): Promise<{ userId: number; achievementName: string }[]> {
		const isLocal = matchResult.mode === MatchMode.LOCAL;

		// Step 1: transaction — save match + update stats
		const playersStats = await this.prisma.$transaction(async (tx) => {
			// Create Match
			const match = await tx.match.create({
				data: {
					mode: matchResult.mode,
					type: matchResult.type,
					durationSeconds: matchResult.durationSeconds,
					endReason: matchResult.endReason,
					winningTeamId: matchResult.winningTeamId,
				},
			});

			// Create MatchParticipants
			await tx.matchParticipant.createMany({
				data: matchResult.players.map((p) => ({
					matchId: match.id,
					userId: p.userId,
					teamId: p.teamId,
					characterName: p.characterName,
					kills: p.kills,
					deaths: p.deaths,
				})),
			});

			// LOCAL mode: save match only, no stats
			if (isLocal) return [];

			// Pre-fetch current ELO for all real players (needed for ELO calculation)
			const eloMap = new Map<number, number>();
			if (matchResult.mode === MatchMode.RANKED) {
				for (const p of matchResult.players) {
					if (p.userId === null) continue;
					const s = await tx.userStats.findUnique({
						where: { userId: p.userId },
						select: { eloCurrent: true },
					});
					eloMap.set(p.userId, s?.eloCurrent ?? 500);
				}
			}

			// Update stats for each real player
			const updatedStats: UpdatedPlayerStats[] = [];

			for (const player of matchResult.players) {
				if (player.userId === null) continue;

				const stats = await this.updatePlayerStats(
					tx,
					player,
					matchResult,
					eloMap,
				);
				updatedStats.push(stats);
			}

			return updatedStats;
		});

		// Step 2: check achievements (skip for LOCAL)
		if (isLocal || playersStats.length === 0) return [];

		const unlocked = await this.achievementService.checkAchievements(
			matchResult,
			playersStats,
		);

		// Step 3: send notifications for unlocked achievements
		// TODO: call user-service POST /internal/users/:id/notifications
		// And send notificatio via websocket
		for (const { userId, achievementName } of unlocked) {
			this.logger.log(
				`TODO: notify user ${userId} about "${achievementName}"`,
			);
		}

		return unlocked;
	}

	/**
	 * Updates UserStats and CharacterStats for a single player.
	 * Returns the updated stats snapshot for achievement checking.
	 */
	private async updatePlayerStats(
		tx: Prisma.TransactionClient,
		player: PlayerResult,
		matchResult: MatchResult,
		eloMap: Map<number, number>,
	): Promise<UpdatedPlayerStats> {
		const isWinner =
			matchResult.winningTeamId !== null &&
			player.teamId === matchResult.winningTeamId;
		const isLoser =
			matchResult.winningTeamId !== null &&
			player.teamId !== matchResult.winningTeamId;
		const isDraw = matchResult.winningTeamId === null;

		// ─── UserStats ────────────────────────────────────────
		const currentStats = await tx.userStats.findUnique({
			where: { userId: player.userId! },
		});

		// ─── ELO ──────────────────────────────────────────────
		let eloChange = 0;
		if (matchResult.mode === MatchMode.RANKED) {
			const playerElo = eloMap.get(player.userId!) ?? 500;
			let opponents: { elo: number; result: "win" | "loss" | "draw" }[];

			if (matchResult.type === MatchType.FFA) {
				if (isDraw) {
					// FFA draw: small adjustment against all other real players
					opponents = matchResult.players
						.filter(
							(p) =>
								p.userId !== null && p.userId !== player.userId,
						)
						.map((p) => ({
							elo: eloMap.get(p.userId!) ?? 500,
							result: "draw" as const,
						}));
				} else if (isWinner) {
					// Winner: compare against the highest-ELO opponent only
					const realOpponentElos = matchResult.players
						.filter(
							(p) =>
								p.userId !== null && p.userId !== player.userId,
						)
						.map((p) => eloMap.get(p.userId!) ?? 500);
					opponents =
						realOpponentElos.length > 0
							? [
									{
										elo: Math.max(...realOpponentElos),
										result: "win" as const,
									},
								]
							: [];
				} else {
					// Loser: compare only against the winner
					const winnerPlayer = matchResult.players.find(
						(p) => p.teamId === matchResult.winningTeamId,
					);
					const winnerElo =
						winnerPlayer?.userId != null
							? (eloMap.get(winnerPlayer.userId) ?? 500)
							: 500;
					opponents = [{ elo: winnerElo, result: "loss" as const }];
				}
			} else {
				// TEAM mode: each player vs every opponent on the other team
				opponents = matchResult.players
					.filter(
						(p) =>
							p.userId !== null &&
							p.userId !== player.userId &&
							p.teamId !== player.teamId,
					)
					.map((p) => {
						const opponentIsWinner =
							matchResult.winningTeamId !== null &&
							p.teamId === matchResult.winningTeamId;
						const result: "win" | "loss" | "draw" = isDraw
							? "draw"
							: isWinner
								? "win"
								: opponentIsWinner
									? "loss"
									: "draw";
						return { elo: eloMap.get(p.userId!) ?? 500, result };
					});
			}

			eloChange = this.calculateElo(playerElo, opponents);
		}

		// Streak calculation
		let newWinStreak = currentStats?.currentWinStreak ?? 0;
		let newLoseStreak = currentStats?.currentLoseStreak ?? 0;

		if (isWinner) {
			newWinStreak += 1;
			newLoseStreak = 0;
		} else if (isLoser) {
			newLoseStreak += 1;
			newWinStreak = 0;
		} else {
			// Draw resets both streaks
			newWinStreak = 0;
			newLoseStreak = 0;
		}

		const newElo = (currentStats?.eloCurrent ?? 500) + eloChange;
		const newEloPeak = Math.max(currentStats?.eloPeak ?? 500, newElo);
		const newBestWinStreak = Math.max(
			currentStats?.bestWinStreak ?? 0,
			newWinStreak,
		);

		const updatedUserStats = await tx.userStats.update({
			where: { userId: player.userId! },
			data: {
				eloCurrent: newElo,
				eloPeak: newEloPeak,
				totalWins: { increment: isWinner ? 1 : 0 },
				totalLosses: { increment: isLoser ? 1 : 0 },
				totalDraws: { increment: isDraw ? 1 : 0 },
				totalKills: { increment: player.kills },
				totalDeaths: { increment: player.deaths },
				currentWinStreak: newWinStreak,
				bestWinStreak: newBestWinStreak,
				currentLoseStreak: newLoseStreak,
			},
		});

		// ─── CharacterStats ───────────────────────────────────
		const updatedCharStats = await tx.characterStats.upsert({
			where: {
				userId_characterName: {
					userId: player.userId!,
					characterName: player.characterName,
				},
			},
			create: {
				userId: player.userId!,
				characterName: player.characterName,
				wins: isWinner ? 1 : 0,
				losses: isLoser ? 1 : 0,
				draws: isDraw ? 1 : 0,
				kills: player.kills,
				deaths: player.deaths,
			},
			update: {
				wins: { increment: isWinner ? 1 : 0 },
				losses: { increment: isLoser ? 1 : 0 },
				draws: { increment: isDraw ? 1 : 0 },
				kills: { increment: player.kills },
				deaths: { increment: player.deaths },
			},
		});

		// ─── Build stats snapshot for achievement check ───────
		// Get all character stats for this user (for champion achievements)
		const allCharStats = await tx.characterStats.findMany({
			where: { userId: player.userId! },
		});

		const characterWins = new Map<CharacterName, number>();
		for (const cs of allCharStats) {
			characterWins.set(cs.characterName, cs.wins);
		}

		return {
			userId: player.userId!,
			totalWins: updatedUserStats.totalWins,
			totalLosses: updatedUserStats.totalLosses,
			totalDraws: updatedUserStats.totalDraws,
			totalKills: updatedUserStats.totalKills,
			totalDeaths: updatedUserStats.totalDeaths,
			currentWinStreak: updatedUserStats.currentWinStreak,
			currentLoseStreak: updatedUserStats.currentLoseStreak,
			characterWins,
		};
	}

	// ─── ELO Calculation ──────────────────────────────────────────

	/**
	 * Calculates ELO delta for a player after a ranked match.
	 *
	 * Formula per opponent:
	 *   E = 1 / (1 + 10^((opponentElo - playerElo) / 400))
	 *   delta = K * (actualScore - E)
	 *
	 * Delta is averaged across all opponents.
	 * K-factor: 32.
	 */
	private calculateElo(
		playerElo: number,
		opponents: { elo: number; result: "win" | "loss" | "draw" }[],
	): number {
		if (opponents.length === 0) return 0;

		const K = 32;

		const totalDelta = opponents.reduce((sum, { elo: oppElo, result }) => {
			const actual = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
			const expected = 1 / (1 + Math.pow(10, (oppElo - playerElo) / 400));
			return sum + K * (actual - expected);
		}, 0);

		return Math.round(totalDelta / opponents.length);
	}
}
