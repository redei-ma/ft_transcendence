import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { UserStatus } from "@transcendence/types";
import {
	IsEmailField,
	IsUsernameField,
	IsPasswordHashField,
} from "@transcendence/types";

/**
 * Input DTO for setting a password.
 * Password must be pre-hashed by the auth-service.
 */
export class SetPasswordDto {
	@IsPasswordHashField()
	passwordHash: string;
}

/**
 * Update username.
 * If the user still has a default DiceBear avatar, it will be regenerated.
 */
export class UpdateUsernameDto {
	@IsUsernameField()
	username: string;
}

/**
 * Input DTO for updating email.
 */
export class UpdateEmailDto {
	@IsEmailField()
	email: string;
}

/**
 * Input DTO for updating user status.
 */
export class UpdateStatusDto {
	@ApiProperty({ description: "New user status", enum: UserStatus, example: "ONLINE" })
	@IsEnum(UserStatus, {
		message: `Status must be one of: ${Object.values(UserStatus).join(", ")}`,
	})
	status: UserStatus;
}
