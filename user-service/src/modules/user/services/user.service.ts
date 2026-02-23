import {
	Injectable,
	BadRequestException,
	NotFoundException,
	ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Provider } from "@prisma/client";
import {
	CreateLocalUserDto,
	CreateOAuthUserDto,
	SetPasswordDto,
	UpdatePasswordDto,
	UpdateUsernameDto,
	UpdateEmailDto,
	UpdateAvatarDto,
	UpdateStatusDto,
	LinkOAuthDto,
	Setup2faDto,
	FindUserQueryDto,
	LeaderboardQueryDto,
	UserWithAccountsResponseDto,
	UserProfileResponseDto,
	UserStatsResponseDto,
	UserSettingsResponseDto,
	PublicProfileResponseDto,
	LeaderboardResponseDto,
	CheckAvailabilityResponseDto,
} from "../dto";
/**
 * Select Prisma fields for user queries that include accounts.
 */
const USER_WITH_ACCOUNTS_SELECT = {
	id: true,
	email: true,
	username: true,
	avatarUrl: true,
	status: true,
	createdAt: true,
	isEmailVerified: true,
	twoFactorSecret: true,
	is2faEnabled: true,
	tokenVersion: true,
	accounts: {
		select: {
			id: true,
			provider: true,
			passwordHash: true,
			oauthId: true,
		},
	},
} as const;

/** Generates a default avatar URL using the DiceBear Shapes API. */
const generateDefaultAvatar = (seed: string): string =>
	`https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(seed)}`;

/** Checks if the given URL is a default avatar. */
const isDefaultAvatar = (url: string): boolean =>
	url.startsWith("https://api.dicebear.com/");

@Injectable()
export class UserService {
	constructor(private readonly prisma: PrismaService) {}

	// ═════════════════════════════════════════════════════════════════════════════
	// INTERNAL API
	// ═════════════════════════════════════════════════════════════════════════════

	// ─── Create user ───────────────────────────────────────────────────────────────────────────────

	/**
	 * Creates a new user with LOCAL (email + password) registration.
	 *
	 * Creates three records in a single Prisma nested write:
	 * - User (email, username, generated avatar)
	 * - Account (provider=LOCAL, passwordHash)
	 * - UserStats (with all default values)
	 *
	 * @param dto - email, username, passwordHash.
	 * @returns UserWithAccountsResponseDto - user data + all linked accounts (including passwordHash and oauthId).
	 * @throws ConflictException if email or username already exists.
	 */
	async createLocalUser(
		dto: CreateLocalUserDto,
	): Promise<UserWithAccountsResponseDto> {
		await this.ensureEmailAndUsernameAvailable(dto.email, dto.username);

		return this.prisma.user.create({
			data: {
				email: dto.email,
				username: dto.username,
				avatarUrl: generateDefaultAvatar(dto.username),
				accounts: {
					create: {
						provider: Provider.LOCAL,
						passwordHash: dto.passwordHash,
					},
				},
				stats: {
					create: {},
				},
			},
			select: USER_WITH_ACCOUNTS_SELECT,
		});
	}

	/**
	 * Creates a new user with OAuth registration.
	 *
	 * Creates three records in a single Prisma nested write:
	 * - User (email, username, avatar from provider or DiceBear)
	 * - Account (provider, oauthId)
	 * - UserStats (with all default values)
	 *
	 * Email is marked as verified (OAuth = verified email).
	 *
	 * @param dto - oauthId, provider, email, username, avatarUrl (optional)
	 * @returns UserWithAccountsResponseDto - user data + all linked accounts (including passwordHash and oauthId).
	 * @throws ConflictException if email, username, or OAuth account already exists.
	 */
	async createOAuthUser(
		dto: CreateOAuthUserDto,
	): Promise<UserWithAccountsResponseDto> {
		await this.ensureEmailAndUsernameAvailable(dto.email, dto.username);

		return this.prisma.user.create({
			data: {
				email: dto.email,
				username: dto.username,
				avatarUrl: dto.avatarUrl ?? generateDefaultAvatar(dto.username),
				isEmailVerified: true,
				accounts: {
					create: {
						provider: dto.provider,
						oauthId: dto.oauthId,
					},
				},
				stats: {
					create: {},
				},
			},
			select: USER_WITH_ACCOUNTS_SELECT,
		});
	}

	// ─── Get user ──────────────────────────────────────────────────────────────────────────────────

	/**
	 * Find a user by ID, email, or username.
	 *
	 * @param query - at least one of: id, email, username.
	 * @returns UserWithAccountsResponseDto - user data + all linked accounts (including passwordHash and oauthId).
	 * @throws BadRequestException (400) - if no query parameters are provided.
	 * @throws NotFoundException (404) - if user is not found.
	 */
	async findUser(
		query: FindUserQueryDto,
	): Promise<UserWithAccountsResponseDto> {
		const where = query.id
			? { id: query.id }
			: query.email
				? { email: query.email }
				: query.username
					? { username: query.username }
					: null;

		if (!where) {
			throw new BadRequestException(
				"At least one query parameter is required: id, email, or username",
			);
		}

		const user = await this.prisma.user.findUnique({
			where,
			select: USER_WITH_ACCOUNTS_SELECT,
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		return user;
	}

	/**
	 * Find a user by OAuth provider and ID.
	 *
	 * @param provider - OAuth provider.
	 * @param oauthId - OAuth user ID given by the provider.
	 * @returns UserWithAccountsResponseDto - user data + all linked accounts.
	 * @throws NotFoundException (404) - if user is not found.
	 */
	async findUserOauth(
		provider: Provider,
		oauthId: string,
	): Promise<UserWithAccountsResponseDto> {
		const user = await this.prisma.user.findFirst({
			where: {
				accounts: {
					some: {
						provider,
						oauthId,
					},
				},
			},
			select: USER_WITH_ACCOUNTS_SELECT,
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		return user;
	}

	// ─── Update user ───────────────────────────────────────────────────────────────────────────────

	/**
	 * Creates a LOCAL account for an OAuth-only user.
	 *
	 * This enables email+password login.
	 *
	 * @param id - ID of the user.
	 * @param dto - passwordHash already hashed by the Auth Service.
	 *
	 * @throws NotFoundException (404) — if the user does not exist.
	 * @throws ConflictException (409) — if a LOCAL account already exists.
	 */
	async setPassword(id: number, dto: SetPasswordDto): Promise<void> {
		await this.ensureUserExists(id);

		const existing = await this.prisma.account.findUnique({
			where: {
				userId_provider: { userId: id, provider: Provider.LOCAL },
			},
		});

		if (existing) {
			throw new ConflictException(
				"Local account already exists. Use change-password instead.",
			);
		}

		await this.prisma.account.create({
			data: {
				userId: id,
				provider: Provider.LOCAL,
				passwordHash: dto.passwordHash,
			},
		});
	}

	/**
	 * Updates the password hash on an existing LOCAL account.
	 *
	 * @param id - ID of the user.
	 * @param dto - New passwordHash.
	 *
	 * @throws NotFoundException (404) — if the user or LOCAL account does not exist.
	 */
	async changePassword(id: number, dto: UpdatePasswordDto): Promise<void> {
		await this.ensureUserExists(id);

		const account = await this.prisma.account.findUnique({
			where: {
				userId_provider: { userId: id, provider: Provider.LOCAL },
			},
		});

		if (!account) {
			throw new NotFoundException(
				"No local account found. Use set-password to create one.",
			);
		}

		await this.prisma.account.update({
			where: { id: account.id },
			data: { passwordHash: dto.passwordHash },
		});
	}

	/**
	 * Marks the user's email as verified.
	 *
	 * @param id - ID of the user.
	 * @throws NotFoundException (404) — if the user does not exists.
	 */
	async verifyEmail(id: number): Promise<void> {
		await this.ensureUserExists(id);
		await this.prisma.user.update({
			where: { id },
			data: { isEmailVerified: true },
		});
	}

	/**
	 * Increments the token version to invalidate existing JWTs.
	 *
	 * @param id - ID of the user.
	 * @throws NotFoundException (404) — if the user does not exist.
	 */
	async incrementTokenVersion(id: number): Promise<void> {
		await this.ensureUserExists(id);
		await this.prisma.user.update({
			where: { id },
			data: { tokenVersion: { increment: 1 } },
		});
	}

	/**
	 * Updates the user's status (e.g. ONLINE, OFFLINE, IN_GAME).
	 *
	 * @param id - ID of the user.
	 * @param dto - New status.
	 * @throws NotFoundException (404) — if the user does not exist.
	 */
	async updateStatus(id: number, dto: UpdateStatusDto): Promise<void> {
		await this.ensureUserExists(id);
		await this.prisma.user.update({
			where: { id },
			data: { status: dto.status },
		});
	}

	// ─── OAuth ─────────────────────────────────────────────────────────────────────────────────────

	/**
	 * Links an OAuth account to an existing user.
	 *
	 * Side effects:
	 * - If the user has a default DiceBear avatar and the provider
	 *   supplies an avatarUrl, the avatar is overwritten.
	 * - If isEmailVerified is false, it is set to true
	 *   (OAuth providers verify email ownership).
	 *
	 * @param id - ID of the user.
	 * @param provider - Provider to link (e.g. "GOOGLE").
	 * @param dto - oauthId and avatarUrl (optional).
	 *
	 * @throws NotFoundException (404) — if the user does not exist.
	 * @throws ConflictException (409) — if the provider is already linked to this user.
	 * @throws ConflictException (409) — if the oauthId is already linked to another user.
	 */
	async linkOAuth(
		id: number,
		provider: Provider,
		dto: LinkOAuthDto,
	): Promise<void> {
		const user = await this.prisma.user.findUnique({
			where: { id },
			select: { id: true, avatarUrl: true, isEmailVerified: true },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		const existingByProvider = await this.prisma.account.findUnique({
			where: { userId_provider: { userId: id, provider } },
		});

		if (existingByProvider) {
			throw new ConflictException(
				`Provider ${provider} is already linked to this user`,
			);
		}

		const existingByOAuthId = await this.prisma.account.findUnique({
			where: {
				provider_oauthId: {
					provider,
					oauthId: dto.oauthId,
				},
			},
		});

		if (existingByOAuthId) {
			throw new ConflictException(
				`This ${provider} account is already linked to another user`,
			);
		}

		await this.prisma.$transaction(async (tx) => {
			await tx.account.create({
				data: {
					userId: id,
					provider,
					oauthId: dto.oauthId,
				},
			});

			const updateData: Record<string, unknown> = {};

			if (!user.isEmailVerified) {
				updateData.isEmailVerified = true;
			}

			if (dto.avatarUrl && isDefaultAvatar(user.avatarUrl)) {
				updateData.avatarUrl = dto.avatarUrl;
			}

			if (Object.keys(updateData).length > 0) {
				await tx.user.update({ where: { id }, data: updateData });
			}
		});
	}

	/**
	 * Unlinks an OAuth account from the user.
	 *
	 * Ensures at least one login method remains after removal.
	 *
	 * @param id - ID of the user.
	 * @param provider - Provider OAuth to unlink (e.g. "GOOGLE").
	 *
	 * @throws NotFoundException (404) — if the user does not exist.
	 * @throws NotFoundException (404) — if the provider is not linked to this user.
	 * @throws BadRequestException (400) — if it is the last login method.
	 */
	async unlinkOAuth(id: number, provider: Provider): Promise<void> {
		await this.ensureUserExists(id);

		const account = await this.prisma.account.findUnique({
			where: { userId_provider: { userId: id, provider } },
		});

		if (!account) {
			throw new NotFoundException(
				`Provider ${provider} is not linked to this user`,
			);
		}

		const accountCount = await this.prisma.account.count({
			where: { userId: id },
		});

		if (accountCount <= 1) {
			throw new BadRequestException(
				"Cannot unlink the last login method. Add a password or another provider first.",
			);
		}

		await this.prisma.account.delete({ where: { id: account.id } });
	}

	// ─── 2FA ─────────────────────────────────────────────────────────────────────────────────────

	/**
	 * Saves the TOTP secret for 2FA setup (step 1).
	 *
	 * The auth-service generates the TOTP secret, sends it here
	 * for storage. 2FA is NOT yet active — the user must confirm
	 * with a valid code first (step 2: enable).
	 *
	 * @param id - ID of the user.
	 * @param dto - twoFactorSecret in base32 format.
	 *
	 * @throws NotFoundException (404) — if the user does not exist.
	 */
	async setup2fa(id: number, dto: Setup2faDto): Promise<void> {
		await this.ensureUserExists(id);
		await this.prisma.user.update({
			where: { id },
			data: { twoFactorSecret: dto.twoFactorSecret },
		});
	}

	/**
	 * Activates 2FA after verifying the TOTP code (step 2).
	 *
	 * Requires that the TOTP secret is already set (step 1).
	 *
	 * @param id - ID of the user.
	 *
	 * @throws NotFoundException (404) — if the user does not exist.
	 * @throws BadRequestException (400) — if the TOTP secret is not configured.
	 */
	async enable2fa(id: number): Promise<void> {
		const user = await this.prisma.user.findUnique({
			where: { id },
			select: { id: true, twoFactorSecret: true },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		if (!user.twoFactorSecret) {
			throw new BadRequestException(
				"2FA secret not configured. Run setup first.",
			);
		}

		await this.prisma.user.update({
			where: { id },
			data: { is2faEnabled: true },
		});
	}

	/**
	 * Disables 2FA and removes the TOTP secret.
	 *
	 * @param id - ID of the user.
	 * @throws NotFoundException (404) — if the user does not exist.
	 */
	async disable2fa(id: number): Promise<void> {
		await this.ensureUserExists(id);
		await this.prisma.user.update({
			where: { id },
			data: {
				is2faEnabled: false,
				twoFactorSecret: null,
			},
		});
	}

	// ═════════════════════════════════════════════════════════════════════════════
	// PUBLIC API
	// ═════════════════════════════════════════════════════════════════════════════

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
			select: {
				id: true,
				email: true,
				username: true,
				avatarUrl: true,
				status: true,
				createdAt: true,
			},
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
			select: {
				id: true,
				email: true,
				username: true,
				avatarUrl: true,
				status: true,
				createdAt: true,
			},
		});
	}

	/**
	 * Updates the email address of the authenticated user.
	 *
	 * Side effects:
	 * - `isEmailVerified` is set to false (requires re-verification).
	 * - All linked OAuth accounts are removed, as the email no longer
	 *   matches the provider — the user will need to re-link them.
	 *
	 * Prerequisite: the user must have a LOCAL account, otherwise unlinking
	 * OAuth providers would leave them with no login method.
	 *
	 * @param userId - ID of the authenticated user (from JWT).
	 * @param dto - New email address.
	 * @throws NotFoundException (404) — if the user does not exist.
	 * @throws ConflictException (409) — if the email is already in use.
	 * @throws BadRequestException (400) — if the user has no LOCAL account.
	 */
	async updateEmail(userId: number, dto: UpdateEmailDto): Promise<void> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				accounts: { select: { id: true, provider: true } },
			},
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		const hasLocal = user.accounts.some(
			(a) => a.provider === Provider.LOCAL,
		);
		if (!hasLocal) {
			throw new BadRequestException(
				"Cannot change email without a local account. Set a password first.",
			);
		}

		const existing = await this.prisma.user.findUnique({
			where: { email: dto.email },
			select: { id: true },
		});

		if (existing && existing.id !== userId) {
			throw new ConflictException("Email is already in use");
		}

		const oauthAccountIds = user.accounts
			.filter((a) => a.provider !== Provider.LOCAL)
			.map((a) => a.id);

		await this.prisma.$transaction([
			...(oauthAccountIds.length > 0
				? [
						this.prisma.account.deleteMany({
							where: { id: { in: oauthAccountIds } },
						}),
					]
				: []),
			this.prisma.user.update({
				where: { id: userId },
				data: {
					email: dto.email,
					isEmailVerified: false,
				},
			}),
		]);
	}

	/**
	 * Updates the avatar of the authenticated user.
	 *
	 * - If `avatarUrl` is provided, it is set as the custom avatar.
	 * - If `avatarUrl` is omitted or null, the avatar is reset to the
	 *   DiceBear default generated from the current username.
	 *
	 * @param userId - ID of the authenticated user (from JWT).
	 * @param dto - avatarUrl (optional).
	 * @returns UserProfileResponseDto — updated profile.
	 * @throws NotFoundException (404) — if the user does not exist.
	 */
	async updateAvatar(
		userId: number,
		dto: UpdateAvatarDto,
	): Promise<UserProfileResponseDto> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, username: true },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		const avatarUrl = dto.avatarUrl ?? generateDefaultAvatar(user.username);
		return this.prisma.user.update({
			where: { id: userId },
			data: { avatarUrl },
			select: {
				id: true,
				email: true,
				username: true,
				avatarUrl: true,
				status: true,
				createdAt: true,
			},
		});
	}

	/**
	 * Permanently deletes the user and all associated data.
	 *
	 * Cascade (onDelete: Cascade) automatically removes:
	 * Account, UserStats, CharacterStats, Friendship,
	 * GameInvite, UserAchievement, Notification.
	 *
	 * SetNull (onDelete: SetNull) preserves match history:
	 * Match.winnerId and MatchParticipant.userId are set to null.
	 *
	 * @param id - ID of the authenticated user (from JWT).
	 * @throws NotFoundException (404) — if the user does not exist.
	 */
	async deleteUser(id: number): Promise<void> {
		await this.findUser({ id });
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
	 * Retrieves the public profile of a player.
	 * Character stats are loaded in a separate query only if the stats record exists.
	 *
	 * @param id - ID of the player to look up.
	 * @returns PublicProfileResponseDto — profile and stats (null if the player has never played).
	 * @throws NotFoundException (404) — if the player does not exist.
	 */
	async getPublicProfile(id: number): Promise<PublicProfileResponseDto> {
		const user = await this.prisma.user.findUnique({
			where: { id },
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
				where: { userId: id },
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

	// ═════════════════════════════════════════════════════════════════════════════
	// PRIVATE HELPERS
	// ═════════════════════════════════════════════════════════════════════════════

	/**
	 * Throws ConflictException if email or username are already registered.
	 *
	 * @throws ConflictException (409) — if email or username is already taken.
	 */
	private async ensureEmailAndUsernameAvailable(
		email: string,
		username: string,
	): Promise<void> {
		const existing = await this.prisma.user.findFirst({
			where: { OR: [{ email }, { username }] },
			select: { email: true, username: true },
		});

		if (existing) {
			if (existing.email === email) {
				throw new ConflictException("Email is already registered");
			}
			throw new ConflictException("Username is already taken");
		}
	}

	/**
	 * Throws NotFoundException if no user exists with the given ID.
	 *
	 * @throws NotFoundException (404) — if the user does not exist.
	 */
	private async ensureUserExists(id: number): Promise<void> {
		const user = await this.prisma.user.findUnique({
			where: { id },
			select: { id: true },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}
	}
}
