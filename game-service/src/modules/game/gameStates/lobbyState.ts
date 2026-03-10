import { GameEvents } from "@transcendence/types";
import { GameSession } from "../core/game.session";
import { getNewPlayer } from "../factories/player.factory";
import { IGameState } from "./game.state.interface";
import { PlayState } from "./playState";
import { Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
	Vector,
	GameConfig,
	Player,
	AttackType,
	ExitStatus,
	SuccessCode,
	ErrorCode,
} from "@transcendence/types";
import { MatchMakingData } from "../game-interfaces";

export class LobbyState implements IGameState {
	logger: Logger = new Logger(LobbyState.name);

	name = "LOBBY";

	startTime: number = 0.0;

	constructor(private readonly session: GameSession) {}
	onEnter() {
		this.logger.log("lobby open, waiting for players...");
	}

	update(dt: number): void {
		this.startTime += dt;
		if (this.startTime >= GameConfig.SERVER.MAX_LOBBY_DURATION) {
			this.session.gameService.removeSession(this.session);
		}
		return;
	}

	onInput(entityId: string, input: Vector, attackType: AttackType): void {
		return;
	}

	/* Creates a new player instance. */
	addPlayer(
		player: MatchMakingData,
		socketId: string | undefined,
	): ExitStatus {
		const entityId: string = randomUUID();

		let spawnIndex: number = this.session.gameRules.getSpawnPoint(
			this.session.players,
			this.session.gameWorld.maxPlayers,
		);
		if (spawnIndex == -1) {
			this.logger.warn(`This lobby is already full`);
			return {
				status: ErrorCode.MATCH_ALREADY_STARTED,
				message:
					"The match is already started, please search another game",
			};
		}

		const newPlayer: Player = getNewPlayer(
			this.session.gameWorld,
			socketId,
			spawnIndex,
			player.characterName,
			player.userDbId,
			entityId,
			player.isAiPlayer,
			this.session.getPlayerIndex(),
			this.session.matchType,
		);

		/* creating the room thanks to socket.io */
		if (socketId) {
			this.session.server.in(socketId).socketsJoin(this.session.gameId);

			if (!this.session.socketToEntities.has(socketId)) {
				this.session.socketToEntities.set(socketId, []);
			}
			this.session.socketToEntities.get(socketId)?.push(entityId);
		}

		this.session.players.set(entityId, newPlayer);

		this.startGameIfTheLobbyIsFull();
		return { status: SuccessCode.OK };
	}

	addBot(player: MatchMakingData): ExitStatus {
		const entityId: string = randomUUID();

		let spawnIndex: number = this.session.gameRules.getSpawnPoint(
			this.session.players,
			this.session.gameWorld.maxPlayers,
		);
		if (spawnIndex == -1) {
			this.logger.warn(
				`This lobby is already full spawnIndex=${spawnIndex}`,
			);
			return {
				status: ErrorCode.MATCH_ALREADY_STARTED,
				message:
					"The match is already started, please search another game",
			};
		}

		const newPlayer: Player = getNewPlayer(
			this.session.gameWorld,
			undefined,
			spawnIndex,
			player.characterName,
			player.userDbId,
			entityId,
			player.isAiPlayer,
			this.session.getPlayerIndex(),
			this.session.matchType,
		);

		this.session.players.set(entityId, newPlayer);
		this.startGameIfTheLobbyIsFull();
		return { status: SuccessCode.OK };
	}

	startGameIfTheLobbyIsFull() {
		if (
			this.session.gameRules.shouldGameStart(
				this.session.players,
				this.session.gameWorld.maxPlayers,
			)
		) {
			this.session.transitionTo(new PlayState(this.session));
		}
	}

	onExit(): void {
		/* sending the game world to the gameId */
		this.session.server.to(this.session.gameId).emit(GameEvents.MAP_EMIT, {
			map: this.session.gameWorld,
			config: {
				playerRadius: GameConfig.PLAYER.RADIUS,
				playerSpeed: GameConfig.PLAYER.SPEED,
			},
		});

		this.logger
			.log(`Transitioning to Play State - event map emit sended - map: ${this.session.gameWorld},
			PlayerRadius:${GameConfig.PLAYER.RADIUS} PlayerSpeed: ${GameConfig.PLAYER.SPEED}`);
	}
}
