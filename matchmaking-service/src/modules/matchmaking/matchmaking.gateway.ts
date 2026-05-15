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
import { OnEvent } from "@nestjs/event-emitter";
import { MatchmakingService } from "./matchmaking.service";
import { JoinQueueDto } from "./dto/join-queue.dto";
import { parseCookieHeader, verifyJwtToken, AUTH_COOKIE_NAME } from "@transcendence/auth";
import { Logger } from "@nestjs/common";
import { ErrorCode, ExitStatus, GameEvents, MatchMode } from "@transcendence/types";

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

	private sendErrorAndDisconnectClient(
        client: Socket,
        exitStatus: ExitStatus,
    ): void {
        client.emit("exception", {
            status: "error",
            errorCode: exitStatus.status,
            message: exitStatus.message || "undefined error",
        });
        client.disconnect();
    }

	private emitMatchmakingResponse(client: Socket, action: string, payload: any) {
		const responseEvent = `${action}_RESPONSE`;

		if (payload.status && payload.status.startsWith("ERROR_")) {
			this.logger.warn(`[Matchmaking Error -> ${client.id}] ${responseEvent}: ${payload.status} - ${payload.message || ''}`);
		} else {
			this.logger.log(`[Matchmaking Success -> ${client.id}] ${responseEvent}: ${payload.status}`);
		}

		client.emit(responseEvent, payload);
	}

	async handleConnection(client: Socket) {
		try {
			const token = parseCookieHeader(
				client.handshake.headers.cookie,
				AUTH_COOKIE_NAME,
			);
			
			if (!token) {
				this.sendErrorAndDisconnectClient(client, {status: ErrorCode.UNAUTHORIZED_TOKEN, message: 'Invalid token'});
				client.disconnect();
				return;
			}
			
			client.data.user = verifyJwtToken(token);
			const userId = client.data.user.sub;

			this.logger.log(
				`Client connected: ${client.id}, userId: ${userId}`,
			);

			// Il service si occuperà di aggiornare Redis e notificare il client se necessario
			await this.matchmakingService.checkAndReconnectUser(userId, client.id);

		} catch {
			this.logger.warn(
				`Client connected without valid JWT: ${client.id}`,
			);
			this.sendErrorAndDisconnectClient(client, {status: ErrorCode.UNAUTHORIZED_TOKEN, message: 'Invalid token'});
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
	handleMatchFoundInternal(payload: { socketId: string; data: { status: string; matchId: string } }) {
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
		data.socketId = client.id;
		this.registerUserSocket(client.id, userId);
		
		const result = await this.matchmakingService.processQueue(userId, data);
		this.emitMatchmakingResponse(client, GameEvents.JOIN_RANKED, result);
	}

	@SubscribeMessage(GameEvents.JOIN_UNRANKED)
	async handleJoinUnranked(
		@MessageBody() data: JoinQueueDto,
		@ConnectedSocket() client: Socket,
	) {
		const userId: number = client.data.user.sub;
		data.socketId = client.id;
		this.registerUserSocket(client.id, userId);
		this.logger.log(`User ${userId} joining unranked queue (Socket: ${client.id})`);
		
		const result = await this.matchmakingService.processUnrankedQueue(userId, data);
		this.emitMatchmakingResponse(client, GameEvents.JOIN_UNRANKED, result);
	}

	@SubscribeMessage(GameEvents.JOIN_AI)
	async handleJoinAi(
		@MessageBody() data: JoinQueueDto,
		@ConnectedSocket() client: Socket,
	) {
		const userId: number = client.data.user.sub;
		data.socketId = client.id;
		this.registerUserSocket(client.id, userId);
		
		const result = await this.matchmakingService.startAiMatch(userId, data);
		this.emitMatchmakingResponse(client, GameEvents.JOIN_AI, result);
	}

	@SubscribeMessage(GameEvents.JOIN_LOCAL)
	async handleJoinLocal(
		@MessageBody() data: JoinQueueDto,
		@ConnectedSocket() client: Socket,
	) {
		const userId: number = client.data.user.sub;
		data.socketId = client.id;
		this.registerUserSocket(client.id, userId);
		
		const result = await this.matchmakingService.startLocalMatch(userId, data);
		this.emitMatchmakingResponse(client, GameEvents.JOIN_LOCAL, result);
	}

	@SubscribeMessage(GameEvents.ACCEPT_DIRECT_INVITE)
	async handleAcceptDirectInvite(
		@MessageBody() data: { inviterId: number },
		@ConnectedSocket() client: Socket,
	) {
		const acceptorId: number = client.data.user.sub;
		this.registerUserSocket(client.id, acceptorId);
		
		this.logger.log(`[WS] L'utente ${acceptorId} accetta sfida da ${data.inviterId}`);
		
		const result = await this.matchmakingService.createDirectSession(data.inviterId, acceptorId);
		
		if (result.status && result.status.startsWith("ERROR_")) {
			this.emitMatchmakingResponse(client, GameEvents.ACCEPT_DIRECT_INVITE, result);
		} else {
			this.emitMatchmakingResponse(client, GameEvents.ACCEPT_DIRECT_INVITE, { status: "PROCESSING" });
		}
	}

	@OnEvent(GameEvents.INTERNAL_DIRECT_SESSION_READY)
	handleDirectSessionReadyInternal(payload: { socketId: string; data: { status: string; sessionId: string } }) {
		const clientSocket = this.server.sockets.sockets.get(payload.socketId);
		if (clientSocket) {

			clientSocket.emit(GameEvents.DIRECT_SESSION_READY, payload.data);
			this.logger.log(`[Socket] JOIN_DIRECT_SESSION inviato al socket: ${payload.socketId}`);
		}
	}
	
	@SubscribeMessage(GameEvents.JOIN_DIRECT_SESSION)
	async handleJoinDirectSession(
		@MessageBody() data: { sessionId: string; characterName: string; matchMode?: MatchMode },
		@ConnectedSocket() client: Socket,
	) {
		const userId: number = client.data.user.sub;
		const socketId = client.id;
		
		// Aggiorniamo la mappa interna dei socket
		this.registerUserSocket(socketId, userId);
		
		this.logger.log(`[WS] L'utente ${userId} è pronto per la sessione privata ${data.sessionId} con ${data.characterName}`);

		// Chiamiamo il service passando tutti i dati, incluso il socketId attuale
		const result = await this.matchmakingService.joinDirectSession(
			userId,
			data.sessionId,
			data.characterName,
			socketId,
			data.matchMode // Opzionale, se non passato il service userà UNRANKED di default
		);

		// Rispondiamo al client con l'esito (es. WAITING_FOR_OPPONENT, MATCH_STARTING, o ERROR)
		this.emitMatchmakingResponse(client, GameEvents.JOIN_DIRECT_SESSION, result);
	}

	@SubscribeMessage(GameEvents.LEAVE_QUEUE)
	async handleLeaveQueue(
		@MessageBody() data: JoinQueueDto,
		@ConnectedSocket() client: Socket,
	) {
		const userId: number = client.data.user.sub;
		data.socketId = client.id;
		
		const result = await this.matchmakingService.leaveQueue(userId, data);
		this.emitMatchmakingResponse(client, GameEvents.LEAVE_QUEUE, result);
	}
	
	private registerUserSocket(socketId: string, userId: number) {
		this.socketToUser.set(socketId, userId);
	}
}