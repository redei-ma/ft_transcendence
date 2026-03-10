import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import {
	IsInt,
	IsOptional,
	Max,
	Min,
	IsEmail,
	IsString,
	MinLength,
	MaxLength,
	Matches,
	IsEnum,
	IsBoolean,
} from "class-validator";
import { Type, Transform, TransformFnParams } from "class-transformer";
import { MatchMode } from "@transcendence/types";

/**
 * Query parameter for checking if an email is already in use.
 */
export class CheckEmailQueryDto {
	@ApiProperty({ description: "Email to check for availability", example: "john@example.com" })
	@IsEmail({}, { message: "Invalid email format" })
	email: string;
}

/**
 * Query parameter for checking if a username is already in use.
 */
export class CheckUsernameQueryDto {
	@ApiProperty({ description: "Username to check for availability", example: "john_doe" })
	@IsString()
	@MinLength(3, { message: "Username must be at least 3 characters" })
	@MaxLength(20, { message: "Username must be at most 20 characters" })
	@Matches(/^[a-z0-9_]+$/, {
		message: "Username can only contain lowercase letters, numbers, and underscores",
	})
	username: string;
}

/**
 * Query parameters for retrieving the user leaderboard with pagination.
 */
export class LeaderboardQueryDto {
	@ApiPropertyOptional({ description: "Page number (starting from 1)", example: 1, default: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1;

	@ApiPropertyOptional({ description: "Elements per page (max 100)", example: 20, default: 20 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number = 20;
}

/**
 * Query parameters for paginated match history with optional mode filter.
 */
export class MatchHistoryQueryDto {
	@ApiPropertyOptional({ description: "Page number (1-based)", example: 1, default: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1;

	@ApiPropertyOptional({ description: "Entries per page (max 50)", example: 20, default: 20 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(50)
	limit?: number = 20;

	@ApiPropertyOptional({ enum: MatchMode, description: "Filter by match mode" })
	@IsOptional()
	@IsEnum(MatchMode)
	mode?: MatchMode;
}

/**
 * Query parameters for paginated notifications with optional unread filter.
 */
export class NotificationsQueryDto {
	@ApiPropertyOptional({ example: 1, default: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1;

	@ApiPropertyOptional({ example: 20, default: 20 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(50)
	limit?: number = 20;

	@ApiPropertyOptional({ example: false, description: "Return only unread notifications" })
	@IsOptional()
	@Transform(({ value }: TransformFnParams) => value === "true" || value === true)
	@IsBoolean()
	unreadOnly?: boolean = false;
}
