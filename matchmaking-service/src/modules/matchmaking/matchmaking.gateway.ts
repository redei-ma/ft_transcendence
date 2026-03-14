import {
	WebSocketGateway,
	SubscribeMessage,
	MessageBody,
	ConnectedSocket,
	WebSocketServer,
	OnGatewayInit,
	OnGatewayConnection,
	OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { OnEvent } from "@nestjs/event-emitter"; // <--- IMPORTANTE: serve per ascoltare il Service
import { MatchmakingService } from "./matchmaking.service";
import { JoinQueueDto } from "./dto/join-queue.dto"; // struttura del dato che ricevo
import {
	parseCookieHeader,
	verifyJwtToken,
	AUTH_COOKIE_NAME,
} from "@transcendence/auth";
// CurrentUser decorator removed: not usable in WebSocket context without guard setup
import { Logger } from "@nestjs/common";
import { GameEvents } from "@transcendence/types";	
// join_ranked, join_unranked, join_ai, join_local
// matchmaking.gateway.ts
@WebSocketGateway({ cors: true })
export class MatchmakingGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
	@WebSocketServer()
	server: Server;

	private readonly logger = new Logger(MatchmakingGateway.name);
	private socketToUser = new Map<string, number>();

	constructor(private readonly matchmakingService: MatchmakingService) {}

	afterInit(server: Server) {
		this.logger.log("Matchmaking Gateway Initialized");
	}

	handleConnection(client: Socket) {
		try {
			const token = parseCookieHeader(
				client.handshake.headers.cookie,
				AUTH_COOKIE_NAME,
			);
			if (!token) {
				client.disconnect();
				return;
			}
			client.data.user = verifyJwtToken(token);
			this.logger.log(
				`Client connected: ${client.id}, userId: ${client.data.user.sub}`,
			);
		} catch {
			this.logger.warn(
				`Client connected without valid JWT: ${client.id}`,
			);
			client.disconnect();
		}
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

	@OnEvent(GameEvents.INTERNAL_MATCH_FOUND)
	handleMatchFoundInternal(payload: { socketId: string; data: any }) {
		const clientSocket = this.server.sockets.sockets.get(payload.socketId);
		if (clientSocket) {
			clientSocket.emit(GameEvents.MATCH_FOUND, payload.data);
			console.log(
				`[Socket] Notifica inviata al socket: ${payload.socketId}`,
			);
		} else {
			console.warn(
				`[Socket] Impossibile trovare il socket ${payload.socketId} per inviare il match`,
			);
		}
	}


	@SubscribeMessage(GameEvents.JOIN_RANKED)
	async handleJoinRanked(
		@MessageBody() data: JoinQueueDto,
		@ConnectedSocket() client: Socket,
	) {
		const userId: number = client.data.user.sub;
		this.registerUserSocket(client.id, userId);
		return await this.matchmakingService.processQueue(userId, data);
	}

	@SubscribeMessage(GameEvents.JOIN_UNRANKED)
	async handleJoinUnranked(
		@MessageBody() data: JoinQueueDto,
		@ConnectedSocket() client: Socket,
	) {
		const userId: number = client.data.user.sub;
		this.registerUserSocket(client.id, userId);
		this.logger.log(
			`User ${userId} joining unranked queue (Socket: ${client.id})`,
		);
		return await this.matchmakingService.processUnrankedQueue(userId, data);
	}
	
	@SubscribeMessage(GameEvents.JOIN_AI)
	async handleJoinAi(
		@MessageBody() data: JoinQueueDto,
		@ConnectedSocket() client: Socket,
	) {
		const userId: number = client.data.user.sub;
		this.registerUserSocket(client.id, userId);
		return await this.matchmakingService.startAiMatch(userId, data);
	}
	
	@SubscribeMessage(GameEvents.JOIN_LOCAL)
	async handleJoinLocal(
		@MessageBody() data: JoinQueueDto,
		@ConnectedSocket() client: Socket,
	) {
		const userId: number = client.data.user.sub;
		this.registerUserSocket(client.id, userId);
		return await this.matchmakingService.startLocalMatch(userId, data);
	}

	@SubscribeMessage(GameEvents.LEAVE_QUEUE)
	async handleLeaveQueue(
		@MessageBody() data: JoinQueueDto,
		@ConnectedSocket() client: Socket,
	) {
		const userId: number = client.data.user.sub;
		return await this.matchmakingService.leaveQueue(userId, data);
	}

	private registerUserSocket(socketId: string, userId: number) {
		this.socketToUser.set(socketId, userId);
	}
}
