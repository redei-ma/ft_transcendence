import { Server } from 'socket.io';
import { World } from './game.world';
import { Vector } from '../utils/game.vector';
import { GameRules } from './game.rules';
import { Engine } from './game.engine';
import { IGameState } from '../gameStates/game.state.interface';
import { LobbyState } from '../gameStates/lobbyState';
import { EndState } from '../gameStates/endState';
import { PlayState } from '../gameStates/playState';
import { GameConfig } from '../configs/game.config';
import { SocketEvents } from '../configs/game.events';
import { PlayerManager } from '../managers/playerManager/player.manager';
import { BulletManager } from '../managers/bullet.manager';
import { Player, MatchType, AttackType, MatchMakingData, MatchMode, EndReason } from '../interfaces-enums';
import { Logger } from '@nestjs/common';
import { TIMEOUT } from 'dns';

/* the session dosn't know what state the game have, this class is only a game manager */
export class GameSession{

	private logger: Logger = new Logger(GameSession.name);

	/* this map connect entityID to Player */
	public readonly players: Map<string, Player> = new Map();

	/* 1 socket can move more players(local game) */
	public readonly socketToEntities: Map<string, string[]> = new Map();

	public readonly engine: Engine;
	private currentState: IGameState;
	private sessionTime: number = 0.0;
	public matchType: MatchType;
	public matchMode: MatchMode;

	constructor(
		public readonly gameId: string, public readonly server: Server,
		public readonly gameWorld: World, public readonly gameRules: GameRules,
		private readonly playerManager: PlayerManager, private readonly bulletManager: BulletManager, matchType: MatchType, matchMode: MatchMode) {
			this.matchType = matchType;
			this.matchMode = matchMode;
			this.engine = new Engine(this.players, this.gameWorld, this.gameRules, this.playerManager, this.bulletManager, matchType, matchMode);
			this.currentState = new LobbyState(this);
			this.currentState.onEnter();
	}

	addPlayer(player: MatchMakingData): boolean{
		if (this.currentState instanceof LobbyState){
			this.currentState.addPlayer(player);
			return true;
		}
		return false;
	}

	/* This method is called by GameGateway when an 'input' event is received */
	processInput(socketId: string, input: Vector, attackType: AttackType, playerIndex: number): void {

		const controlledEntities: string[] | string | undefined = this.socketToEntities.get(socketId);

		if (!controlledEntities || playerIndex >= controlledEntities.length) {
			this.logger.warn(`ROUTING ERROR controlledEntities not founded ${controlledEntities}`);
			return;
		}

		/* i get the entityes if are more than 1(local game) the index can be 0(default value) or 1 for the second player*/
		const targetEntityId: string = controlledEntities[playerIndex];

		if (!targetEntityId) {
			console.warn(`ROUTING ERROR index ${playerIndex} not found for socket ${socketId}`);
			return;
		}

		this.currentState.onInput(targetEntityId, input, attackType);
	}

	update(dt: number): void{
		this.currentState.update(dt);

		this.sessionTime += dt;
		if (this.sessionTime >= GameConfig.SERVER.HARD_LIMIT){
			if (!(this.currentState instanceof EndState)){
				this.engine.handleGameOver(true);
				this.currentState = new EndState(this);
				this.logger.warn("This session is active for too mutch time, transitioning to endState");
				this.currentState.onEnter();
			}
		}
	}

	/* method to clean up the players map */
	cleanUp(): void{
		this.players.clear();
	}

	isGameOver(): boolean {
		return (this.currentState instanceof EndState);
	}

	isPlaying(): boolean{
		return (this.currentState instanceof PlayState);
	}

	isJoinable(): boolean{
		return(this.currentState instanceof LobbyState && this.players.size < this.gameWorld.maxPlayers);
	}

	canShutdown(): boolean{
		return (this.currentState instanceof EndState && this.currentState.isReadyToClose);
	}

	/* method to remove a player from the players map */
	removePlayer(entityId: string): void{
		const player: Player | undefined = this.players.get(entityId);
		if (!player) return;

		if (player.disconnectionTimer < GameConfig.SERVER.MAX_DISCONNECTION_TIMER) return;

		for (const bullet of this.gameWorld.bullets.values()){
			if (bullet.ownerId === player.entityId){
				bullet.ownerId = '';
				bullet.isActive = false;
			}
		}

		this.players.delete(player.entityId);
		if (player.socketId)
			this.socketToEntities.delete(player.socketId);
	}

	sendMessage(author: Player, message: string): void{
		this.server.to(this.gameId).emit(SocketEvents.GAME_MESSAGE,{
			author: author.userDbId,
			message: message,
		})
	}

	/* When the game state change,
	he calls this method which in turn calls the exit method,
	updates the state and calls the current state's entry method. */
	transitionTo(newState: IGameState): void {
		this.currentState.onExit();
		this.currentState = newState;
		this.currentState.onEnter();
	}

	tryToReconnectPlayer(userDbId: number, socketId: string): string | undefined{
		for (const player of this.players.values()){
			if (userDbId === player.userDbId && player.isDisconnected
					&& player.disconnectionTimer < GameConfig.SERVER.MAX_DISCONNECTION_TIMER){
				if (player.socketId){
					this.socketToEntities.delete(player.socketId);
				}

				if (!this.socketToEntities.get(socketId)){
					this.socketToEntities.set(socketId, []);
				}

				this.socketToEntities.get(socketId)?.push(player.entityId);
				player.socketId = socketId;
				player.isDisconnected = false;
				player.disconnectionTimer = 0.0;

				this.server.to(socketId).emit(SocketEvents.MAP_EMIT,{ map: this.gameWorld,
					config:{playerRadius: GameConfig.PLAYER.RADIUS, playerSpeed: GameConfig.PLAYER.SPEED}});
				this.server.in(socketId).socketsJoin(this.gameId);
				return (this.gameId);
			}
		}
		return (undefined);
	}

	/* getters */
	getGameState(): string{
		return this.currentState.name;
	}

	getGameId(): string{
		return (this.gameId);
	}

	getPlayersIds(): string[]{
		return (Array.from(this.players.keys()));
	}
}