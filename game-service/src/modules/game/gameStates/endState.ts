import { Logger } from "@nestjs/common";
import { Vector, GameConfig, AttackType } from "@transcendence/types";
import { GameSession } from "../core/game.session";
import { IGameState } from "./game.state.interface";

export class EndState implements IGameState{
	logger: Logger = new Logger(EndState.name);
	name = 'END';
	private shutdownTimer: number = 0.0;
	public isReadyToClose: boolean = false;
	constructor(private readonly session: GameSession) {}
	onEnter(): void {
		this.logger.log("Game is over, shutdown the server")
	}

	update(dt: number): void {
		this.shutdownTimer += dt;
		if (this.shutdownTimer >= GameConfig.SERVER.SHUTDOWN_TIMER){
			this.isReadyToClose = true;
			this.logger.log(`Game is ready to be shutdown`);
		}
	}

	onInput(entityId: string, input: Vector, attackType: AttackType): void {
		return ;
	}

	onExit(): void {
	}
}