import { IsEnum, IsOptional, IsNotEmpty, IsBoolean, IsArray, IsString, ValidateNested } from "class-validator";
import { CharacterName, MatchMode, MatchType } from "../interfaces-enums";
import { Type } from "class-transformer";

export class MatchMakingDto{
	@IsEnum(CharacterName)
	characterName: CharacterName;
	
	@IsOptional()
	@IsNotEmpty()
	@IsString()
	userDbId: string | null;

	@IsBoolean()
	isAiPlayer: boolean;
}

export class CreateMatchDto {
	@IsString()
	gameId: string;

	@IsEnum(MatchType) 
	matchType: MatchType;

	@IsEnum(MatchMode)
	matchMode: MatchMode;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => MatchMakingDto)
	playersData: MatchMakingDto[];
}