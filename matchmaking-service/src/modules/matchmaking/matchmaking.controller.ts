/* Controller che riceve i messaggi dal microservizio gateway riguardanti il matchmaking */


// dividere il file in due: uno per i controller HTTP e uno per i controller microservizi (MessagePattern)


import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { MatchmakingService } from "./matchmaking.service";
import { JoinQueueDto } from "./dto/join-queue.dto";
import { JwtAuthGuard, CurrentUser } from "@transcendence/auth";

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
}
