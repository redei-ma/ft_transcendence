import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Min, IsEmail, IsString } from "class-validator";
import { Type } from "class-transformer";

/**
 * Query parameters for finding a user by ID, email, or username.
 * Used by auth-service to call user-service internal API.
 */
export class FindUserQueryDto {
	@ApiPropertyOptional({ description: "Find user by ID", example: 1 })
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
