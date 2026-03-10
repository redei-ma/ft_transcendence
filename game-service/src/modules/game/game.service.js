"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GameService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
const common_1 = require("@nestjs/common");
const configs_1 = require("./configs");
const core_1 = require("./core");
const managers_1 = require("./managers");
const microservices_1 = require("@nestjs/microservices");
const types_1 = require("@transcendence/types");
const match_result_service_1 = require("../result/match-result.service");
// Game Engine Service
let GameService = GameService_1 = class GameService {
    constructor(gameRules, mapManager, playerManager, bulletManager, matchResultService, redis) {
        this.gameRules = gameRules;
        this.mapManager = mapManager;
        this.playerManager = playerManager;
        this.bulletManager = bulletManager;
        this.matchResultService = matchResultService;
        this.redis = redis;
        this.logger = new common_1.Logger(GameService_1.name);
        /* In-memory Map to store all active games, linking gameID to GameSession objects */
        this.games = new Map();
        /* In-memory Map to store all active socketID, linking socketID(Player) to gameSessionID */
        this.socketToGame = new Map();
        /* In-memory Map to store users, linking userDbId to gameSessionID */
        this.userToGameData = new Map();
        this.lastTime = performance.now();
        this.TIME_STEPS = (1 / 60);
        this.timeAccumulator = 0.0;
        this.isRunning = false;
    }
    onModuleInit() {
        this.logger.log('gameService class instanceted');
        this.isRunning = true;
        this.processNextTick();
    }
    //when there is an error and the server crashed, i free all data
    async onModuleDestroy() {
        this.logger.warn('the server is in shutdown, cleaning up all resources');
        for (const [gameId, session] of this.games.entries()) {
            this.removeSession(session);
            session.server.to(gameId).emit('exception', {
                status: 'error',
                erroCode: types_1.ErrorCode.SERVER_SHUTDOWN,
                message: 'server in shutdown, returning in lobby',
            });
            session.server.in(gameId).disconnectSockets(true);
        }
        this.isRunning = false;
        if (this.nextTickTimeout) {
            clearTimeout(this.nextTickTimeout);
        }
    }
    processNextTick() {
        if (!this.isRunning)
            return;
        let startTime = performance.now();
        this.gameLoop();
        const executionTime = performance.now() - startTime;
        const nextTickDelay = Math.max(0, types_1.GameConfig.SERVER.TICK_RATE - executionTime);
        this.nextTickTimeout = setTimeout(() => this.processNextTick(), nextTickDelay);
    }
    gameLoop() {
        /* SAFETY CAP - I calculate the real delta T to compensate for possible server lag */
        const now = performance.now();
        let frameTime = (now - this.lastTime) / 1000;
        this.lastTime = now;
        /* if is too large i hard-code at 0.25 */
        if (frameTime > 0.25)
            frameTime = 0.25;
        /* I use this accumulator to make sure the server calculates
        the game physics every 16ms, thus avoiding tunneling. */
        this.timeAccumulator += frameTime;
        while (this.timeAccumulator >= this.TIME_STEPS) {
            this.games.forEach((game) => {
                try {
                    game.update(this.TIME_STEPS);
                }
                catch (error) {
                    this.removeSession(game);
                    this.logger.error(`Critical error in game ${game.gameId}`, error.stack);
                }
            });
            this.timeAccumulator -= this.TIME_STEPS;
        }
        this.games.forEach((game) => {
            if (game.isGameOver() && game.canShutdown()) {
                this.removeSession(game);
                this.logger.log(`Game ${game.gameId} ended and removed`);
            }
        });
    }
    /* Triggered by handleDisconnect. Makes the player in disconnect mode. */
    handlePlayerDisconnect(socketId) {
        const session = this.getGameBySocket(socketId);
        if (!session)
            return { status: types_1.ErrorCode.SESSION_NOT_FOUND, message: 'session not found, game is already over' };
        const entityIds = session.socketToEntities.get(socketId);
        if (!entityIds || entityIds.length === 0)
            return { status: types_1.ErrorCode.INTERNAL_ERROR, message: 'entity id not found, error' };
        let player = undefined;
        for (const entityId of entityIds.values()) {
            player = session.players.get(entityId);
            if (!player)
                continue;
            player.disconnectionTimer = 0.0;
            player.isDisconnected = true;
            this.logger.log(`Player ${player.characterName} (ID: ${entityId}) disconnected.`);
        }
        return { status: types_1.SuccessCode.OK };
    }
    /* Triggered by OnGatewayDisconnect. Removes the game from memory. */
    async removeSession(game) {
        //sending the end_game event for the matchmaking
        const gameId = game.getGameId();
        if (!gameId) {
            this.logger.error('error, gameid is undefined');
            return;
        }
        this.redis.emit(configs_1.NetworkConfig.MATCHMAKING.MATCH_EVENTS.END_GAME, gameId).subscribe({
            next: () => this.logger.log(`event END_GAME inviated for game with id ${gameId}`),
            error: (err) => this.logger.error(`error in sending the event END_GAME with Redis: ${err.message}`)
        });
        for (const socketId of game.socketToEntities.keys()) {
            const gameIdToSocket = this.socketToGame.get(socketId);
            if (gameIdToSocket && gameIdToSocket === gameId)
                this.socketToGame.delete(socketId);
        }
        for (const userDbId of game.expectedUserDbIds) {
            const pendingData = this.userToGameData.get(userDbId);
            if (pendingData && pendingData.gameId === gameId) {
                this.userToGameData.delete(userDbId);
            }
            else
                this.logger.warn('saved a race condition in removeSession');
        }
        game.cleanUp();
        this.games.delete(gameId);
        //sending the end game data to the database
        const endGameData = game.engine.endGameData;
        this.logger.debug('endGameData playersData');
        this.logger.debug(JSON.stringify(endGameData.players));
        this.logger.debug('endGameData endREason');
        this.logger.debug(endGameData.endReason);
        this.logger.debug('endGameData winnerId');
        this.logger.debug(endGameData.winningTeamId);
        await this.matchResultService.processMatchEnd(endGameData);
    }
    removePlayerFromSession(socketId) {
        if (!socketId)
            return;
        const currentSessionId = this.socketToGame.get(socketId);
        if (!currentSessionId) {
            this.logger.warn(`Unable to find a game with this socket id ${socketId}`);
            return;
        }
        const currentGameSession = this.games.get(currentSessionId);
        if (!currentGameSession) {
            this.logger.warn(`Unable to find a game with this id ${currentSessionId}`);
            return;
        }
        const entityIds = currentGameSession.socketToEntities.get(socketId);
        if (!entityIds)
            return;
        for (const entityId of entityIds.values()) {
            currentGameSession.removePlayer(entityId);
        }
        this.socketToGame.delete(socketId);
    }
    handleInput(socketId, input, attackType, playerIndex = 0) {
        const gameSessionId = this.socketToGame.get(socketId);
        if (!gameSessionId)
            return;
        const gameSession = this.games.get(gameSessionId);
        if (!gameSession)
            return;
        gameSession.processInput(socketId, input, attackType, playerIndex);
    }
    prepareMatch(gameId, players, matchMode, matchType) {
        for (const player of players) {
            if (player.userDbId !== null && this.userToGameData.has(player.userDbId)) {
                const oldGameData = this.userToGameData.get(player.userDbId);
                if (!oldGameData)
                    continue;
                const oldGame = this.games.get(oldGameData.gameId);
                if (oldGame && !oldGame.isGameOver()) {
                    this.logger.error(`Player ${player.userDbId} is already in another match`);
                    return { status: types_1.ErrorCode.UNAUTHORIZED, message: `this player ${player.userDbId} is already in a game` };
                }
                else {
                    this.userToGameData.delete(player.userDbId);
                    this.logger.log(`deleting userdbId=>${player.userDbId} from gameData`);
                }
            }
        }
        this.logger.debug(`Players data in prepare match: ${JSON.stringify(players)}`);
        const mapData = this.mapManager.getMap();
        if (!mapData) {
            this.logger.error('Fatal error in loading the map');
            return { status: types_1.ErrorCode.MAP_LOAD_FAILED, message: `error in loading the map` };
        }
        /* creating the game world */
        const gameWorld = new core_1.World(mapData);
        /* creating the new session */
        const newGameSession = new core_1.GameSession(gameId, this.server, gameWorld, this.gameRules, this.playerManager, this.bulletManager, matchType, matchMode, this);
        this.games.set(gameId, newGameSession);
        for (const player of players) {
            if (player.userDbId !== null) {
                const alreadyRegistered = this.userToGameData.get(player.userDbId);
                if (alreadyRegistered) {
                    alreadyRegistered.players.push(player);
                }
                else
                    this.userToGameData.set(player.userDbId, { gameId: gameId, players: [player] });
                newGameSession.expectedUserDbIds.push(player.userDbId);
            }
            if (player.isAiPlayer) {
                const result = newGameSession.addBot(player);
                if (result.status !== types_1.SuccessCode.OK) {
                    this.logger.error(`Failed to add the bot in the game: ${result.message}`);
                    return (result);
                }
            }
        }
        return ({ status: types_1.SuccessCode.OK });
    }
    processGameMessage(socketId, message) {
        const session = this.getGameBySocket(socketId);
        if (!session)
            return;
        const entityIds = session.socketToEntities.get(socketId);
        if (!entityIds || entityIds.length === 0)
            return;
        const entityId = entityIds[0];
        const player = session.players.get(entityId);
        if (player) {
            session.sendMessage(player, message);
        }
    }
    //Getter methods
    getGameBySocket(socketId) {
        const gameId = this.socketToGame.get(socketId);
        if (!gameId)
            return undefined;
        const gameSession = this.games.get(gameId);
        return gameSession;
    }
    getGameById(gameId) {
        return (this.games.get(gameId));
    }
    //Setter methods
    setServer(server) {
        this.server = server;
    }
    setSocketToGame(socketId, gameId) {
        this.socketToGame.set(socketId, gameId);
    }
    //utlis
    hasPendingMatch(userDbId) {
        return (this.userToGameData.get(userDbId));
    }
    removeOldSocket(socketId) {
        this.socketToGame.delete(socketId);
    }
};
exports.GameService = GameService;
exports.GameService = GameService = GameService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, common_1.Inject)(configs_1.NetworkConfig.MATCHMAKING.SERVICE.REDIS)),
    __metadata("design:paramtypes", [core_1.GameRules,
        managers_1.MapManager,
        managers_1.PlayerManager,
        managers_1.BulletManager,
        match_result_service_1.MatchResultService, typeof (_a = typeof microservices_1.ClientProxy !== "undefined" && microservices_1.ClientProxy) === "function" ? _a : Object])
], GameService);
