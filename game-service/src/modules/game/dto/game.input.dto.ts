import { IsNumber, Min, Max, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { AttackType } from '@transcendence/types';

export class GameInputDto {
	@IsNotEmpty()
	@IsNumber()
	@Min(-1.0)
	@Max(1.0)
	x: number;

	@IsNotEmpty()
	@IsNumber()
	@Min(-1.0)
	@Max(1.0)
	z: number;

	@IsOptional()
	@IsNotEmpty()
	@IsEnum(AttackType)
	attackType: AttackType

	@IsOptional()
	@IsNumber()
	@IsNotEmpty()
	playerIndex: number;
}