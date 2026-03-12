import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { UserStatus } from "@transcendence/types";
import { IsUsernameField } from "@transcendence/dto";

/**
 * Update username.
 */
export class UpdateUsernameDto {
	@IsUsernameField()
	username: string;
}

/**
 * Input DTO for updating user status.
 */
export class UpdateStatusDto {
	@ApiProperty({
		description: "New user status",
		enum: UserStatus,
		example: "ONLINE",
	})
	@IsEnum(UserStatus, {
		message: `Status must be one of: ${Object.values(UserStatus).join(", ")}`,
	})
	status: UserStatus;
}
