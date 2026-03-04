import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class GameMessageDto{
	@IsNotEmpty()
	@IsString()
	@MaxLength(100)
	message: string;
}