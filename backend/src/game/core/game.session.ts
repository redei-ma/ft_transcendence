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
import { Player, MatchType, AttackType, MatchMakingData, MatchMode, ErrorCode } from '../interfaces-enums';
import { Logger } from '@nestjs/common';
import { GameService } from '../game.service';
import { ExitStatus } from '../interfaces-enums/exitStatus.interface';

/* the session dosn't know what state the game have, this class is only a game manager */
export class GameSession{

	private logger: Logger = new Logger(GameSession.name);

	//all expected users db of all games
	public readonly expectedUserDbIds: string[] = [];
	
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
		private readonly playerManager: PlayerManager, private readonly bulletManager: BulletManager,
		matchType: MatchType, matchMode: MatchMode,  public readonly gameService: GameService) {
			this.matchType = matchType;
			this.matchMode = matchMode;
			this.engine = new Engine(this.players, this.gameWorld, this.gameRules, this.playerManager, this.bulletManager, matchType, matchMode);
			this.currentState = new LobbyState(this);
			this.currentState.onEnter();
	}

	addPlayer(player: MatchMakingData, socketId: string | undefined, ): ExitStatus{
		if (this.currentState instanceof LobbyState){
			return this.currentState.addPlayer(player, socketId);
		}
		else if (this.currentState instanceof PlayState && player.userDbId && socketId){
			return this.currentState.reconnectPlayer(player.userDbId, socketId);
		}
		return ({status: ErrorCode.INTERNAL_ERROR, message: 'Internal server error, sorry for the issue'});
	}

	addBot(player: MatchMakingData){
		if (this.currentState instanceof LobbyState){
			return (this.currentState.addBot(player));
		}
		return ({status: ErrorCode.INTERNAL_ERROR, message: 'Internal server error, sorry for the issue'});
	}

	/* This method is called by GameGateway when an 'input' event is received */
	processInput(socketId: string, input: Vector, attackType: AttackType, playerIndex: number): void {

		const controlledEntities: string[] | undefined = this.socketToEntities.get(socketId);

		if (!controlledEntities || playerIndex >= controlledEntities.length) {
			return ;
		}

		/* i get the entityes if are more than 1(local game) the index can be 0(default value) or 1 for the second player*/
		const targetEntityId: string = controlledEntities[playerIndex];

		if (!targetEntityId) {
			return ;
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
		this.socketToEntities.clear();
	}

	isGameOver(): boolean {
		return (this.currentState.name === 'EndGame');
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

	getPlayerIndex(): number{
		if (this.matchMode === MatchMode.LOCAL && this.players.size === 1) return 1

		return 0;
	}
}