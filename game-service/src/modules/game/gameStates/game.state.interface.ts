import { Logger } from "@nestjs/common";
import { Vector, AttackType, ExitStatus } from "@transcendence/types";
import { MatchMakingData } from "../game-interfaces";

export interface IGameState{

	logger: Logger;

	name: string;

	onEnter(): void;

	update(dt: number): void;

	onInput(entityId: string, input: Vector, attackType: AttackType): void;

	addPlayer(player: MatchMakingData, socketId: string | undefined): ExitStatus;

	reconnectPlayer(userdbId: number, socketId: string): ExitStatus;

	onExit(): void;
}