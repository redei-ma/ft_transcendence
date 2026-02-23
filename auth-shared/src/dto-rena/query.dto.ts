import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import {
	IsOptional,
	IsEmail,
	IsString,
	IsInt,
	Min,
	Max,
	MinLength,
	MaxLength,
	Matches,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * Query parameters for finding a user by ID, email, or username.
 */
export class FindUserQueryDto {
	@ApiPropertyOptional({
		description: "Find user by ID",
		example: 1,
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: "id must be an integer" })
	@Min(1)
	id?: number;

	@ApiPropertyOptional({
		description: "Find user by email",
		example: "john@example.com",
	})
	@IsOptional()
	@IsEmail({}, { message: "Invalid email format" })
	email?: string;

	@ApiPropertyOptional({
		description: "Find user by username",
		example: "john_doe",
	})
	@IsOptional()
	@IsString()
	username?: string;
}

/**
 * Query parameter for checking if an email is already in use.
 */
export class CheckEmailQueryDto {
	@ApiProperty({
		description: "Email to check for availability",
		example: "john@example.com",
	})
	@IsEmail({}, { message: "Invalid email format" })
	email: string;
}

/**
 * Query parameter for checking if a username is already in use.
 */
export class CheckUsernameQueryDto {
	@ApiProperty({
		description: "Username to check for availability",
		example: "john_doe",
	})
	@IsString()
	@MinLength(3, { message: "Username must be at least 3 characters" })
	@MaxLength(20, { message: "Username must be at most 20 characters" })
	@Matches(/^[a-z0-9_]+$/, {
		message:
			"Username can only contain lowercase letters, numbers, and underscores",
	})
	username: string;
}

/**
 * Query parameters for retrieving the user leaderboard with pagination.
 */
export class LeaderboardQueryDto {
	@ApiPropertyOptional({
		description: "Number of the page to retrieve (starting from 1)",
		example: 1,
		default: 1,
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1;

	@ApiPropertyOptional({
		description: "Elements per page (max 100)",
		example: 20,
		default: 20,
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number = 20;
}
