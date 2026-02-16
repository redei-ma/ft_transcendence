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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const matchmaking_service_1 = require("./matchmaking.service");
const join_queue_dto_1 = require("./dto/join-queue.dto");
let MatchmakingController = class MatchmakingController {
    matchmakingService;
    constructor(matchmakingService) {
        this.matchmakingService = matchmakingService;
    }
    handleJoinQueue(data) {
        console.log(`[Logic] Utente ${data.userId} (Rank: ${data.rank}) entrato in coda`);
        return this.matchmakingService.processQueue(data);
    }
};
exports.MatchmakingController = MatchmakingController;
__decorate([
    (0, microservices_1.MessagePattern)('join_queue'),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [join_queue_dto_1.JoinQueueDto]),
    __metadata("design:returntype", void 0)
], MatchmakingController.prototype, "handleJoinQueue", null);
exports.MatchmakingController = MatchmakingController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [matchmaking_service_1.MatchmakingService])
], MatchmakingController);
//# sourceMappingURL=matchmaking.controller.js.map