"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayState = void 0;
const game_events_1 = require("../configs/game.events");
const interfaces_enums_1 = require("../interfaces-enums");
const endState_1 = require("./endState");
const common_1 = require("@nestjs/common");
class PlayState {
    constructor(session) {
        this.session = session;
        this.logger = new common_1.Logger(PlayState.name);
        this.name = 'PLAY';
    }
    onEnter() {
        this.logger.log("Game is starting");
    }
    update(dt) {
        this.fullEvents = this.session.engine.updateEvents(dt);
        for (const event of this.fullEvents.values()) {
            const remaningTime = Math.max(0, interfaces_enums_1.GameConfig.SERVER.MAX_GAME_DURATION - event.time);
            /* sending the snapshots */
            if (event.eventName === 'game-state') {
                this.session.server.to(this.session.gameId).emit(game_events_1.SocketEvents.GAME_STATE, { entities: event.data, time: remaningTime });
            }
            else {
                this.session.server.to(this.session.gameId).emit(game_events_1.SocketEvents.GAME_OVER, { entities: event.winnerData, time: remaningTime });
                this.session.transitionTo(new endState_1.EndState(this.session));
            }
        }
    }
    onInput(entityId, input, attackType) {
        /* Retrieve the player by ID and validate existence */
        const player = this.session.players.get(entityId);
        if (!player) {
            this.logger.warn("Player not found, ignoring input.");
            return;
        }
        if (player.inputQueue.length > interfaces_enums_1.GameConfig.SERVER.MAX_INPUT_QUEUE_SIZE)
            return;
        player.inputQueue.push({ input: input, attackType: attackType });
    }
    onExit() {
        this.logger.log("PlayState finished. Transitioning to EndState.");
    }
    reconnectPlayer(userDbId, socketId) {
        let players = [];
        for (let currentPlayer of this.session.players.values()) {
            if (currentPlayer.userDbId == userDbId)
                if (currentPlayer)
                    players.push(currentPlayer);
        }
        if (!players || players.length <= 0) {
            this.logger.warn('unable to reconnect the player in the lobby, sorry for the issue');
            return ({ status: interfaces_enums_1.ErrorCode.PLAYER_NOT_FOUND, message: 'unable to reconnect the player in the lobby, sorry for the issue' });
        }
        let oldSocket = undefined;
        players.forEach(player => {
            if (player.socketId && player.socketId !== socketId) {
                oldSocket = player.socketId;
            }
            player.socketId = socketId;
            player.isDisconnected = false;
            player.disconnectionTimer = 0.0;
        });
        if (oldSocket) {
            this.session.gameService.removeOldSocket(oldSocket);
            this.session.socketToEntities.delete(oldSocket);
        }
        // reconnection logic, i get the entityes end if i get something i delete the old reference end set the new one
        const entitiesToControl = players.map(p => p.entityId);
        if (!entitiesToControl) {
            this.logger.warn(`unable to reconnect the player with his entityes`);
            return ({ status: interfaces_enums_1.ErrorCode.PLAYER_NOT_FOUND, message: `unable to reconnect the player with his entityes` });
        }
        this.session.socketToEntities.set(socketId, entitiesToControl);
        this.resendData(socketId);
        return ({ status: interfaces_enums_1.SuccessCode.OK });
    }
    resendData(socketId) {
        this.session.server.to(socketId).emit(game_events_1.SocketEvents.MAP_EMIT, { map: this.session.gameWorld,
            config: { playerRadius: interfaces_enums_1.GameConfig.PLAYER.RADIUS, playerSpeed: interfaces_enums_1.GameConfig.PLAYER.SPEED } });
        if (this.fullEvents && this.fullEvents.length > 0) {
            const lastEvent = this.fullEvents[this.fullEvents.length - 1];
            const remaningTime = Math.max(0, interfaces_enums_1.GameConfig.SERVER.MAX_GAME_DURATION - lastEvent.time);
            /* sending the snapshots */
            if (lastEvent.eventName === 'game-state') {
                this.session.server.to(socketId).emit(game_events_1.SocketEvents.GAME_STATE, { entities: lastEvent.data, time: remaningTime });
            }
        }
        this.logger.log(`Reconnecting player - event map emit sended - map: ${this.session.gameWorld},
			PlayerRadius:${interfaces_enums_1.GameConfig.PLAYER.RADIUS} PlayerSpeed: ${interfaces_enums_1.GameConfig.PLAYER.SPEED}`);
    }
}
exports.PlayState = PlayState;
