import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { Equals } from "class-validator";
import { Provider } from "@transcendence/types";
import {
	IsEmailField,
	IsUsernameField,
	IsPasswordHashField,
	IsOAuthIdField,
	IsOAuthProviderField,
	IsPasswordField
} from "./field-validators";

/**
 * Input DTO for local user registration.
 */
export class CreateLocalUserNoHashDto {
	@IsEmailField()
	email: string;

	@IsUsernameField()
	username: string;

	@IsPasswordField()
	password: string;

	@ApiProperty({ description: "User must have accepted the Terms of Service and Privacy Policy", example: true })
	@IsBoolean()
	@Equals(true, { message: "You must accept the Terms of Service and Privacy Policy to register." })
	termsAccepted: boolean;
}

/**
 * Input DTO for local user registration.
 * Password must be pre-hashed by the auth-service.
 */
export class CreateLocalUserDto {
	@IsEmailField()
	email: string;

	@IsUsernameField()
	username: string;

	@IsPasswordHashField()
	passwordHash: string;
}

/**
 * Input DTO for OAuth user registration.
 */
export class CreateOAuthUserDto {
	@IsEmailField()
	email: string;

	@IsUsernameField()
	username: string;

	@IsOAuthIdField()
	oauthId: string;

	@IsOAuthProviderField()
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
