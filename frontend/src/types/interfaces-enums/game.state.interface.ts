import { Vector } from "../game.types";
import { AttackType } from ".";

export interface IGameState{

	name: string;

	onEnter(): void;

	update(dt: number): void;

	onInput(entityId: string, input: Vector, attackType: AttackType): void;

	onExit(): void;
}