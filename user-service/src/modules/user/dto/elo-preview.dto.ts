import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsPositive } from "class-validator";
import { Type } from "class-transformer";

export class EloPreviewQueryDto {
	@ApiProperty({ description: "First player ID" })
	@Type(() => Number)
	@IsInt()
	@IsPositive()
	player1Id: number;

	@ApiProperty({ description: "Second player ID" })
	@Type(() => Number)
	@IsInt()
	@IsPositive()
	player2Id: number;
}

class EloPreviewPlayerDto {
	@ApiProperty()
	id: number;

	@ApiProperty()
	username: string;

	@ApiProperty()
	eloCurrent: number;
}

class EloPreviewDeltasDto {
	@ApiProperty({ description: "ELO change on win" })
	win: number;

	@ApiProperty({ description: "ELO change on draw" })
	draw: number;

	@ApiProperty({ description: "ELO change on loss" })
	loss: number;
}

class EloPreviewOutcomeDto {
	@ApiProperty({ type: EloPreviewDeltasDto })
	player1: EloPreviewDeltasDto;

	@ApiProperty({ type: EloPreviewDeltasDto })
	player2: EloPreviewDeltasDto;
}

export class EloPreviewResponseDto {
	@ApiProperty({ type: EloPreviewPlayerDto })
	player1: EloPreviewPlayerDto;

	@ApiProperty({ type: EloPreviewPlayerDto })
	player2: EloPreviewPlayerDto;

	@ApiProperty({ type: EloPreviewOutcomeDto })
	preview: EloPreviewOutcomeDto;
}
