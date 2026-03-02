import { 
  WebSocketGateway, 
  SubscribeMessage, 
  MessageBody, 
  ConnectedSocket, 
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter'; // <--- IMPORTANTE: serve per ascoltare il Service
import { MatchmakingService } from './matchmaking.service';
import { JoinQueueDto } from './dto/join-queue.dto';
// join_ranked, join_unranked, join_ai, join_local
// matchmaking.gateway.ts
@WebSocketGateway({ cors: true })
export class MatchmakingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
    
    private socketToUser = new Map<string, string>();
    
    constructor(private readonly matchmakingService: MatchmakingService) {}
    
    afterInit(server: Server) {
    console.log('Matchmaking Gateway Initialized');
    }

    handleConnection(client: any, ...args: any[]) {
        console.log(`Client connected: ${client.id}`); 
    }

    async handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`); 
    }

    /*async handleDisconnect(client: Socket) {
        const userId = this.socketToUser.get(client.id);
        if (userId) {
            console.log(`[Disconnect] Pulizia per utente ${userId} (Socket: ${client.id})`);
            // Chiamiamo una funzione di cleanup nel service
            await this.matchmakingService.cleanupUserOnDisconnect(userId);
            this.socketToUser.delete(client.id);
        }
    }*/
    
    @SubscribeMessage('join_ranked')
    async handleJoinRanked(@MessageBody() data: JoinQueueDto, @ConnectedSocket() client: Socket) {
        this.registerUserSocket(client.id, data.userDbId);
        data.socketId = client.id;
        return await this.matchmakingService.processQueue(data);
    }

    @SubscribeMessage('leave_queue')
    async handleLeaveQueue(@MessageBody() data: JoinQueueDto, @ConnectedSocket() client: Socket) {
        // Non è necessario registrare il socket qui, ma assicuriamoci che l'ID utente sia presente
        return await this.matchmakingService.leaveQueue(data);
    }

    // 2. JOIN AI (Partita contro Bot)
    /*@SubscribeMessage('join_ai')
    async handleJoinAi(@MessageBody() data: JoinQueueDto, @ConnectedSocket() client: Socket) {
        this.registerUserSocket(client.id, data.userDbId);
        data.socketId = client.id;
        return await this.matchmakingService.startAiMatch(data);
    }*/

    // 3. JOIN LOCAL (Partita 1vs1 locale)
    @SubscribeMessage('join_local')
    async handleJoinLocal(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
        this.registerUserSocket(client.id, data.userDbId);
        data.socketId = client.id;
        return await this.matchmakingService.startLocalMatch(data);
    }

    @OnEvent('match.found.internal')
    handleMatchFoundInternal(payload: { socketId: string; data: any }) {
        const clientSocket = this.server.sockets.sockets.get(payload.socketId);
        if (clientSocket) {
            clientSocket.emit('match_found', payload.data);
            console.log(`[Socket] Notifica inviata al socket: ${payload.socketId}`);
        } else {
            console.warn(`[Socket] Impossibile trovare il socket ${payload.socketId} per inviare il match`);
        }
    }

    @SubscribeMessage('create_challenge')
    async handleCreateChallenge(
        @MessageBody() payload: { player: JoinQueueDto; opponentId: string }, 
        @ConnectedSocket() client: Socket
    ) {
        // Registriamo il socket del challenger e aggiorniamo il suo socketId nel DTO
        this.registerUserSocket(client.id, payload.player.userDbId);
        payload.player.socketId = client.id;
        
        return await this.matchmakingService.createChallenge(payload.player, payload.opponentId);
    }

    // 6. REJECT CHALLENGE (Rifiuta una sfida ricevuta)
    @SubscribeMessage('reject_challenge')
    async handleRejectChallenge(
        @MessageBody() payload: { challengerId: string; opponent: JoinQueueDto },
        @ConnectedSocket() client: Socket
    ) {
        // L'opponent (chi rifiuta) aggiorna il suo socketId
        payload.opponent.socketId = client.id;
        
        return await this.matchmakingService.rejectChallenge(payload.challengerId, payload.opponent);
    }

    // 7. CANCEL CHALLENGE (Annulla una sfida inviata in precedenza)
    @SubscribeMessage('cancel_challenge')
    async handleCancelChallenge(
        @MessageBody() payload: { player: JoinQueueDto; opponentId: string },
        @ConnectedSocket() client: Socket
    ) {
        // Il challenger aggiorna il suo socketId
        payload.player.socketId = client.id;
        
        return await this.matchmakingService.cancelChallenge(payload.player, payload.opponentId);
    }

    // Aggiungiamo anche Accept Challenge se mancava nel gateway
    @SubscribeMessage('accept_challenge')
    async handleAcceptChallenge(
        @MessageBody() payload: { challengerId: string; opponent: JoinQueueDto },
        @ConnectedSocket() client: Socket
    ) {
        payload.opponent.socketId = client.id;
        return await this.matchmakingService.acceptChallenge(payload.challengerId, payload.opponent);
    }

    private registerUserSocket(socketId: string, userId: string) {
        this.socketToUser.set(socketId, userId);
    }
}
