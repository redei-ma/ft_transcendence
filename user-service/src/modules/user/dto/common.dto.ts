import { ApiProperty } from "@nestjs/swagger";

/**
 * Response for email and username availability checks.
 */
export class CheckAvailabilityResponseDto {
	@ApiProperty({
		description: "True if the value is already taken, false if available",
		example: false,
	})
	exists: boolean;
}

/**
 * Generic success response for operations that return no payload.
 */
export class SuccessResponseDto {
	@ApiProperty({
		description: "Human-readable description of the completed operation",
		example: "Operation completed successfully",
	})
	message: string;
}
