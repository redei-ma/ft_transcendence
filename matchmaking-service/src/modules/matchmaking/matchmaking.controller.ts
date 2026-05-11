
import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { MatchmakingService } from "./matchmaking.service";
import { JoinQueueDto } from "./dto/join-queue.dto";
import { JwtAuthGuard, CurrentUser } from "@transcendence/auth";
import { GameEvents } from "@transcendence/types";

@Controller()
export class MatchmakingController {
	constructor(private readonly matchmakingService: MatchmakingService) {}

	@UseGuards(JwtAuthGuard)
	@Post("join")
	async joinQueueHttp(@Body() data: JoinQueueDto, @CurrentUser("sub") userId: number) {
		console.log(`[HTTP] Ricevuta richiesta di join utente: ${userId}`);
		return await this.matchmakingService.processQueue(userId, data);
	}

	@UseGuards(JwtAuthGuard)
	@Post("create-match")
	async startLocalMatch(@Body() payload: JoinQueueDto, @CurrentUser("sub") userId: number) {
		return await this.matchmakingService.startLocalMatch(userId, payload);
	}

	@UseGuards(JwtAuthGuard)
	@Post("join_unranked")
	async joinUnrankedQueueHttp(@Body() data: JoinQueueDto, @CurrentUser("sub") userId: number) {
		console.log(`[HTTP] Ricevuta richiesta Unranked per utente: ${userId}`);
		return await this.matchmakingService.processUnrankedQueue(userId, data);
	}

	@MessagePattern(GameEvents.END_GAME)
	async handleMatchFinished(@Payload() data: string | { matchId?: string; gameId?: string }) {
		const matchId = typeof data === "string" ? data : (data?.matchId ?? data?.gameId);
		if (!matchId) return;
		this.matchmakingService.finalizeMatch(matchId);
	}

	@MessagePattern("player-left-match")
    async handlePlayerLeftMatch(@Payload() data: { userDbId?: number; gameId?: string }) {
        const matchId = data?.gameId;
        if (!matchId) {
            console.log([Signal] Errore: Ricevuto player-left-match senza gameId valido. Payload:, data);
            return;
        }
        console.log([Signal] Ricevuto player-left-match dall'utente ${data.userDbId} per il match: ${matchId});
        this.matchmakingService.finalizeMatch(matchId);
    }
}
