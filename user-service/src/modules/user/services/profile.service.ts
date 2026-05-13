import {
	Injectable,
	NotFoundException,
	ConflictException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Provider, calculateEloDelta, ELO_DEFAULT } from "@transcendence/types";
import {
	UpdateUsernameDto,
	LeaderboardQueryDto,
	UserProfileResponseDto,
	UserStatsResponseDto,
	UserSettingsResponseDto,
	PublicProfileResponseDto,
	LeaderboardResponseDto,
	CheckAvailabilityResponseDto,
	EloPreviewQueryDto,
	EloPreviewResponseDto,
	ProfileQueryDto,
	FriendUserDto,
} from "../dto";
import {
	USER_PROFILE_SELECT,
	generateDefaultAvatar,
	isDefaultAvatar,
	isUploadedAvatar,
} from "../helpers";
import { unlink } from "fs/promises";
import { join } from "path";

@Injectable()
export class ProfileService {
	constructor(private readonly prisma: PrismaService) {}

	// ─── Get user ──────────────────────────────────────────────────────────────────────────────────

	/**
	 * Retrieves the profile of the authenticated user.
	 *
	 * @param userId - ID of the authenticated user (from JWT).
	 * @returns UserProfileResponseDto — id, email, username, avatarUrl, status, createdAt.
	 *
	 * @throws NotFoundException (404) — if the user does not exist (valid token but deleted account).
	 */
	async getMyProfile(userId: number): Promise<UserProfileResponseDto> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: USER_PROFILE_SELECT,
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		return user;
	}

	/**
	 * Retrieves the full statistics of the authenticated user.
	 * Includes ELO, win/loss/draw record, streaks, K/D ratio and per-character breakdown.
	 *
	 * @param userId - ID of the authenticated user (from JWT).
	 * @returns UserStatsResponseDto — complete stats with per-character breakdown.
	 * @throws NotFoundException (404) — if the user does not exist.
	 * @throws NotFoundException (404) — if the stats record does not exist (should never occur).
	 */
	async getMyStats(userId: number): Promise<UserStatsResponseDto> {
		const stats = await this.prisma.userStats.findUnique({
			where: { userId },
			select: {
				eloCurrent: true,
				eloPeak: true,
				totalWins: true,
				totalLosses: true,
				totalDraws: true,
				currentWinStreak: true,
				bestWinStreak: true,
				currentLoseStreak: true,
				totalKills: true,
				totalDeaths: true,
			},
		});

		if (!stats) {
			throw new NotFoundException("User stats not found");
		}

		const characterStats = await this.prisma.characterStats.findMany({
			where: { userId },
			select: {
				characterName: true,
				wins: true,
				losses: true,
				draws: true,
				kills: true,
				deaths: true,
			},
		});

		return { ...stats, characterStats };
	}

	/**
	 * Retrieves the security settings and linked providers of the authenticated user.
	 * The frontend uses this to determine which actions are available
	 * (change password, link/unlink OAuth providers, manage 2FA).
	 *
	 * @param userId - ID of the authenticated user (from JWT).
	 * @returns UserSettingsResponseDto — email, verification status, 2FA status, linked providers.
	 * @throws NotFoundException (404) — if the user does not exist.
	 */
	async getMySettings(userId: number): Promise<UserSettingsResponseDto> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: {
				email: true,
				isEmailVerified: true,
				is2faEnabled: true,
				accounts: {
					select: { provider: true },
				},
			},
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		const providers = user.accounts.map((a) => a.provider);

		return {
			email: user.email,
			isEmailVerified: user.isEmailVerified,
			is2faEnabled: user.is2faEnabled,
			hasLocalAccount: providers.includes(Provider.LOCAL),
			linkedProviders: providers.filter((p) => p !== Provider.LOCAL),
		};
	}

	// ─── Update user ───────────────────────────────────────────────────────────────────────────────

	/**
	 * Updates the username of the authenticated user.
	 *
	 * Side effect: if the current avatar is a DiceBear default generated from
	 * the old username, it is regenerated using the new username.
	 *
	 * @param userId - ID of the authenticated user (from JWT).
	 * @param dto - New username.
	 * @returns UserProfileResponseDto — updated profile.
	 * @throws NotFoundException (404) — if the user does not exist.
	 * @throws ConflictException (409) — if the username is already taken.
	 */
	async updateUsername(
		userId: number,
		dto: UpdateUsernameDto,
	): Promise<UserProfileResponseDto> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, avatarUrl: true },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		const existing = await this.prisma.user.findUnique({
			where: { username: dto.username },
			select: { id: true },
		});

		if (existing && existing.id !== userId) {
			throw new ConflictException("Username is already taken");
		}

		const data: Record<string, unknown> = { username: dto.username };

		if (isDefaultAvatar(user.avatarUrl)) {
			data.avatarUrl = generateDefaultAvatar(dto.username);
		}

		return this.prisma.user.update({
			where: { id: userId },
			data,
			select: USER_PROFILE_SELECT,
		});
	}

	// ─── Delete account ────────────────────────────────────────────────────────

	/**
	 * Permanently deletes the user and all associated data.
	 *
	 * Cascade (onDelete: Cascade) automatically removes:
	 * Account, UserStats, CharacterStats, Friendship,
	 * GameInvite, UserAchievement, Notification.
	 * Removes the avatar file if it was a custom upload.
	 *
	 * SetNull (onDelete: SetNull) preserves match history:
	 * Match.winnerId and MatchParticipant.userId are set to null.
	 *
	 * @param id - ID of the authenticated user (from JWT).
	 * @throws NotFoundException (404) — if the user does not exist.
	 */
	async deleteUser(id: number): Promise<void> {
		const user = await this.prisma.user.findUnique({
			where: { id },
			select: { id: true, avatarUrl: true },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		if (isUploadedAvatar(user.avatarUrl)) {
			await unlink(join("/", user.avatarUrl)).catch(() => undefined);
		}

		await this.prisma.user.delete({ where: { id } });
	}

	// ─── Check availability ────────────────────────────────────────────────────────────────────────

	/**
	 * Checks whether an email address is already registered.
	 *
	 * @param email - Email to check.
	 * @returns CheckAvailabilityResponseDto — exists: true if taken, false if available.
	 */
	async checkEmail(email: string): Promise<CheckAvailabilityResponseDto> {
		const user = await this.prisma.user.findUnique({
			where: { email },
			select: { id: true },
		});
		return { exists: !!user };
	}

	/**
	 * Checks whether a username is already taken.
	 *
	 * @param username - Username to check.
	 * @returns CheckAvailabilityResponseDto — exists: true if taken, false if available.
	 */
	async checkUsername(
		username: string,
	): Promise<CheckAvailabilityResponseDto> {
		const user = await this.prisma.user.findUnique({
			where: { username },
			select: { id: true },
		});
		return { exists: !!user };
	}

	// ─── Public data ───────────────────────────────────────────────────────────────────────────────

	/**
	 * Retrieves the public profile of a player by ID or username.
	 * Character stats are loaded in a separate query only if the stats record exists.
	 *
	 * @param query - Either id or username must be provided (not both required).
	 * @returns PublicProfileResponseDto — profile and stats (null if the player has never played).
	 * @throws BadRequestException (400) — if neither id nor username is provided.
	 * @throws NotFoundException (404) — if the player does not exist.
	 */
	async getPublicProfile(query: ProfileQueryDto): Promise<PublicProfileResponseDto> {
		if (query.id === undefined && query.username === undefined) {
			throw new BadRequestException("Either id or username must be provided");
		}

		const where = query.id !== undefined ? { id: query.id } : { username: query.username };

		const user = await this.prisma.user.findUnique({
			where,
			select: {
				id: true,
				username: true,
				avatarUrl: true,
				status: true,
				createdAt: true,
				stats: {
					select: {
						eloCurrent: true,
						eloPeak: true,
						totalWins: true,
						totalLosses: true,
						totalDraws: true,
						currentWinStreak: true,
						bestWinStreak: true,
						currentLoseStreak: true,
						totalKills: true,
						totalDeaths: true,
					},
				},
			},
		});

		if (!user) {
			throw new NotFoundException("Player not found");
		}

		let characterStats: UserStatsResponseDto["characterStats"] = [];
		if (user.stats) {
			characterStats = await this.prisma.characterStats.findMany({
				where: { userId: user.id },
				select: {
					characterName: true,
					wins: true,
					losses: true,
					draws: true,
					kills: true,
					deaths: true,
				},
			});
		}

		return {
			id: user.id,
			username: user.username,
			avatarUrl: user.avatarUrl,
			status: user.status,
			createdAt: user.createdAt,
			stats: user.stats ? { ...user.stats, characterStats } : null,
		};
	}

	/**
	 * Searches for a player by exact username match.
	 * Returns only the minimal public data needed for friend search.
	 *
	 * @param username - Exact username to look up.
	 * @returns FriendUserDto — id, username, avatarUrl, status.
	 * @throws NotFoundException (404) — if no player with that username exists.
	 */
	async searchByUsername(username: string): Promise<FriendUserDto> {
		const user = await this.prisma.user.findUnique({
			where: { username },
			select: {
				id: true,
				username: true,
				avatarUrl: true,
				status: true,
			},
		});

		if (!user) {
			throw new NotFoundException("Player not found");
		}

		return user;
	}

	/**
	 * Returns the paginated leaderboard ordered by ELO descending.
	 *
	 * @param query - page (default 1) and limit (default 20, max 100).
	 * @returns LeaderboardResponseDto — entries[], total, page, limit.
	 */
	async getLeaderboard(
		query: LeaderboardQueryDto,
	): Promise<LeaderboardResponseDto> {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const skip = (page - 1) * limit;

		const [entries, total] = await this.prisma.$transaction([
			this.prisma.userStats.findMany({
				orderBy: { eloCurrent: "desc" },
				skip,
				take: limit,
				select: {
					eloCurrent: true,
					user: {
						select: {
							id: true,
							username: true,
							avatarUrl: true,
						},
					},
					totalWins: true,
					totalLosses: true,
				},
			}),
			this.prisma.userStats.count(),
		]);

		return {
			entries: entries.map((entry, index) => ({
				rank: skip + index + 1,
				id: entry.user.id,
				username: entry.user.username,
				avatarUrl: entry.user.avatarUrl,
				eloCurrent: entry.eloCurrent,
				totalWins: entry.totalWins,
				totalLosses: entry.totalLosses,
			})),
			total,
			page,
			limit,
		};
	}

	/**
	 * Returns ELO of two players and the three possible point deltas
	 * for each player (win / draw / loss) based on the current ELO gap.
	 *
	 * @param query - player1Id, player2Id.
	 * @returns EloPreviewResponseDto — both player ELOs and their outcome deltas.
	 * @throws NotFoundException (404) — if either player does not exist.
	 */
	async getEloPreview(
		query: EloPreviewQueryDto,
	): Promise<EloPreviewResponseDto> {
		const [p1, p2] = await Promise.all([
			this.prisma.user.findUnique({
				where: { id: query.player1Id },
				select: {
					id: true,
					username: true,
					stats: { select: { eloCurrent: true } },
				},
			}),
			this.prisma.user.findUnique({
				where: { id: query.player2Id },
				select: {
					id: true,
					username: true,
					stats: { select: { eloCurrent: true } },
				},
			}),
		]);

		if (!p1) throw new NotFoundException("Player 1 not found");
		if (!p2) throw new NotFoundException("Player 2 not found");

		// Stats are always created atomically with the user, but fall back to
		// ELO_DEFAULT (500) for resilience, consistent with game-service behaviour.
		const elo1 = p1.stats?.eloCurrent ?? ELO_DEFAULT;
		const elo2 = p2.stats?.eloCurrent ?? ELO_DEFAULT;

		return {
			player1: { id: p1.id, username: p1.username, eloCurrent: elo1 },
			player2: { id: p2.id, username: p2.username, eloCurrent: elo2 },
			preview: {
				player1: {
					win: calculateEloDelta(elo1, elo2, "win"),
					draw: calculateEloDelta(elo1, elo2, "draw"),
					loss: calculateEloDelta(elo1, elo2, "loss"),
				},
				player2: {
					win: calculateEloDelta(elo2, elo1, "win"),
					draw: calculateEloDelta(elo2, elo1, "draw"),
					loss: calculateEloDelta(elo2, elo1, "loss"),
				},
			},
		};
	}
}
