import { ApiProperty } from "@nestjs/swagger";

/**
 * Single entry in the global leaderboard.
 */
export class LeaderboardEntryDto {
	@ApiProperty({ description: "Leaderboard position (1-based)", example: 1 })
	rank: number;

	@ApiProperty({ description: "Unique player identifier", example: 42 })
	id: number;

	@ApiProperty({ description: "Player username", example: "pro_gamer" })
	username: string;

	@ApiProperty({
		description: "Player avatar URL",
		example: "https://api.dicebear.com/9.x/pixel-art/svg?seed=pro_gamer",
	})
	avatarUrl: string;

	@ApiProperty({ description: "Current ELO rating", example: 1850 })
	eloCurrent: number;

	@ApiProperty({ description: "Total wins across all matches", example: 200 })
	totalWins: number;

	@ApiProperty({ description: "Total losses across all matches", example: 50 })
	totalLosses: number;
}

/**
 * Paginated leaderboard response.
 */
export class LeaderboardResponseDto {
	@ApiProperty({ description: "Ranked list of players for the current page", type: [LeaderboardEntryDto] })
	entries: LeaderboardEntryDto[];

	@ApiProperty({ description: "Total number of players in the leaderboard", example: 1500 })
	total: number;

	@ApiProperty({ description: "Current page number (1-based)", example: 1 })
	page: number;

	@ApiProperty({ description: "Number of entries per page", example: 20 })
	limit: number;
}
