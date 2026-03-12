import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

/**
 * Body for accepting or rejecting a received friend request.
 */
export class RespondFriendRequestDto {
	@ApiProperty({ enum: ["ACCEPTED", "REJECTED"], example: "ACCEPTED" })
	@IsIn(["ACCEPTED", "REJECTED"])
	action: "ACCEPTED" | "REJECTED";
}
