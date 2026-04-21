import {
	Injectable,
	BadRequestException,
	NotFoundException,
	ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Provider } from "@transcendence/types";
import {
	CreateLocalUserDto,
	CreateOAuthUserDto,
	UpdatePasswordDto,
	LinkOAuthDto,
	Setup2faDto,
	FindUserQueryDto,
	UserWithAccountsResponseDto,
	SetPasswordDto,
	UpdateEmailDto,
	UpdateStatusDto,
} from "@transcendence/dto";
import { UserEloResponseDto } from "../dto";
import {
	USER_WITH_ACCOUNTS_SELECT,
	generateDefaultAvatar,
	isDefaultAvatar,
	ensureUserExists,
	ensureEmailAndUsernameAvailable,
} from "../helpers";

@Injectable()
export class InternalUserService {
	constructor(private readonly prisma: PrismaService) {}

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
		await ensureEmailAndUsernameAvailable(
			this.prisma,
			dto.email,
			dto.username,
		);

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
		await ensureEmailAndUsernameAvailable(
			this.prisma,
			dto.email,
			dto.username,
		);

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

	/**
	 * Returns only the current ELO of a user, for use by the matchmaking service.
	 *
	 * @param id - ID of the user.
	 * @returns UserEloResponseDto — eloCurrent.
	 * @throws NotFoundException (404) — if the user stats record does not exist.
	 */
	async getUserElo(id: number): Promise<UserEloResponseDto> {
		const stats = await this.prisma.userStats.findUnique({
			where: { userId: id },
			select: { eloCurrent: true },
		});

		if (!stats) {
			throw new NotFoundException("User stats not found");
		}

		return stats;
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
		await ensureUserExists(this.prisma, id);

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
		await ensureUserExists(this.prisma, id);

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
		await ensureUserExists(this.prisma, id);
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
		await ensureUserExists(this.prisma, id);
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
		await ensureUserExists(this.prisma, id);
		await this.prisma.user.update({
			where: { id },
			data: { status: dto.status },
		});
	}

	/**
	 * Updates the email address of a user.
	 *
	 * Side effects:
	 * - `isEmailVerified` is set to `true`.
	 * - All linked OAuth accounts are removed in the same transaction, as the
	 *   email no longer matches the provider — the user will need to re-link them.
	 *
	 * Prerequisite: the user must have a LOCAL account, otherwise removing
	 * OAuth providers would leave them with no login method.
	 *
	 * @param userId - ID of the user.
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
					isEmailVerified: true,
				},
			}),
		]);
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
		await ensureUserExists(this.prisma, id);

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
		await ensureUserExists(this.prisma, id);
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
		await ensureUserExists(this.prisma, id);
		await this.prisma.user.update({
			where: { id },
			data: {
				is2faEnabled: false,
				twoFactorSecret: null,
			},
		});
	}
}
