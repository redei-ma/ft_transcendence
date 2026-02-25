import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { Provider } from "../enums";
import {
	IsEmailField,
	IsUsernameField,
	IsPasswordHashField,
	IsOAuthIdField,
	IsOAuthProviderField,
} from "./field-validators";

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