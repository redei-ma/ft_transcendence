import { ApiProperty, ApiPropertyOptional, PickType } from "@nestjs/swagger";
import {
	IsEmail,
	IsString,
	MinLength,
	MaxLength,
	Matches,
	IsEnum,
	IsOptional,
} from "class-validator";
import {
	MatchMode,
	MatchType,
	EndReason,
	CharacterName,
	Provider,
} from "@prisma/client";

/**
 * Input DTO for local user registration.
 * Password must be pre-hashed by the auth-service.
 */
export class CreateLocalUserDto {
	@ApiProperty({
		description: "User email address (must be unique)",
		example: "john@example.com",
	})
	@IsEmail({}, { message: "Invalid email format" })
	email: string;

	@ApiProperty({
		description:
			"Username (3-20 chars, lowercase letters, numbers and underscores only)",
		example: "john_doe",
		minLength: 3,
		maxLength: 20,
	})
	@IsString()
	@MinLength(3, { message: "Username must be at least 3 characters" })
	@MaxLength(20, { message: "Username must be at most 20 characters" })
	@Matches(/^[a-z0-9_]+$/, {
		message:
			"Username can only contain lowercase letters, numbers, and underscores",
	})
	username: string;

	@ApiProperty({
		description: "Bcrypt-hashed password (hashed by auth-service)",
		example: "$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLM",
		minLength: 60,
	})
	@IsString()
	@MinLength(60, { message: "Invalid password hash format" })
	passwordHash: string;
}

/**
 * All providers except LOCAL are valid for OAuth registration.
 */

const OAuthProviders = Object.values(Provider).filter(
	(p) => p !== Provider.LOCAL,
);

export class CreateOAuthUserDto extends PickType(CreateLocalUserDto, [
	"email",
	"username",
] as const) {
	@ApiProperty({
		description: "Unique ID from the OAuth provider",
		example: "110248495921238986420",
	})
	@IsString()
	@MinLength(1, { message: "OAuth ID is required" })
	oauthId: string;

	@ApiProperty({
		description: "OAuth provider name",
		enum: OAuthProviders,
		example: "GOOGLE",
	})
	@IsEnum(OAuthProviders, {
		message: `Provider must be one of: ${OAuthProviders.join(", ")}`,
	})
	provider: Exclude<Provider, "LOCAL">;

	@ApiPropertyOptional({
		description:
			"Avatar URL from OAuth provider. If omitted, a default DiceBear avatar is generated.",
		example: "https://lh3.googleusercontent.com/a/photo.jpg",
	})
	@IsOptional()
	@IsString()
	avatarUrl?: string;
}
