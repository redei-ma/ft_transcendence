import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

/**
 * Body for sending a game invite with optional TTL.
 */
export class SendGameInviteDto {
	@ApiPropertyOptional({
		description: "Invite TTL in seconds (default: 60, max: 300)",
		example: 60,
	})
	@IsOptional()
	@IsInt()
	@Min(10)
	@Max(300)
	expiresInSeconds?: number = 60;
}

/**
 * Body for accepting or rejecting a received game invite.
 */
export class RespondGameInviteDto {
	@ApiProperty({ enum: ["ACCEPTED", "REJECTED"], example: "ACCEPTED" })
	@IsIn(["ACCEPTED", "REJECTED"])
	action: "ACCEPTED" | "REJECTED";
}

/**
 * Response when responding to a game invite.
 * sessionId is populated only when the invite is ACCEPTED and a session has been created.
 */
export class RespondGameInviteResponseDto {
	@ApiPropertyOptional({
		description: "Session ID to join matchmaking WS for character selection (only when ACCEPTED)",
		example: "session_abc123",
	})
	sessionId: string | null;
}
