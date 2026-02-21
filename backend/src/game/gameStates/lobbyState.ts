import { GameConfig } from "../configs/game.config";
import { SocketEvents } from "../configs/game.events";
import { GameSession } from "../core/game.session";
import { Vector } from "../utils/game.vector";
import { getNewPlayer } from "../factories/player.factory";
import { IGameState } from "./game.state.interface";
import { PlayState } from "./playState";
import { Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Player, AttackType, MatchMakingData } from "../interfaces-enums";

export class LobbyState implements IGameState{
	logger: Logger = new Logger(LobbyState.name);
	
	name = 'LOBBY';

	constructor(private readonly session: GameSession){}
	onEnter(){
		this.logger.log("lobby open, waiting for players...");
	}

	update(dt: number): void {
		return ;
	}

	onInput(entityId: string, input: Vector, attackType: AttackType): void {
		return ;
	}

	/* Creates a new player instance. */
	addPlayer(player: MatchMakingData): void{

		const entityId: string = randomUUID();

		let spawnIndex: number = this.session.gameRules.getSpawnPoint(this.session.players, this.session.gameWorld.maxPlayers);
		if (spawnIndex == -1){
			this.logger.warn(`This lobby is already full`);
			return ;
		}

		const newPlayer: Player = getNewPlayer(this.session.gameWorld,
			player.socketId, spawnIndex,
			player.characterName, player.userDbId,
			entityId, player.isAiPlayer, player.playerIndex, this.session.matchType);

		/* creating the room thanks to socket.io */
		if (player.socketId){
			this.session.server.in(player.socketId).socketsJoin(this.session.gameId);

			if (!this.session.socketToEntities.has(player.socketId)){
				this.session.socketToEntities.set(player.socketId, []);
			}
			this.session.socketToEntities.get(player.socketId)?.push(entityId);
		}

		this.session.players.set(entityId, newPlayer);

		if (this.session.gameRules.shouldGameStart(this.session.players, this.session.gameWorld.maxPlayers)){
			this.session.transitionTo(new PlayState(this.session));
		}
	}

	onExit(): void {
		/* sending the game world to the gameId */
		this.session.server.to(this.session.gameId).emit(SocketEvents.MAP_EMIT,{ map: this.session.gameWorld,
		config:{playerRadius: GameConfig.PLAYER.RADIUS, playerSpeed: GameConfig.PLAYER.SPEED}});

		this.logger.log(`Transitioning to Play State - event map emit sended - map: ${this.session.gameWorld},
			PlayerRadius:${GameConfig.PLAYER.RADIUS} PlayerSpeed: ${GameConfig.PLAYER.SPEED}`)
	}
}