import { IsEnum, IsOptional, IsNotEmpty, IsNumber, IsBoolean, IsPositive, IsArray, IsString, ValidateNested } from "class-validator";
import { CharacterName, MatchMode, MatchType } from "../interfaces-enums";
import { Type } from "class-transformer";

export class MatchMakingDto{
	@IsEnum(CharacterName)
	characterName: CharacterName;
	
	@IsOptional()
	@IsNotEmpty()
	@IsNumber()
	userDbId: number | null;

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