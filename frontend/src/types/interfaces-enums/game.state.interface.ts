import { Logger } from "@nestjs/common";
import { Vector } from "../game.types";
import { AttackType } from ".";

export interface IGameState{

	logger: Logger;

	name: string;

	onEnter(): void;

	update(dt: number): void;

	onInput(entityId: string, input: Vector, attackType: AttackType): void;

	onExit(): void;
}