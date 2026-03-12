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

export function IsPasswordField() {
    return applyDecorators(
        ApiProperty({
            example: "StrongP@ss123",
            minLength: 10,
            description: "At least 10 chars, 1 uppercase, 1 lowercase, 1 number, and 1 special char: @$!%*?&  "
        }),
        IsString(),
        MinLength(10, { message: "Password must be at least 10 characters long. " }),
        Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]*$/, {
            message: "Password is too weak. It must contain at least one uppercase letter, one lowercase letter, one number, and one special character: @$!%*?& ",
        }),
    );
}

export function IsUsernameField() {
	return applyDecorators(
		ApiProperty({ example: "john_doe", minLength: 3, maxLength: 20 }),
		IsString(),
		MinLength(3, { message: "Username must be at least 3 characters. " }),
		MaxLength(20, { message: "Username must be at most 20 characters. " }),
		Matches(/^[a-z0-9_]+$/, {
			message:
				"Username can only contain lowercase letters, numbers, and underscores. ",
		}),
	);
}

export function IsEmailField() {
	return applyDecorators(
		ApiProperty({ example: "john@example.com" }),
		IsEmail({}, { message: "Invalid email format. " }),
	);
}

export function IsPasswordHashField() {
	return applyDecorators(
		ApiProperty({ example: "$2b$10$abc...", minLength: 10 }),
		IsString(),
		MinLength(10, { message: "Invalid password hash format. " }),
	);
}

export function IsOAuthIdField() {
	return applyDecorators(
		ApiProperty({ example: "110248495921238986420" }),
		IsString(),
		MinLength(1, { message: "OAuth ID is required. " }),
	);
}

const OAuthProviders = Object.values(Provider).filter(
	(p) => p !== Provider.LOCAL,
);

export function IsOAuthProviderField() {
	return applyDecorators(
		ApiProperty({ enum: OAuthProviders, example: "GOOGLE" }),
		IsEnum(OAuthProviders, {
			message: `Provider must be one of: ${OAuthProviders.join(", ")}. `,
		}),
	);
}
