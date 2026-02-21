/* Controller che riceve i messaggi dal microservizio gateway riguardanti il matchmaking */

import { Controller, Post, Body } from '@nestjs/common'; // definizione della classe controller, colui che riceve i messaggi
import { MessagePattern, Payload } from '@nestjs/microservices'; // indica che cosa ascoltare in base ai nomi dei messaggi, payload è quello che nel pratico estrae i dati e li inserisce in una variabile
import { MatchmakingService } from './matchmaking.service'; // file con la logica che si occupa di elaborare il dato
import { JoinQueueDto } from './dto/join-queue.dto'; // struttura del dato che ricevo

@Controller('matchmaking')
export class MatchmakingController { // definizione della classe controller
  constructor(private readonly matchmakingService: MatchmakingService) {} // "inietto" il servizio che si occupa della logica, in questo caso matchmakingService

  @Post('join') // <--- Definisce la rotta /matchmaking/join
    async joinQueueHttp(@Body() data: JoinQueueDto) {
      console.log(`[HTTP] Ricevuta richiesta di join da utente: ${data.userId}`);
      return await this.matchmakingService.processQueue(data);
  }

  @MessagePattern('join_queue') // nome del messaggio da "ascoltare"
  async handleJoinQueue(@Payload() data: JoinQueueDto) { // metodo per prendere il messaggio in json e trasformarlo in un oggetto, in questo caso chiamato "data"
    console.log(`[Logic] Utente ${data.userId} (Rank: ${data.rank}) entrato in coda`);
    return this.matchmakingService.processQueue(data); // passo l'oggetto "data" al servizio che si occupa della logica
  }

  @MessagePattern('leave_queue') // // nome del messaggio da "ascoltare"
  async handleLeaveQueue(@Payload() data: JoinQueueDto) {
    // chiamata al service per eliminare utente dalla coda di redis
    return await this.matchmakingService.leaveQueue(data);
  }

  @MessagePattern('get_queue_count')
  async getQueueCount() {
    return await this.matchmakingService.getQueueCount();  }

  @MessagePattern('match_finished')
  async handleMatchFinished(@Payload() data: { winnerId: string, loserId: string }) {
    return await this.matchmakingService.updateRanks(data.winnerId, data.loserId);
  }

  @MessagePattern({ cmd: 'create_challenge' })
  async createChallenge(data: { challengerId: string; opponentId: string }) {
    return await this.matchmakingService.createChallenge(data.challengerId, data.opponentId);
  }

  @MessagePattern({ cmd: 'accept_challenge' })
  async acceptChallenge(data: { challengerId: string; opponentId: string }) {
    return await this.matchmakingService.acceptChallenge(data.challengerId, data.opponentId);
  }

  @MessagePattern({ cmd: 'reject_challenge' })
  async rejectChallenge(data: { challengerId: string; opponentId: string }) {
    return await this.matchmakingService.rejectChallenge(data.challengerId, data.opponentId);
  }

  @MessagePattern({ cmd: 'cancel_challenge' })
  async cancelChallenge(data: { challengerId: string; opponentId: string }) {
    return await this.matchmakingService.cancelChallenge(data.challengerId, data.opponentId);
  }

  /* ----------------------------------------------------------------------- */
  // test forzato per vedere senza front end
  /* @Get('debug/force-match')
  async forceMatch() {
    // Simuliamo due player con i dati completi richiesti dal nuovo DTO
    const p1 = { 
        userId: 'user_LEO', 
        rank: 1000, 
        characterName: 'Zeus', 
        isAiPlayer: false,
        socketId: 'socket_leo_123'
    };
    
    const p2 = { 
        userId: 'user_GIO', 
        rank: 1150, 
        characterName: 'Ade', 
        isAiPlayer: false,
        socketId: 'socket_gio_456'
    }; 

    // Usiamo il nome corretto della variabile (this.matchmakingService invece di this.service)
    await this.matchmakingService.processQueue(p1);
    const result = await this.matchmakingService.processQueue(p2); 

    return { message: "Match forzato inviato al Game Server", result };*/ 
  //}
}