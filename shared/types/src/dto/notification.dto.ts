import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString, MinLength } from "class-validator";
import { NotificationType } from "../enums";

/**
 * Body for creating a notification.
 */
export class CreateNotificationDto {
	@ApiProperty({ enum: NotificationType, example: "ACHV_UNLOCKED" })
	@IsEnum(NotificationType)
	type: NotificationType;

	@ApiProperty({ example: "You unlocked: Flawless Victory" })
	@IsString()
	@MinLength(1)
	message: string;
}
