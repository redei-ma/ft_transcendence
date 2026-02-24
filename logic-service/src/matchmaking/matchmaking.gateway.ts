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
    
    constructor(private readonly matchmakingService: MatchmakingService) {}
    
    afterInit(server: Server) {
    console.log('Matchmaking Gateway Initialized');
    }

    handleConnection(client: any, ...args: any[]) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: any) {
        console.log(`Client disconnected: ${client.id}`);
    }
    
    @SubscribeMessage('join_ranked')
    async handleOnline(@MessageBody() data: JoinQueueDto, @ConnectedSocket() client: Socket) {
        data.socketId = client.id;
        console.log("trying to enter in a ranked");
        return await this.matchmakingService.processQueue(data);
    }

    @OnEvent('match.found.internal') // <--- Questo riceve il grido dal Service
    handleMatchFoundInternal(payload: { socketId: string; data: any }) {
        console.log(`[Gateway] Spedisco notifica match al socket: ${payload.socketId}`);
        this.server.to(payload.socketId).emit('match_found', payload.data);
    }
}
