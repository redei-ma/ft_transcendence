"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketEvents = void 0;
var SocketEvents;
(function (SocketEvents) {
    // Client -> Server
    SocketEvents["INPUT"] = "game-input";
    // Server -> Client
    SocketEvents["GAME_STATE"] = "game-state";
    SocketEvents["GAME_OVER"] = "game-over";
    SocketEvents["MAP_EMIT"] = "map-emit";
    SocketEvents["GAME_MESSAGE"] = "game-message";
})(SocketEvents || (exports.SocketEvents = SocketEvents = {}));
