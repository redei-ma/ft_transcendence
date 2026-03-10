"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkConfig = void 0;
exports.NetworkConfig = {
    MATCHMAKING: {
        PLAYER_STATUS: {
            LOBBY: 'lobby',
            PLAYING: 'ingame'
        },
        MATCH_EVENTS: {
            CREATE_MATCH: 'create-match',
            END_GAME: 'end-game',
        },
        SERVICE: {
            REDIS: 'redis',
        }
    }
};
