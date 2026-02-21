import { GameConfig } from "../configs/game.config";
import { SocketEvents } from "../configs/game.events";
import { GameSession } from "../core/game.session";
import { AttackType, GameEndEvents, GameStateEvents } from "../interfaces-enums";
import { Vector } from "../utils/game.vector";
import { EndState } from "./endState";
import { IGameState } from "./game.state.interface";
import { Logger } from "@nestjs/common";

export class PlayState implements IGameState{
	logger: Logger = new Logger(PlayState.name);
	
	name = 'PLAY';

	constructor(private readonly session: GameSession) {}
	onEnter(): void {
		this.logger.log("Game is starting");
	}

	update(dt: number): void {
		const fullEvents: (GameStateEvents | GameEndEvents)[] = this.session.engine.updateEvents(dt);
		for (const event of fullEvents.values()){
			const remaningTime = Math.max(0, GameConfig.SERVER.MAX_GAME_DURATION - event.time);

			/* sending the snapshots */
			if (event.eventName === 'game-state'){
				this.session.server.to(this.session.gameId).emit(SocketEvents.GAME_STATE, {entities: event.data, time: remaningTime});
			}
			else{
				this.session.server.to(this.session.gameId).emit(SocketEvents.GAME_OVER, {entities: event.winnerData, time: remaningTime});
				this.session.transitionTo(new EndState(this.session));
			}
		}
	}

	onInput(entityId: string, input: Vector, attackType: AttackType): void {
		/* Retrieve the player by ID and validate existence */

		const player = this.session.players.get(entityId);
		if (!player) {
			this.logger.warn("Player not found, ignoring input.");
			return ;
		}

		if (player.inputQueue.length > GameConfig.SERVER.MAX_INPUT_QUEUE_SIZE) return ;

		player.inputQueue.push({input: input, attackType: attackType});
	}

	onExit(): void {
		this.logger.log("PlayState finished. Transitioning to EndState.");
	}
}