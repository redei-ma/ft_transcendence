"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LobbyState = void 0;
const game_events_1 = require("../configs/game.events");
const player_factory_1 = require("../factories/player.factory");
const playState_1 = require("./playState");
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const types_1 = require("@transcendence/types");
class LobbyState {
    constructor(session) {
        this.session = session;
        this.logger = new common_1.Logger(LobbyState.name);
        this.name = 'LOBBY';
        this.startTime = 0.0;
    }
    onEnter() {
        this.logger.log("lobby open, waiting for players...");
    }
    update(dt) {
        this.startTime += dt;
        if (this.startTime >= types_1.GameConfig.SERVER.MAX_LOBBY_DURATION) {
            this.session.gameService.removeSession(this.session);
        }
        return;
    }
    onInput(entityId, input, attackType) {
        return;
    }
    /* Creates a new player instance. */
    addPlayer(player, socketId) {
        const entityId = (0, crypto_1.randomUUID)();
        let spawnIndex = this.session.gameRules.getSpawnPoint(this.session.players, this.session.gameWorld.maxPlayers);
        if (spawnIndex == -1) {
            this.logger.warn(`This lobby is already full`);
            return { status: types_1.ErrorCode.MATCH_ALREADY_STARTED, message: 'The match is already started, please search another game' };
        }
        const newPlayer = (0, player_factory_1.getNewPlayer)(this.session.gameWorld, socketId, spawnIndex, player.characterName, player.userDbId, entityId, player.isAiPlayer, this.session.getPlayerIndex(), this.session.matchType);
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
        return { status: types_1.SuccessCode.OK };
    }
    addBot(player) {
        const entityId = (0, crypto_1.randomUUID)();
        let spawnIndex = this.session.gameRules.getSpawnPoint(this.session.players, this.session.gameWorld.maxPlayers);
        if (spawnIndex == -1) {
            this.logger.warn(`This lobby is already full spawnIndex=${spawnIndex}`);
            return { status: types_1.ErrorCode.MATCH_ALREADY_STARTED, message: 'The match is already started, please search another game' };
        }
        const newPlayer = (0, player_factory_1.getNewPlayer)(this.session.gameWorld, undefined, spawnIndex, player.characterName, player.userDbId, entityId, player.isAiPlayer, this.session.getPlayerIndex(), this.session.matchType);
        this.session.players.set(entityId, newPlayer);
        this.startGameIfTheLobbyIsFull();
        return { status: types_1.SuccessCode.OK };
    }
    startGameIfTheLobbyIsFull() {
        if (this.session.gameRules.shouldGameStart(this.session.players, this.session.gameWorld.maxPlayers)) {
            this.session.transitionTo(new playState_1.PlayState(this.session));
        }
    }
    onExit() {
        /* sending the game world to the gameId */
        this.session.server.to(this.session.gameId).emit(game_events_1.SocketEvents.MAP_EMIT, { map: this.session.gameWorld,
            config: { playerRadius: types_1.GameConfig.PLAYER.RADIUS, playerSpeed: types_1.GameConfig.PLAYER.SPEED } });
        this.logger.log(`Transitioning to Play State - event map emit sended - map: ${this.session.gameWorld},
			PlayerRadius:${types_1.GameConfig.PLAYER.RADIUS} PlayerSpeed: ${types_1.GameConfig.PLAYER.SPEED}`);
    }
}
exports.LobbyState = LobbyState;
