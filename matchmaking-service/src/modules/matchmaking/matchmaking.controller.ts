/* Controller che riceve i messaggi dal microservizio gateway riguardanti il matchmaking */


// dividere il file in due: uno per i controller HTTP e uno per i controller microservizi (MessagePattern)


import { Controller, Post, Body } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { MatchmakingService } from "./matchmaking.service";
import { JoinQueueDto } from "./dto/join-queue.dto";
import { GameEvents } from "@transcendence/types";
import { UseGuards } from "@nestjs/common";
import { JwtAuthGuard, CurrentUser } from "@transcendence/auth";

@Controller()
export class MatchmakingController {
	constructor(private readonly matchmakingService: MatchmakingService) {}

	@UseGuards(JwtAuthGuard)
	@Post("join")
	async joinQueueHttp(@Body() data: JoinQueueDto, @CurrentUser("sub") userId: number) {
		console.log(
			`[HTTP] Ricevuta richiesta di join utente: ${data.userDbId}`,
		);
		return await this.matchmakingService.processQueue(userId, data);
	}

	@UseGuards(JwtAuthGuard)
	@Post("create-match") // o il tuo endpoint di riferimento
	async startLocalMatch(@Body() payload: JoinQueueDto, @CurrentUser("sub") userId: number) {
		// Passiamo l'intero oggetto 'payload' invece di dividere in 2 argomenti
		return await this.matchmakingService.startLocalMatch(userId, payload);
	}

	/*@UseGuards(JwtAuthGuard)
	@Post("join_unranked")
    async joinUnrankedQueueHttp(@Body() data: JoinQueueDto, @CurrentUser("sub") userId: number) {
        console.log(
            `[HTTP] Ricevuta richiesta Unranked per utente: ${data.userDbId}`,
        );
        return await this.matchmakingService.processUnrankedQueue(data);
    }*/
}
