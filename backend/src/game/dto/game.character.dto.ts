import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional } from "class-validator";
import { CharacterName, MatchType } from "../interfaces-enums";

export class CharacterDto{

	@IsNotEmpty()
	@IsArray()
	@IsEnum(CharacterName, {each: true, message: 'invalid character by frontend payload'})
	characterName: CharacterName[];

	@IsOptional()
	@IsNotEmpty()
	@IsNumber()
	userDbId: number;

	@IsOptional()
	@IsNotEmpty()
	@IsBoolean()
	isLocalGame: boolean;

	@IsOptional()
	@IsNotEmpty()
	@IsBoolean()
	isAiGame: boolean;

	@IsNotEmpty()
	@IsEnum(MatchType)
	matchType: MatchType
}