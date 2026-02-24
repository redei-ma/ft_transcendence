import { GameConfig } from "../configs/game.config";
import { SocketEvents } from "../configs/game.events";
import { GameSession } from "../core/game.session";
import { GameException } from "../game.exception";
import { AttackType, GameEndEvents, ErrorCode, GameStateEvents, Player, SuccessCode } from "../interfaces-enums";
import { ExitStatus } from "../interfaces-enums/exitStatus.interface";
import { Vector } from "../utils/game.vector";
import { EndState } from "./endState";
import { IGameState } from "./game.state.interface";
import { Logger } from "@nestjs/common";

export class PlayState implements IGameState{
	logger: Logger = new Logger(PlayState.name);
	
	name = 'PLAY';

	private fullEvents: (GameStateEvents | GameEndEvents)[]
	constructor(private readonly session: GameSession) {}
	onEnter(): void {
		this.logger.log("Game is starting");
	}

	update(dt: number): void {
		this.fullEvents = this.session.engine.updateEvents(dt);
		for (const event of this.fullEvents.values()){
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

	reconnectPlayer(userDbId: number, socketId: string): ExitStatus{

		let players: Player[] = [];
		for (let currentPlayer of this.session.players.values()){
			if (currentPlayer.userDbId == userDbId)
				if (currentPlayer)
				players.push(currentPlayer);
		}

		if (!players || players.length <= 0)
			return ({status: ErrorCode.PLAYER_NOT_FOUND, message: 'unable to reconnect the player in the lobby, sorry for the issue'});

		let oldSocket: string | undefined = undefined;
		players.forEach(player => {
			if (player.socketId && player.socketId !== socketId){
				oldSocket = player.socketId;
			}
			player.socketId = socketId;
		})

		if (!oldSocket){
			return {status: SuccessCode.OK};
		}

		this.session.gameService.removeOldSocket(oldSocket);
		// reconnection logic, i get the entityes end if i get something i delete the old reference end set the new one
		const entityes: string[] | undefined = this.session.socketToEntities.get(oldSocket);
		if (!entityes)
			return ({status: ErrorCode.PLAYER_NOT_FOUND, message: `unable to reconnect the player with his entityes`});

		this.session.socketToEntities.delete(oldSocket);
		this.session.socketToEntities.set(socketId, entityes);

		this.session.server.to(socketId).emit(SocketEvents.MAP_EMIT,{ map: this.session.gameWorld,
			config:{playerRadius: GameConfig.PLAYER.RADIUS, playerSpeed: GameConfig.PLAYER.SPEED}});

		if (!this.fullEvents || this.fullEvents.length === 0)
			return ({status: ErrorCode.INTERNAL_ERROR, message: `Internal server error, sorry for the issue`});
		const lastEvent = this.fullEvents[this.fullEvents.length - 1];

		const remaningTime = Math.max(0, GameConfig.SERVER.MAX_GAME_DURATION - lastEvent.time);

		/* sending the snapshots */
		if (lastEvent.eventName === 'game-state'){
			this.session.server.to(socketId).emit(SocketEvents.GAME_STATE, {entities: lastEvent.data, time: remaningTime});
		}
		else{
			this.session.server.to(socketId).emit(SocketEvents.GAME_OVER, {entities: lastEvent.winnerData, time: remaningTime});
		}
		this.logger.log(`Reconnecting player - event map emit sended - map: ${this.session.gameWorld},
			PlayerRadius:${GameConfig.PLAYER.RADIUS} PlayerSpeed: ${GameConfig.PLAYER.SPEED}`)

		players.forEach(player => {
			player.isDisconnected = false;
			player.disconnectionTimer = 0.0;
		})

		return ({status: SuccessCode.OK});
	}
}