import { GameEvents } from "@transcendence/types";
import { GameSession } from "../core";
import {
	Vector,
	GameConfig,
	AttackType,
	ErrorCode,
	Player,
	SuccessCode,
	ExitStatus,
} from "@transcendence/types";
import { EndState, IGameState } from "../gameStates";
import { Logger } from "@nestjs/common";
import { GameEndEvents, GameStateEvents, MatchMakingData } from "../game-interfaces";

export class PlayState implements IGameState {
	logger: Logger = new Logger(PlayState.name);

	name = "PLAY";

	private fullEvents: (GameStateEvents | GameEndEvents)[];
	constructor(private readonly session: GameSession) {}
	
	addPlayer(player: MatchMakingData, socketId: string | undefined): ExitStatus {
		return ({status: ErrorCode.UNAUTHORIZED, message: 'unable to add player, the game is already started'})
	}

	onEnter(): void {
		this.logger.log("Game is starting");
	}

	update(dt: number): void {
		this.fullEvents = this.session.engine.updateEvents(dt);
		for (const event of this.fullEvents.values()) {
			const remaningTime = Math.max(
				0,
				GameConfig.SERVER.MAX_GAME_DURATION - event.time,
			);

			/* sending the snapshots */
			if (event.eventName === "game-state") {
				this.session.server
					.to(this.session.gameId)
					.emit(GameEvents.GAME_STATE, {
						entities: event.data,
						time: remaningTime,
					});
			} else {
				this.session.server
					.to(this.session.gameId)
					.emit(GameEvents.GAME_OVER, {
						entities: event.winnerData,
						time: remaningTime,
					});
				this.session.transitionTo(new EndState(this.session));
			}
		}
	}

	onInput(entityId: string, input: Vector, attackType: AttackType): void {
		/* Retrieve the player by ID and validate existence */
		const player = this.session.players.get(entityId);
		if (!player) {
			this.logger.warn("Player not found, ignoring input.");
			return;
		}

		if (player.inputQueue.length > GameConfig.SERVER.MAX_INPUT_QUEUE_SIZE)
			return;

		player.inputQueue.push({ input: input, attackType: attackType });
	}

	onExit(): void {
		this.logger.log("PlayState finished. Transitioning to EndState.");
	}

	reconnectPlayer(userDbId: number, socketId: string): ExitStatus {
		let players: Player[] = [];
		for (let currentPlayer of this.session.players.values()) {
			if (currentPlayer.userDbId == userDbId)
				if (currentPlayer) players.push(currentPlayer);
		}

		if (!players || players.length <= 0) {
			this.logger.warn(
				"unable to reconnect the player in the lobby, sorry for the issue",
			);
			return {
				status: ErrorCode.PLAYER_NOT_FOUND,
				message:
					"unable to reconnect the player in the lobby, sorry for the issue",
			};
		}

		let oldSocket: string | undefined = undefined;
		players.forEach((player) => {
			if (player.socketId && player.socketId !== socketId) {
				oldSocket = player.socketId;
			}
			player.socketId = socketId;
			player.isDisconnected = false;
			player.disconnectionTimer = 0.0;
		});

		if (oldSocket) {
			this.session.gameService.removeOldSocket(oldSocket);
			this.session.socketToEntities.delete(oldSocket);
		}

		// reconnection logic, i get the entityes end if i get something i delete the old reference end set the new one
		const entitiesToControl = players.map((p) => p.entityId);
		if (!entitiesToControl) {
			this.logger.warn(
				`unable to reconnect the player with his entityes`,
			);
			return {
				status: ErrorCode.PLAYER_NOT_FOUND,
				message: `unable to reconnect the player with his entityes`,
			};
		}

		this.session.socketToEntities.set(socketId, entitiesToControl);

		this.resendData(socketId);
		return { status: SuccessCode.OK };
	}

	private resendData(socketId: string) {
		this.session.server.to(socketId).emit(GameEvents.MAP_EMIT, {
			map: this.session.gameWorld,
			config: {
				playerRadius: GameConfig.PLAYER.RADIUS,
				playerSpeed: GameConfig.PLAYER.SPEED,
			},
		});

		if (this.fullEvents && this.fullEvents.length > 0) {
			const lastEvent = this.fullEvents[this.fullEvents.length - 1];
			const remaningTime = Math.max(
				0,
				GameConfig.SERVER.MAX_GAME_DURATION - lastEvent.time,
			);
			/* sending the snapshots */
			if (lastEvent.eventName === "game-state") {
				this.session.server.to(socketId).emit(GameEvents.GAME_STATE, {
					entities: lastEvent.data,
					time: remaningTime,
				});
			}
		}

		this.logger
			.log(`Reconnecting player - event map emit sended - map: ${this.session.gameWorld},
			PlayerRadius:${GameConfig.PLAYER.RADIUS} PlayerSpeed: ${GameConfig.PLAYER.SPEED}`);
	}
}
