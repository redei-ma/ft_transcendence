
import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { MatchmakingService } from "./matchmaking.service";
import { JoinQueueDto } from "./dto/join-queue.dto";
import { JwtAuthGuard, CurrentUser } from "@transcendence/auth";
import { NetworkConfig } from "@transcendence/types";

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

	@EventPattern(NetworkConfig.MATCHMAKING.MATCH_EVENTS.END_GAME)
	async handleMatchFinished(@Payload() data: string | { matchId?: string; gameId?: string }) {
		const matchId = typeof data === "string" ? data : (data?.matchId ?? data?.gameId);
		if (!matchId) return;
		this.matchmakingService.finalizeMatch(matchId);
	}

	@EventPattern(NetworkConfig.MATCHMAKING.MATCH_EVENTS.PLAYER_LEFT_MATCH)
    async handlePlayerLeftMatch(@Payload() data: { userDbId?: number; gameId?: string }) {
        const userId = data?.userDbId;

        if (!userId) {
            return;
        }

        this.matchmakingService.setPlayerToLobby(userId);
    }
}
