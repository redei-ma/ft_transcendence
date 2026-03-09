import { IsEnum, IsNotEmpty, IsBoolean, IsArray, IsString, ValidateNested, ValidateIf } from "class-validator";
import { MatchMode, MatchType, CharacterName } from "@transcendence/types";
import { Type } from "class-transformer";

export class MatchMakingDto{
	@IsEnum(CharacterName)
	characterName: CharacterName;

	@ValidateIf(object => object.userDbId !== null)
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