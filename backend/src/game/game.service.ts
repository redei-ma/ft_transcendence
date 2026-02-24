import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Server } from 'socket.io';
import { GameConfig, NetworkConfig } from './configs';
import { GameSession, GameRules, World } from './core';
import { Vector } from './utils';
import { PlayerManager, MapManager, BulletManager } from './managers';
import { AttackType, MatchType, Player, MapData, MatchMode, MatchMakingData, MatchResult, GameData, ErrorCode, SuccessCode } from './interfaces-enums';
import { ClientProxy } from '@nestjs/microservices';
import { ExitStatus } from './interfaces-enums/exitStatus.interface';

// Game Engine Service
@Injectable()
export class GameService{

	private readonly logger: Logger = new Logger(GameService.name);
	
	/* In-memory Map to store all active games, linking gameID to GameSession objects */
	private games: Map<string, GameSession> = new Map();
	/* In-memory Map to store all active socketID, linking socketID(Player) to gameSessionID */
	private socketToGame: Map<string, string> = new Map();

	/* In-memory Map to store users, linking userDbId to gameSessionID */
	private userToGameData = new Map<number, GameData>();

	private server: Server;
	private gameIndex: number = 0;
	private lastTime: number = performance.now();

	private TIME_STEPS: number = (1 / 60);
	private timeAccumulator: number = 0.0;

	constructor(
		private readonly gameRules: GameRules,
		private readonly mapManager: MapManager,
		private readonly playerManager: PlayerManager,
		private readonly bulletManager: BulletManager,
		@Inject(NetworkConfig.MATCHMAKING.SERVICE.REDIS) private readonly redis: ClientProxy) {}

	/* @Interval decorator creates a game loop that runs every 16ms */
	@Interval(GameConfig.SERVER.TICK_RATE)
	gameLoop(): void {
		/* SAFETY CAP - I calculate the real delta T to compensate for possible server lag */
		const now: number = performance.now();
		let framTime: number = (now - this.lastTime) / 1000;
		this.lastTime = now;

		/* if is too large i hard-code at 0.25 */
		if (framTime > 0.25)
			framTime = 0.25;

		/* I use this accumulator to make sure the server calculates
		the game physics every 16ms, thus avoiding tunneling. */
		this.timeAccumulator += framTime;

		while (this.timeAccumulator >= this.TIME_STEPS){
			this.games.forEach((game) =>
			{
				try{
					game.update(this.TIME_STEPS);
				}
				catch(error){
					this.removeSession(game);
					this.logger.error(`Critical error in game ${game.gameId}`, error.stack);
				}
			});
			this.timeAccumulator -= this.TIME_STEPS;

		}
		this.games.forEach((game) =>{
			if (game.isGameOver() && game.canShutdown()){
					this.removeSession(game);
					this.logger.log(`Game ${game.gameId} ended and removed`);
				}
		});
	}

	/* Triggered by handleDisconnect. Makes the player in disconnect mode. */
	handlePlayerDisconnect(socketId: string){
		const session: GameSession | undefined = this.getGameBySocket(socketId);

		if (!session) return ;

		const entityIds: string[] | undefined = session.socketToEntities.get(socketId);

		if (!entityIds || entityIds.length === 0) return ;

		let player: Player | undefined = undefined;

		for (const entityId of entityIds.values()){
			player = session.players.get(entityId);
			if (!player) continue ;

			player.disconnectionTimer = 0.0;
			player.isDisconnected = true;
			this.logger.log(`Player ${player.characterName} (ID: ${entityId}) disconnected.`);
		}
	}

	/* Triggered by OnGatewayDisconnect. Removes the game from memory. */
	removeSession(game: GameSession): void {
		// inviare i dati al database di renato
		const gameId = game.getGameId();

		//sending the end_game event for the matchmaking
		this.redis.emit(NetworkConfig.MATCHMAKING.MATCH_EVENTS.END_GAME, gameId);

		//sending the end game data to the database
		const endGameData: MatchResult = game.engine.endGameData;
		//this.MatchResultModule.processMatchEnd(endGameData);
		for (const socketId of game.socketToEntities.keys()){
			this.socketToGame.delete(socketId);
		}

		for (const userDbId of game.expectedUserDbIds) {
			this.userToGameData.delete(userDbId);
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
				this.logger.error(`Player ${player.userDbId} is already in another match`);
				return {status: ErrorCode.UNAUTHORIZED, message: `this player ${player.userDbId} is already in a game`}; 
			}
		}

		const mapData: MapData | undefined = this.mapManager.getMap();
		if (!mapData) return {status: ErrorCode.MAP_LOAD_FAILED, message: `error in loading the map`};

		this.gameIndex++;

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
			matchType,
			matchMode,
			this,
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

	getGameBySocket(socketId: string): GameSession | undefined{
		const gameId: string | undefined = this.socketToGame.get(socketId);

		if (!gameId) return undefined;

		const gameSession: GameSession | undefined = this.games.get(gameId);

		return gameSession;
	}

	setServer(server: Server){
		this.server = server;
	}

	setSocketToGame(socketId: string, gameId: string){
		this.socketToGame.set(socketId, gameId);
	}

	getGameById(gameId: string): GameSession | undefined{
		return (this.games.get(gameId));
	}

	hasPendingMatch(userDbId: number): GameData | undefined{
		return (this.userToGameData.get(userDbId));
	}

	removeOldSocket(socketId: string){
		this.socketToGame.delete(socketId);
	}
}

