import { CharacterName, MatchType, MatchMode } from "@transcendence/types";

import {
	IsString,
	IsBoolean,
	IsEnum,
	IsNumber,
	IsOptional,
} from "class-validator";

/* Struttura del dato che ricevo quando qualcuno si vuole mettere in coda nel matchmaking */

export class JoinQueueDto {
	@IsEnum(CharacterName)
	characterName: CharacterName;

	@IsBoolean()
	isAiPlayer: boolean;

	@IsEnum(MatchType)
	matchType: MatchType;

	@IsEnum(MatchMode)
	matchMode: MatchMode;

	@IsNumber()
	rankRange: number;

	@IsOptional()
	@IsString()
	socketId?: string;
}
