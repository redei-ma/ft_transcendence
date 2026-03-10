"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSession = void 0;
const game_engine_1 = require("./game.engine");
const lobbyState_1 = require("../gameStates/lobbyState");
const endState_1 = require("../gameStates/endState");
const playState_1 = require("../gameStates/playState");
const game_events_1 = require("../configs/game.events");
const types_1 = require("@transcendence/types");
const common_1 = require("@nestjs/common");
/* the session dosn't know what state the game have, this class is only a game manager */
class GameSession {
    constructor(gameId, server, gameWorld, gameRules, playerManager, bulletManager, matchType, matchMode, gameService) {
        this.gameId = gameId;
        this.server = server;
        this.gameWorld = gameWorld;
        this.gameRules = gameRules;
        this.playerManager = playerManager;
        this.bulletManager = bulletManager;
        this.gameService = gameService;
        this.logger = new common_1.Logger(GameSession.name);
        //all expected users db of all games
        this.expectedUserDbIds = [];
        /* this map connect entityID to Player */
        this.players = new Map();
        /* 1 socket can move more players(local game) */
        this.socketToEntities = new Map();
        this.sessionTime = 0.0;
        this.matchType = matchType;
        this.matchMode = matchMode;
        this.engine = new game_engine_1.Engine(this.players, this.gameWorld, this.gameRules, this.playerManager, this.bulletManager, matchType, matchMode);
        this.currentState = new lobbyState_1.LobbyState(this);
        this.currentState.onEnter();
    }
    addPlayer(player, socketId) {
        if (this.currentState instanceof lobbyState_1.LobbyState) {
            this.logger.debug('trying to add player in lobbyState');
            return this.currentState.addPlayer(player, socketId);
        }
        else if (this.currentState instanceof playState_1.PlayState && player.userDbId && socketId) {
            this.logger.debug('trying to reconnect player in playState');
            return this.currentState.reconnectPlayer(player.userDbId, socketId);
        }
        return ({ status: types_1.ErrorCode.INTERNAL_ERROR, message: 'Internal server error, sorry for the issue' });
    }
    addBot(player) {
        if (this.currentState instanceof lobbyState_1.LobbyState) {
            return (this.currentState.addBot(player));
        }
        return ({ status: types_1.ErrorCode.INTERNAL_ERROR, message: 'Internal server error, sorry for the issue' });
    }
    /* This method is called by GameGateway when an 'input' event is received */
    processInput(socketId, input, attackType, playerIndex) {
        const controlledEntities = this.socketToEntities.get(socketId);
        if (!controlledEntities || playerIndex >= controlledEntities.length) {
            return;
        }
        /* i get the entityes if are more than 1(local game) the index can be 0(default value) or 1 for the second player*/
        const targetEntityId = controlledEntities[playerIndex];
        if (!targetEntityId) {
            return;
        }
        this.currentState.onInput(targetEntityId, input, attackType);
    }
    update(dt) {
        this.currentState.update(dt);
        this.sessionTime += dt;
        if (this.sessionTime >= types_1.GameConfig.SERVER.HARD_LIMIT) {
            if (!(this.currentState instanceof endState_1.EndState)) {
                this.engine.handleGameOver(true);
                this.currentState = new endState_1.EndState(this);
                this.logger.warn("This session is active for too mutch time, transitioning to endState");
                this.currentState.onEnter();
            }
        }
    }
    /* method to clean up the players map */
    cleanUp() {
        this.players.clear();
        this.socketToEntities.clear();
    }
    isGameOver() {
        return (this.currentState.name === 'END');
    }
    isPlaying() {
        return (this.currentState.name === 'PLAY');
    }
    isJoinable() {
        return (this.currentState.name === 'LOBBY' && this.players.size < this.gameWorld.maxPlayers);
    }
    canShutdown() {
        return (this.currentState instanceof endState_1.EndState && this.currentState.isReadyToClose);
    }
    /* method to remove a player from the players map */
    removePlayer(entityId) {
        const player = this.players.get(entityId);
        if (!player)
            return;
        if (player.disconnectionTimer < types_1.GameConfig.SERVER.MAX_DISCONNECTION_TIMER)
            return;
        for (const bullet of this.gameWorld.bullets.values()) {
            if (bullet.ownerId === player.entityId) {
                bullet.ownerId = '';
                bullet.isActive = false;
            }
        }
        this.players.delete(player.entityId);
        if (player.socketId)
            this.socketToEntities.delete(player.socketId);
    }
    sendMessage(author, message) {
        this.logger.log(`message author ${author}, message: ${message}`);
        this.server.to(this.gameId).emit(game_events_1.SocketEvents.GAME_MESSAGE, {
            author: author.userDbId,
            message: message,
        });
    }
    /* When the game state change,
    he calls this method which in turn calls the exit method,
    updates the state and calls the current state's entry method. */
    transitionTo(newState) {
        this.currentState.onExit();
        this.currentState = newState;
        this.currentState.onEnter();
    }
    /* getters */
    getGameState() {
        return this.currentState.name;
    }
    getGameId() {
        return (this.gameId);
    }
    getPlayersIds() {
        return (Array.from(this.players.keys()));
    }
    getPlayerIndex() {
        if (this.matchMode === types_1.MatchMode.LOCAL && this.players.size === 1)
            return 1;
        return 0;
    }
}
exports.GameSession = GameSession;
