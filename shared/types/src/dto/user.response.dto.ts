import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserStatus, Provider, CharacterName } from "../enums";

/**
 * Represents a single linked authentication method (LOCAL or OAuth).
 *
 * WARNING: Sensitive fields — never expose directly to the client:
 * - `passwordHash`
 * - `oauthId`
 */
export class AccountResponseDto {
	@ApiProperty({ description: "Account record ID", example: 1 })
	id: number;

	@ApiProperty({
		description: "Authentication provider type",
		enum: Provider,
		example: "LOCAL",
	})
	provider: Provider;

	@ApiPropertyOptional({
		description:
			"WARNING: Sensitive — bcrypt-hashed password. Present only for LOCAL accounts, null for OAuth.",
		nullable: true,
	})
	passwordHash?: string | null;

	@ApiPropertyOptional({
		description:
			"WARNING: Sensitive — unique user ID from the OAuth provider. Present only for OAuth accounts, null for LOCAL.",
		nullable: true,
	})
	oauthId?: string | null;
}

/**
 * Comprehensive user payload for internal service-to-service communication.
 * Includes all sensitive security fields and linked authentication methods.
 *
 * WARNING: Never expose directly to the client.
 * Used by: auth-service (user creation, lookup by email / username / id)
 */
export class UserWithAccountsResponseDto {
	@ApiProperty({ description: "Unique user identifier", example: 1 })
	id: number;

	@ApiProperty({ description: "Primary email address", example: "john@example.com" })
	email: string;

	@ApiProperty({ description: "Unique username", example: "john_doe" })
	username: string;

	@ApiProperty({
		description: "Avatar URL (DiceBear default or custom upload)",
		example: "https://api.dicebear.com/9.x/pixel-art/svg?seed=john_doe",
	})
	avatarUrl: string;

	@ApiProperty({ description: "Current online status", enum: UserStatus, example: "OFFLINE" })
	status: UserStatus;

	@ApiProperty({ description: "Account registration timestamp" })
	createdAt: Date;

	@ApiProperty({ description: "Whether the email address has been verified", example: false })
	isEmailVerified: boolean;

	@ApiPropertyOptional({
		description: "WARNING: Sensitive — base32-encoded TOTP secret for 2FA. Null if 2FA not configured.",
		nullable: true,
	})
	twoFactorSecret: string | null;

	@ApiProperty({ description: "Whether Two-Factor Authentication is currently enabled", example: false })
	is2faEnabled: boolean;

	@ApiProperty({
		description: "WARNING: Sensitive — JWT token version. Incremented on logout or password change.",
		example: 0,
	})
	tokenVersion: number;

	@ApiProperty({
		description: "All linked authentication accounts (LOCAL + OAuth providers)",
		type: [AccountResponseDto],
	})
	accounts: AccountResponseDto[];
}

/**
 * Base profile of the authenticated user.
 * Returned after profile reads and update operations (username, avatar).
 * Does not include: stats, sensitive security fields.
 */
export class UserProfileResponseDto {
	@ApiProperty({ description: "Unique user identifier", example: 1 })
	id: number;

	@ApiProperty({ description: "Primary email address", example: "john@example.com" })
	email: string;

	@ApiProperty({ description: "Unique username", example: "john_doe" })
	username: string;

	@ApiProperty({
		description: "Avatar URL (DiceBear default or custom upload)",
		example: "https://api.dicebear.com/9.x/pixel-art/svg?seed=john_doe",
	})
	avatarUrl: string;

	@ApiProperty({ description: "Current online status", enum: UserStatus, example: "ONLINE" })
	status: UserStatus;

	@ApiProperty({ description: "Account registration timestamp" })
	createdAt: Date;
}

/**
 * Security settings and linked authentication providers of the authenticated user.
 */
export class UserSettingsResponseDto {
	@ApiProperty({ description: "Primary email address", example: "john@example.com" })
	email: string;

	@ApiProperty({ description: "Whether the email address has been verified", example: true })
	isEmailVerified: boolean;

	@ApiProperty({ description: "Whether Two-Factor Authentication is currently enabled", example: false })
	is2faEnabled: boolean;

	@ApiProperty({
		description:
			"Whether the user has a LOCAL account (email + password). " +
			"False means the user can only authenticate via OAuth.",
		example: true,
	})
	hasLocalAccount: boolean;

	@ApiProperty({
		description: "List of linked OAuth providers. Empty array if none connected.",
		enum: Provider,
		isArray: true,
		example: ["GOOGLE"],
	})
	linkedProviders: Provider[];
}

/**
 * Per-character stats breakdown.
 */
export class CharacterStatsResponseDto {
	@ApiProperty({ description: "Playable character name", enum: CharacterName, example: "ZEUS" })
	characterName: CharacterName;

	@ApiProperty({ description: "Total wins with this character", example: 42 })
	wins: number;

	@ApiProperty({ description: "Total losses with this character", example: 18 })
	losses: number;

	@ApiProperty({ description: "Total draws with this character", example: 5 })
	draws: number;

	@ApiProperty({ description: "Total kills with this character", example: 130 })
	kills: number;

	@ApiProperty({ description: "Total deaths with this character", example: 85 })
	deaths: number;
}

/**
 * Full statistics of the authenticated user.
 * Includes ELO, win/loss/draw record, streaks, K/D ratio and per-character breakdown.
 */
export class UserStatsResponseDto {
	@ApiProperty({ description: "Current ELO rating", example: 1250 })
	eloCurrent: number;

	@ApiProperty({ description: "All-time peak ELO rating", example: 1400 })
	eloPeak: number;

	@ApiProperty({ description: "Total wins across all matches", example: 85 })
	totalWins: number;

	@ApiProperty({ description: "Total losses across all matches", example: 40 })
	totalLosses: number;

	@ApiProperty({ description: "Total draws across all matches", example: 10 })
	totalDraws: number;

	@ApiProperty({ description: "Current consecutive win streak", example: 5 })
	currentWinStreak: number;

	@ApiProperty({ description: "All-time best win streak", example: 12 })
	bestWinStreak: number;

	@ApiProperty({ description: "Current consecutive loss streak", example: 0 })
	currentLoseStreak: number;

	@ApiProperty({ description: "Total kills across all matches", example: 340 })
	totalKills: number;

	@ApiProperty({ description: "Total deaths across all matches", example: 210 })
	totalDeaths: number;

	@ApiProperty({ description: "Per-character breakdown of stats", type: [CharacterStatsResponseDto] })
	characterStats: CharacterStatsResponseDto[];
}

/**
 * Public profile of another player.
 * Does not include: email, settings, or any sensitive field.
 */
export class PublicProfileResponseDto {
	@ApiProperty({ description: "Unique player identifier", example: 42 })
	id: number;

	@ApiProperty({ description: "Player username", example: "pro_gamer" })
	username: string;

	@ApiProperty({
		description: "Player avatar URL",
		example: "https://api.dicebear.com/9.x/pixel-art/svg?seed=pro_gamer",
	})
	avatarUrl: string;

	@ApiProperty({ description: "Current online status", enum: UserStatus, example: "ONLINE" })
	status: UserStatus;

	@ApiProperty({ description: "Account registration timestamp" })
	createdAt: Date;

	@ApiProperty({
		description: "Player stats. Null if the player has not played any match yet.",
		type: UserStatsResponseDto,
		nullable: true,
	})
	stats: UserStatsResponseDto | null;
}
