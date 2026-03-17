import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server } from 'socket.io';
import { GameSession, GameRules, World, AiService } from './core';
import { PlayerManager, MapManager, BulletManager } from './managers';
import { ClientProxy } from '@nestjs/microservices';
import { NetworkConfig, Vector, MatchMode, MatchType, GameConfig, ExitStatus,
	AttackType, Player, ErrorCode, SuccessCode } from "@transcendence/types";

import { MatchResultService } from '../result/match-result.service';
import { MatchResult } from 'src/types/match-result.interface';
import { GameData, MatchMakingData, MapData } from './game-interfaces';

// Game Engine Service
@Injectable()
export class GameService implements OnModuleInit, OnModuleDestroy{

	private readonly logger: Logger = new Logger(GameService.name);
	
	/* In-memory Map to store all active games, linking gameID to GameSession objects */
	private games: Map<string, GameSession> = new Map();
	/* In-memory Map to store all active socketID, linking socketID(Player) to gameSessionID */
	private socketToGame: Map<string, string> = new Map();

	/* In-memory Map to store users, linking userDbId to gameSessionID */
	private userToGameData = new Map<number, GameData>();

	private server: Server;
	private lastTime: number = performance.now();

	private TIME_STEPS: number = (1 / 60);
	private timeAccumulator: number = 0.0;

	private	sessionToDestroy: Set<GameSession> = new Set();

	private isRunning: boolean = false;
	private nextTickTimeout: NodeJS.Timeout;
	constructor(
		private readonly gameRules: GameRules,
		private readonly mapManager: MapManager,
		private readonly playerManager: PlayerManager,
		private readonly bulletManager: BulletManager,
		private readonly matchResultService: MatchResultService,
		private readonly aiService: AiService,
		@Inject(NetworkConfig.MATCHMAKING.SERVICE.REDIS) private readonly redis: ClientProxy) {}

	onModuleInit(){
		this.logger.log('gameService class instanceted');
		this.isRunning = true;
		this.processNextTick()
	}

		//when there is an error and the server crashed, i free all data
	async onModuleDestroy(){
		this.logger.warn('the server is in shutdown, cleaning up all resources');

		for (const [gameId, session] of this.games.entries()){
			this.removeSession(session);

			session.server.to(gameId).emit('exception',{
				status: 'error',
				erroCode: ErrorCode.SERVER_SHUTDOWN,
				message: 'server in shutdown, returning in lobby',
			});
			session.server.in(gameId).disconnectSockets(true);
		}

		this.isRunning = false;
		if (this.nextTickTimeout){
			clearTimeout(this.nextTickTimeout);
		}
	}

	private processNextTick(){
		if (!this.isRunning) return ;

		let startTime: number = performance.now();

		this.gameLoop();

		const executionTime: number = performance.now() - startTime;

		const nextTickDelay = Math.max(0, GameConfig.SERVER.TICK_RATE - executionTime);

		this.nextTickTimeout = setTimeout(() => this.processNextTick(), nextTickDelay);
	}

	gameLoop(): void {
		/* SAFETY CAP - I calculate the real delta T to compensate for possible server lag */
		const now: number = performance.now();
		let frameTime: number = (now - this.lastTime) / 1000;
		this.lastTime = now;

		/* if is too large i hard-code at 0.25 */
		if (frameTime > 0.25)
			frameTime = 0.25;

		/* I use this accumulator to make sure the server calculates
		the game physics every 16ms, thus avoiding tunneling. */
		this.timeAccumulator += frameTime;

		while (this.timeAccumulator >= this.TIME_STEPS){
			this.games.forEach((game) =>
			{
				try{
					game.update(this.TIME_STEPS);
				}
				catch(error){
					this.sessionToDestroy.add(game);
					this.logger.error(`Critical error in game ${game.gameId}`, error.stack);
				}
			});
			this.timeAccumulator -= this.TIME_STEPS;
		}

		this.games.forEach((game) =>{
			if (game.isGameOver() && game.canShutdown()){
					this.sessionToDestroy.add(game);
					this.logger.log(`Game ${game.gameId} ended and removed`);
				}
		});

		if (this.sessionToDestroy.size > 0){
			for (const game of this.sessionToDestroy.values()){
				this.removeSession(game);
			}
			this.sessionToDestroy.clear();
		}
	}

	/* Triggered by handleDisconnect. Makes the player in disconnect mode. */
	handlePlayerDisconnect(socketId: string): ExitStatus{
		const session: GameSession | undefined = this.getGameBySocket(socketId);

		if (!session) return {status: ErrorCode.SESSION_NOT_FOUND, message: 'session not found, game is already over'};

		const entityIds: string[] | undefined = session.socketToEntities.get(socketId);

		if (!entityIds || entityIds.length === 0) return{status: ErrorCode.INTERNAL_ERROR, message: 'entity id not found, error'} ;

		let player: Player | undefined = undefined;

		for (const entityId of entityIds.values()){
			player = session.players.get(entityId);
			if (!player) continue ;

			player.disconnectionTimer = 0.0;
			player.isDisconnected = true;
			this.logger.log(`Player ${player.characterName} (ID: ${entityId}) disconnected.`);
		}

		return {status: SuccessCode.OK}
	}

	/* Triggered by OnGatewayDisconnect. Removes the game from memory. */
	async removeSession(game: GameSession): Promise< void > {
		//sending the end_game event for the matchmaking
		const gameId = game.getGameId();
		if (!gameId){
			this.logger.error('error, gameid is undefined')
			return ;
		}

		for (const socketId of game.socketToEntities.keys()){
			const gameIdToSocket: string | undefined = this.socketToGame.get(socketId);
			if (gameIdToSocket && gameIdToSocket === gameId)
				this.socketToGame.delete(socketId);
		}

		for (const userDbId of game.expectedUserDbIds) {
			const pendingData: GameData | undefined = this.userToGameData.get(userDbId);
			if (pendingData && pendingData.gameId === gameId){
				this.userToGameData.delete(userDbId);
			}
			else
				this.logger.warn('saved a race condition in removeSession');
		}
		game.cleanUp();
		this.games.delete(gameId);
	}

	removePlayerFromSession(socketId: string): void{
		if (!socketId) return;

		const currentSessionId = this.socketToGame.get(socketId);
		if (!currentSessionId){
			this.logger.warn(`Unable to find a game with this socket id ${socketId}`);
			return;
		}

		const currentGameSession = this.games.get(currentSessionId);
		if (!currentGameSession){
			this.logger.warn(`Unable to find a game with this id ${currentSessionId}`);
			return;
		}

		const entityIds: string[] | undefined = currentGameSession.socketToEntities.get(socketId);

		if (!entityIds) return ;

		for (const entityId of entityIds.values()){
			currentGameSession.removePlayer(entityId);
		}

		this.socketToGame.delete(socketId);
	}

	handleInput(socketId: string, input: Vector, attackType: AttackType, playerIndex: number = 0): void{

		const gameSessionId = this.socketToGame.get(socketId);
		if (!gameSessionId) return;

		const gameSession = this.games.get(gameSessionId);
		if (!gameSession) return ;

		gameSession.processInput(socketId, input, attackType, playerIndex);
	}

	prepareMatch(gameId: string, players: MatchMakingData[], matchMode: MatchMode, matchType: MatchType): ExitStatus{

		for (const player of players) {
			if (player.userDbId !== null && this.userToGameData.has(player.userDbId)) {
				const oldGameData: GameData | undefined = this.userToGameData.get(player.userDbId);
				if (!oldGameData) continue ;
				
				const oldGame: GameSession | undefined = this.games.get(oldGameData.gameId);
				if (oldGame && !oldGame.isGameOver()){
					this.logger.error(`Player ${player.userDbId} is already in another match`);
					return {status: ErrorCode.UNAUTHORIZED, message: `this player ${player.userDbId} is already in a game`}; 
				}
				else{
					this.userToGameData.delete(player.userDbId);
					this.logger.log(`deleting userdbId=>${player.userDbId} from gameData`);
				}
			}
		}

		this.logger.debug(`Players data in prepare match: ${JSON.stringify(players)}`);

		const mapData: MapData | undefined = this.mapManager.getMap();
		if (!mapData){
			this.logger.error('Fatal error in loading the map');
			return {status: ErrorCode.MAP_LOAD_FAILED, message: `error in loading the map`};
		}

		/* creating the game world */
		const gameWorld: World = new World(mapData);
		
		/* creating the new session */
		const newGameSession: GameSession = new GameSession(
			gameId,
			this.server,
			gameWorld,
			this.gameRules,
			this.playerManager,
			this.bulletManager,
			this.aiService,
			matchType,
			matchMode,
			this
		);
		
		this.games.set(gameId, newGameSession);

		for (const player of players) {
			if (player.userDbId !== null) {
				const alreadyRegistered: GameData | undefined = this.userToGameData.get(player.userDbId);
				if (alreadyRegistered){
					alreadyRegistered.players.push(player);
				}
				else
					this.userToGameData.set(player.userDbId, {gameId: gameId, players: [player]});

				newGameSession.expectedUserDbIds.push(player.userDbId);
			}
			if (player.isAiPlayer){
				const result = newGameSession.addBot(player);
				if (result.status !== SuccessCode.OK){
					this.logger.error(`Failed to add the bot in the game: ${result.message}`);
					return (result);
				}
			}
		}
		return ({status: SuccessCode.OK});
	}

	processGameMessage(socketId: string, message: string){

		const session: GameSession | undefined = this.getGameBySocket(socketId);
		if (!session) return;

		const entityIds: string[] | undefined = session.socketToEntities.get(socketId);
		if (!entityIds || entityIds.length === 0) return;

		const entityId = entityIds[0];
		const player: Player | undefined = session.players.get(entityId);

		if (player) {
			session.sendMessage(player, message);
		}
	}

	//Getter methods
	getGameBySocket(socketId: string): GameSession | undefined{
		const gameId: string | undefined = this.socketToGame.get(socketId);

		if (!gameId) return undefined;

		const gameSession: GameSession | undefined = this.games.get(gameId);

		return gameSession;
	}
	
	getGameById(gameId: string): GameSession | undefined{
		return (this.games.get(gameId));
	}

	//Setter methods
	setServer(server: Server){
		this.server = server;
	}

	setSocketToGame(socketId: string, gameId: string){
		this.socketToGame.set(socketId, gameId);
	}

	//utlis
	public	hasPendingMatch(userDbId: number): GameData | undefined{
		return (this.userToGameData.get(userDbId));
	}

	public	removeOldSocket(socketId: string){
		this.socketToGame.delete(socketId);
	}

	public	notifyMatchmakingEndGame(gameId: string){
		this.redis.emit(NetworkConfig.MATCHMAKING.MATCH_EVENTS.END_GAME, gameId).subscribe({
			next: () => this.logger.log(`event END_GAME inviated for game with id ${gameId}`),
			error: (err) => this.logger.error(`error in sending the event END_GAME with Redis: ${err.message}`)
        });
	}

	async	saveMatchResult(endGameData: MatchResult){
		try{
			await this.matchResultService.processMatchEnd(endGameData);
			this.logger.log(`Match result saved in DB successfully`);
		}
		catch(error){
			this.logger.error(`error in sending the data to the database error=${error}`);
		}
	}
}

