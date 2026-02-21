import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Server } from 'socket.io';
import { GameConfig, NetworkConfig } from './configs';
import { GameSession, GameRules, World } from './core';
import { Vector } from './utils';
import { PlayerManager, MapManager, BulletManager } from './managers';
import { AttackType, MatchType, Player, MapData, MatchMode, MatchMakingData } from './interfaces-enums';
import { WsGameException } from './WsGameException';
import Redis from 'ioredis';

// Game Engine Service
@Injectable()
export class GameService{

	private readonly logger: Logger = new Logger(GameService.name);

	/* In-memory Map to store all active games, linking gameID to GameSession objects */
	private games: Map<string, GameSession> = new Map();
	/* In-memory Map to store all active socketID, linking socketID(Player) to gameSessionID */
	private socketToGame: Map<string, string> = new Map();

	private server: Server;
	private gameIndex: number = 0;
	private lastTime: number = performance.now();

	private TIME_STEPS: number = (1 / 60);
	private timeAccumulator: number = 0.0;

	constructor(
		@Inject(NetworkConfig.MATCHMAKING.SERVICE.REDIS_CLIENT) private readonly redis: Redis,
		private readonly gameRules: GameRules,
		private readonly mapManager: MapManager,
		private readonly playerManager: PlayerManager,
		private readonly bulletManager: BulletManager) {}

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
	async removeSession(game: GameSession): Promise<void> {
			const gameId = game.getGameId();

			for (const socketId of game.socketToEntities.keys()){
				this.socketToGame.delete(socketId);
			}

			for (const player of game.players.values()) {
	        	await this.redis.set(
    	        	`player:${player.userDbId}:status`, 
        	    	NetworkConfig.MATCHMAKING.PLAYER_STATUS.LOBBY
        	);

			//chiamata al db di renato per salvare i dati
			this.games.delete(gameId);
		}
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
	}

	handleInput(socketId: string, input: Vector, attackType: AttackType, playerIndex: number = 0): void{

		const gameSessionId = this.socketToGame.get(socketId);
		if (!gameSessionId) return;

		const gameSession = this.games.get(gameSessionId);
		if (!gameSession) return ;

		gameSession.processInput(socketId, input, attackType, playerIndex);
	}

	createMatch(players: MatchMakingData[], gameId: string, matchMode: MatchMode, matchType: MatchType): string | undefined{

		for (const player of players){
			if (player.socketId && player.userDbId){
				//da migliorare per riconnessione anche locale e bot
				const gameId: string | undefined = this.searchForReconnection(player.userDbId, player.socketId);
				if (gameId){
					this.logger.warn(`Player ${player.userDbId} reconnected with socket ${player.socketId}`);
					return (gameId);
				}
			}

		}
		try{
			const mapData: MapData | undefined = this.mapManager.getMap();
			if (!mapData) return ;//throw new WsGameException('failed to load the map');

			/* if the lobby isn't found I create a new one */
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
				matchMode
			);

			this.games.set(gameId, newGameSession);

			for (const player of players.values()){
				newGameSession.addPlayer(player);
				if (player.socketId)
					this.socketToGame.set(player.socketId, gameId);
				this.logger.log(`Player ${player.socketId} created new lobby ${gameId}`);
			}
			return gameId;
		}
		catch(error){
			let clientSocket: any;
			for (const player of players.values()){

				if (player.socketId){
					this.socketToGame.delete(player.socketId);
					clientSocket = this.server.sockets.sockets.get(player.socketId);
				}

				if (clientSocket) {
					clientSocket.emit("error in loading the game, please retry");
					clientSocket.disconnect(true);
				}
				this.logger.error(`An error occurred while creating session: ${error.message}`);
			}
			return undefined;
		}
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

	public searchForReconnection(userDbId: number, socketId: string): string | undefined{

		for (const session of this.games.values()){
			const gameId = session.tryToReconnectPlayer(userDbId, socketId);
			if (gameId){
				this.socketToGame.delete(socketId);
				this.socketToGame.set(socketId, session.gameId);
				return (gameId);
			}
		}
		return (undefined);
	}

	setServer(server: Server){
		this.server = server;
	}
}

