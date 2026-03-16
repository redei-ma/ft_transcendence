import { ConnectedSocket,MessageBody,OnGatewayConnection,OnGatewayDisconnect,OnGatewayInit,SubscribeMessage,WebSocketGateway } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UseGuards, Logger, UseFilters } from "@nestjs/common";
import { WsThrottlerGuard } from "./guards/game.WsThrottlerGuard";
import { GameService } from "./game.service";
import { GameInputDto, GameMessageDto } from "./dto";
import { GameSession } from "./core";
import { GameExceptionFilter } from "./errorHandling/game.WsGameExceptionFilter";
import { Vector,ErrorCode,SuccessCode,ExitStatus,GameEvents } from "@transcendence/types";
import { parseCookieHeader,verifyJwtToken,AUTH_COOKIE_NAME } from "@transcendence/auth";
import { GameData } from "./game-interfaces";
import { Throttle } from "@nestjs/throttler";

/* @WebSocketGateway()
Decorator that marks this class as a Gateway. It enables real-time, bidirectional
communication. It acts like a Controller but for WebSockets.
*/
@WebSocketGateway({
	cors: {
		origin: process.env.FRONTEND_URL,
		methods: ["GET", "POST"],
		credentials: true,
	},
})
/* This guard will be applied to all events, which means that it will be executed before all methods are called. */
@UseGuards(WsThrottlerGuard)
@UseFilters(new GameExceptionFilter())
export class GameGateway
	implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
	private readonly logger: Logger = new Logger(GameGateway.name);

	/* Dependency Injection:
		We ask NestJS to provide the instance of GameService.*/
	constructor(private readonly gameService: GameService) {}

	afterInit(server: Server): void {
		this.gameService.setServer(server);
		this.logger.log("Gateway instance created");
	}

	private securityVerify(client: Socket){
		try {
			const token = parseCookieHeader(
				client.handshake.headers.cookie,
				AUTH_COOKIE_NAME,
			);
			if (!token) {
				this.sendErrorAndDisconnectClient(client, {status: ErrorCode.UNAUTHORIZED_TOKEN, message: 'Invalid token'});
				this.logger.warn("invalid token JWT reached");
				return false;
			}

			client.data.user = verifyJwtToken(token);
		}
		catch(error){
			this.sendErrorAndDisconnectClient(client, {status: ErrorCode.UNAUTHORIZED_TOKEN, message: 'Invalid token'});
			this.logger.warn("invalid jwt token reached");
			return false;
		}

		return true;
	}

	/* Implementation of the OnGatewayConnection interface.
		Called automatically when a client connects.*/
	handleConnection(@ConnectedSocket() client: Socket): void {
		/* CRITICAL: We use a LOCAL variable (const).
			Since this class is a Singleton (shared instance), we cannot save state in 'this'.
			'client.id' is unique for this specific connection.*/
		const socketId = client.id;
		if (!socketId) {
			this.logger.error("invalid socket reached, ignoring");
			return;
		}

		const isVerified: boolean = this.securityVerify(client);
		if (!isVerified) return ;

		const userDbId: number = client.data.user.sub;
		if(isNaN(userDbId)){
			this.sendErrorAndDisconnectClient(client, {status: ErrorCode.UNAUTHORIZED, message: 'invalid userId'});
			return ;
		}
		this.logger.log(`New client arrived ${userDbId}`);

		const gameData: GameData | undefined =
			this.gameService.hasPendingMatch(userDbId);
		if (gameData) {
			for (const player of gameData.players) {
				if (userDbId !== player.userDbId) {
					continue;
				}

				this.gameService.setSocketToGame(socketId, gameData.gameId);

				this.logger.log(`New client arrived ${userDbId} in game ${gameData.gameId}`);

				client.join(gameData.gameId);

				this.logger.debug("player added in socket room");
				const session: GameSession | undefined =
					this.gameService.getGameById(gameData.gameId);
				if (!session) {
					this.sendErrorAndDisconnectClient(client, {
						status: ErrorCode.SESSION_NOT_FOUND,
						message:
							"Session not found, retry to search a new game",
					});
					this.logger.warn(
						"unable to locate the session, disconnecting",
					);
					return;
				} else {
					const result = session.addPlayer(player, socketId);

					if (result.status !== SuccessCode.OK) {
						this.logger.warn(
							`error=${result.status} message=${result.message} user=${userDbId} is not in game list`,
						);
						this.sendErrorAndDisconnectClient(client, result);
					}
				}
			}
		} else {
			this.sendErrorAndDisconnectClient(client, {
				status: ErrorCode.PLAYER_NOT_FOUND,
				message: "This player isn t in the game list",
			});
			this.logger.warn(`${userDbId} is not in game list`);
		}
	}

	/* Implementation of OnGatewayDisconnect */
	handleDisconnect(@ConnectedSocket() client: Socket): void {
		const socketId = client.id;
		if (!socketId) {
			this.logger.error("invalid socket reached, ignoring");
			return;
		}

		const result = this.gameService.handlePlayerDisconnect(socketId);
		if (result.status !== SuccessCode.OK) {
			this.sendErrorAndDisconnectClient(client, result);
			this.logger.warn(
				`error in removing the player from the game, message: ${result.message}`,
			);
		} else this.logger.log(`client with socket-id ${socketId} is exit`);
	}

	/* @SubscribeMessage: Listens for specific events named 'input'.
	@MessageBody: Automatically extracts and parses the JSON .*/
	@SubscribeMessage(GameEvents.INPUT)
	handleInput(
		@ConnectedSocket() client: Socket,
		@MessageBody() input: GameInputDto,
	): void {
		const socketId = client.id;
		if (!socketId) {
			this.logger.error("invalid socket reached, ignoring");
			return;
		}

		if (!input || !isFinite(input.x) || !isFinite(input.z)) {
			this.logger.warn("invalid input reached");
			return;
		}

		const normalizedInput: Vector = Vector.fromData(input);
		normalizedInput.normalize();

		this.gameService.handleInput(
			socketId,
			normalizedInput,
			input.attackType,
			input.playerIndex
		);
	}

	@Throttle({ default: { limit: 20, ttl: 10000 } })
	@SubscribeMessage(GameEvents.GAME_MESSAGE)
	handleGameMessage(
		@ConnectedSocket() client: Socket,
		@MessageBody() input: GameMessageDto): void {
		const socketId = client.id;
		if (!socketId) {
			this.logger.error("invalid socket reached, ignoring");
			return;
		}

		this.gameService.processGameMessage(socketId, input.message);
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
}
