import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
	MatchMode,
	MatchType,
	CharacterName,
	calculateEloMulti,
	ELO_DEFAULT,
} from "@transcendence/types";
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
		const skipStats = matchResult.mode === MatchMode.LOCAL || matchResult.mode === MatchMode.AI;

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

			// LOCAL / AI mode: save match only, no stats
			if (skipStats) return [];

			// Pre-fetch current ELO for all real players (needed for ELO calculation)
			const eloMap = new Map<number, number>();
			if (matchResult.mode === MatchMode.RANKED) {
				for (const p of matchResult.players) {
					if (p.userId === null) continue;
					const s = await tx.userStats.findUnique({
						where: { userId: p.userId },
						select: { eloCurrent: true },
					});
					eloMap.set(p.userId, s?.eloCurrent ?? ELO_DEFAULT);
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

		// Step 2: check achievements (skip for LOCAL / AI)
		if (skipStats || playersStats.length === 0) return [];

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
			const playerElo = eloMap.get(player.userId!) ?? ELO_DEFAULT;
			let matchups: { opponentElo: number; result: "win" | "loss" | "draw" }[];

			if (matchResult.type === MatchType.FFA) {
				if (isDraw) {
					// FFA draw: small adjustment against all other real players
					matchups = matchResult.players
						.filter(
							(p) =>
								p.userId !== null && p.userId !== player.userId,
						)
						.map((p) => ({
							opponentElo: eloMap.get(p.userId!) ?? ELO_DEFAULT,
							result: "draw" as const,
						}));
				} else if (isWinner) {
					// Winner: compare against the highest-ELO opponent only
					const realOpponentElos = matchResult.players
						.filter(
							(p) =>
								p.userId !== null && p.userId !== player.userId,
						)
						.map((p) => eloMap.get(p.userId!) ?? ELO_DEFAULT);
					matchups =
						realOpponentElos.length > 0
							? [
									{
										opponentElo: Math.max(...realOpponentElos),
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
							? (eloMap.get(winnerPlayer.userId) ?? ELO_DEFAULT)
							: 500;
					matchups = [{ opponentElo: winnerElo, result: "loss" as const }];
				}
			} else {
				// TEAM mode: each player vs every opponent on the other team
				matchups = matchResult.players
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
						return { opponentElo: eloMap.get(p.userId!) ?? ELO_DEFAULT, result };
					});
			}

			eloChange = calculateEloMulti(playerElo, matchups);
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

		const newElo = (currentStats?.eloCurrent ?? ELO_DEFAULT) + eloChange;
		const newEloPeak = Math.max(currentStats?.eloPeak ?? ELO_DEFAULT, newElo);
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

}
