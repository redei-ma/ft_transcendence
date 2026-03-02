/* Controller che riceve i messaggi dal microservizio gateway riguardanti il matchmaking */

import { Controller, Post, Body } from '@nestjs/common'; 
import { MessagePattern, Payload } from '@nestjs/microservices'; 
import { MatchmakingService } from './matchmaking.service'; 
import { JoinQueueDto } from './dto/join-queue.dto'; 

@Controller()
export class MatchmakingController { 
  constructor(private readonly matchmakingService: MatchmakingService) {} 

  @Post('join')
  async joinQueueHttp(@Body() data: JoinQueueDto) {
    console.log(`[HTTP] Ricevuta richiesta di join utente: ${data.userDbId}`);
    return await this.matchmakingService.processQueue(data);
  }

  @Post('create-match') // o il tuo endpoint di riferimento
  async startLocalMatch(@Body() payload: any) {
      // Passiamo l'intero oggetto 'payload' invece di dividere in 2 argomenti
      return await this.matchmakingService.startLocalMatch(payload);
  }

  @MessagePattern('join_queue') 
  async handleJoinQueue(@Payload() data: JoinQueueDto) { 
    console.log(`[Logic] Utente ${data.userDbId} (Rank: ${data.rank}) entrato in coda`);
    return this.matchmakingService.processQueue(data); 
  }

  @MessagePattern('join_ai') 
  async handleJoinAi(@Payload() data: any) { 
      console.log(`[Logic] Utente ${data.userDbId} ha richiesto un match contro IA`);
      
      // Inoltriamo la richiesta al servizio logico
      return this.matchmakingService.startAiMatch(data); 
  }

  @MessagePattern('leave_queue') 
  async handleLeaveQueue(@Payload() data: JoinQueueDto) {
    return await this.matchmakingService.leaveQueue(data);
  }

  @MessagePattern('get_queue_count')
  async getQueueCount() {
    return await this.matchmakingService.getQueueCount();  
  }

  @MessagePattern('end-game')
  async handleMatchFinished(@Payload() data: any) {
      const id = typeof data === 'string' ? data : data?.matchId || data?.gameId;
      console.log(`[Controller] Ricevuto segnale end-game per ID: ${id}`);
      return await this.matchmakingService.finalizeMatch(id);
  }

  // Riceve il DTO completo del challenger e l'ID dell'avversario
  @MessagePattern({ cmd: 'create_challenge' })
  async createChallenge(@Payload() data: { challenger: JoinQueueDto; opponentId: string }) {
    return await this.matchmakingService.createChallenge(data.challenger, data.opponentId);
  }

  // Riceve l'ID del challenger e il DTO completo di chi accetta (opponent)
  @MessagePattern({ cmd: 'accept_challenge' })
  async acceptChallenge(@Payload() data: { challengerId: string; opponent: JoinQueueDto }) {
    return await this.matchmakingService.acceptChallenge(data.challengerId, data.opponent);
  }

  // Riceve l'ID del challenger e il DTO completo di chi rifiuta (opponent)
  @MessagePattern({ cmd: 'reject_challenge' })
  async rejectChallenge(@Payload() data: { challengerId: string; opponent: JoinQueueDto }) {
    return await this.matchmakingService.rejectChallenge(data.challengerId, data.opponent);
  }

  // Riceve il DTO completo del challenger che annulla e l'ID dell'avversario
  @MessagePattern({ cmd: 'cancel_challenge' })
  async cancelChallenge(@Payload() data: { player: JoinQueueDto; opponentId: string }) {
    return await this.matchmakingService.cancelChallenge(data.player, data.opponentId);
  }
}