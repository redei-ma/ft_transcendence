import { applyDecorators } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import {
	IsEmail,
	IsEnum,
	IsString,
	MinLength,
	MaxLength,
	Matches,
} from "class-validator";
import { Provider } from "@transcendence/types";

export function IsUsernameField() {
	return applyDecorators(
		ApiProperty({ example: "john_doe", minLength: 3, maxLength: 20 }),
		IsString(),
		MinLength(3, { message: "Username must be at least 3 characters" }),
		MaxLength(20, { message: "Username must be at most 20 characters" }),
		Matches(/^[a-z0-9_]+$/, {
			message:
				"Username can only contain lowercase letters, numbers, and underscores",
		}),
	);
}

export function IsEmailField() {
	return applyDecorators(
		ApiProperty({ example: "john@example.com" }),
		IsEmail({}, { message: "Invalid email format" }),
	);
}

export function IsPasswordHashField() {
	return applyDecorators(
		ApiProperty({ example: "$2b$10$abc...", minLength: 10 }),
		IsString(),
		MinLength(10, { message: "Invalid password hash format" }),
	);
}

export function IsOAuthIdField() {
	return applyDecorators(
		ApiProperty({ example: "110248495921238986420" }),
		IsString(),
		MinLength(1, { message: "OAuth ID is required" }),
	);
}

const OAuthProviders = Object.values(Provider).filter(
	(p) => p !== Provider.LOCAL,
);

export function IsOAuthProviderField() {
	return applyDecorators(
		ApiProperty({ enum: OAuthProviders, example: "GOOGLE" }),
		IsEnum(OAuthProviders, {
			message: `Provider must be one of: ${OAuthProviders.join(", ")}`,
		}),
	);
}