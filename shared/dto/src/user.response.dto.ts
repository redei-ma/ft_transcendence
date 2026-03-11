import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserStatus, Provider } from "@transcendence/types";

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

	@ApiProperty({
		description: "Primary email address",
		example: "john@example.com",
	})
	email: string;

	@ApiProperty({ description: "Unique username", example: "john_doe" })
	username: string;

	@ApiProperty({
		description: "Avatar URL (DiceBear default or custom upload)",
		example: "https://api.dicebear.com/9.x/pixel-art/svg?seed=john_doe",
	})
	avatarUrl: string;

	@ApiProperty({
		description: "Current online status",
		enum: UserStatus,
		example: "OFFLINE",
	})
	status: UserStatus;

	@ApiProperty({ description: "Account registration timestamp" })
	createdAt: Date;

	@ApiProperty({
		description: "Whether the email address has been verified",
		example: false,
	})
	isEmailVerified: boolean;

	@ApiPropertyOptional({
		description:
			"WARNING: Sensitive — base32-encoded TOTP secret for 2FA. Null if 2FA not configured.",
		nullable: true,
	})
	twoFactorSecret: string | null;

	@ApiProperty({
		description: "Whether Two-Factor Authentication is currently enabled",
		example: false,
	})
	is2faEnabled: boolean;

	@ApiProperty({
		description:
			"WARNING: Sensitive — JWT token version. Incremented on logout or password change.",
		example: 0,
	})
	tokenVersion: number;

	@ApiProperty({
		description:
			"All linked authentication accounts (LOCAL + OAuth providers)",
		type: [AccountResponseDto],
	})
	accounts: AccountResponseDto[];
}
