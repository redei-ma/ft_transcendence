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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const ioredis_2 = require("@nestjs-modules/ioredis");
let MatchmakingService = class MatchmakingService {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    async processQueue(player) {
        const QUEUE_KEY = 'matchmaking_queue';
        const RANK_TOLERANCE = 100;
        await this.redis.zadd(QUEUE_KEY, player.rank, player.userId);
        const minRank = player.rank - RANK_TOLERANCE;
        const maxRank = player.rank + RANK_TOLERANCE;
        const potentialOpponents = await this.redis.zrangebyscore(QUEUE_KEY, minRank, maxRank);
        const opponents = potentialOpponents.filter(id => id !== player.userId);
        if (opponents.length >= 1) {
            const opponentId = opponents[0];
            await this.redis.zrem(QUEUE_KEY, player.userId, opponentId);
            const matchId = `match_${Math.random().toString(36).substring(7)}`;
            console.log(`[RankedMatch] Scontro equilibrato: ${player.userId} vs ${opponentId}`);
            return {
                status: 'MATCH_FOUND',
                matchId,
                players: [player.userId, opponentId]
            };
        }
        return { status: 'SEARCHING_EQUILIBRATED_MATCH' };
    }
};
exports.MatchmakingService = MatchmakingService;
exports.MatchmakingService = MatchmakingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, ioredis_2.InjectRedis)()),
    __metadata("design:paramtypes", [ioredis_1.default])
], MatchmakingService);
//# sourceMappingURL=matchmaking.service.js.map