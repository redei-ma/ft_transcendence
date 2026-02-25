import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger, UseFilters } from '@nestjs/common';
import { WsThrottlerGuard } from './game.WsThrottlerGuard';
import { GameService } from './game.service';
import { Vector } from './utils';
import { GameInputDto, GameMessageDto } from './dto';
import { SocketEvents } from './configs';
import { GameSession } from './core';
import { GameData, ErrorCode, SuccessCode } from './interfaces-enums';
import { GameExceptionFilter } from './game.WsGameExceptionFilter';


//questo e' come dovra' essere alla fine
//@WebSocketGateway({ cors:{
//	origin: process.env.FRONT_END_URL,
//	methods: ['POST'],
//	credentials: true,
//} })

/* @WebSocketGateway()
	Decorator that marks this class as a Gateway. It enables real-time, bidirectional
	communication. It acts like a Controller but for WebSockets.
*/
@WebSocketGateway({ cors: true })


/* This guard will be applied to all events, which means that it will be executed before all methods are called. */
@UseGuards(WsThrottlerGuard)
@UseFilters(new GameExceptionFilter())
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {

	private readonly logger: Logger = new Logger(GameGateway.name);

	/* Dependency Injection:
		We ask NestJS to provide the instance of GameService.*/
	constructor(private readonly gameService: GameService) {}

	afterInit( server: Server): void {
		this.gameService.setServer(server);
		this.logger.log('Gateway instance created');
	}

	/* Implementation of the OnGatewayConnection interface.
		Called automatically when a client connects.*/
	handleConnection(@ConnectedSocket() client: Socket): void {
		/* CRITICAL: We use a LOCAL variable (const).
			Since this class is a Singleton (shared instance), we cannot save state in 'this'.
			'client.id' is unique for this specific connection.*/
		const socketId = client.id;
		if (!socketId) return;

		const userDbId: string = client.handshake.query.userDbId as string;
		//if (isNaN(userDbId)){
		//	client.emit('exception', {
		//		status: 'error',
		//		errorCode: ErrorCode.INTERNAL_ERROR,
		//		message: 'Invalid user DB ID'
		//	});
		//	client.disconnect();
		//	return;
		//}

		const gameData: GameData | undefined = this.gameService.hasPendingMatch(userDbId);
		if (gameData){
			for (const player of gameData.players){
				if (userDbId !== player.userDbId) continue ;

				this.gameService.setSocketToGame(socketId, gameData.gameId);
				client.join(gameData.gameId);

				this.logger.log(`New client arrived ${userDbId} in game ${gameData.gameId}`);

				const session: GameSession | undefined = this.gameService.getGameById(gameData.gameId);
				if (!session){
					client.emit('exception', {
						status: 'error',
						errorCode: ErrorCode.SESSION_NOT_FOUND,
						message: 'Session not found, retry to search a new game'
					});
					client.disconnect();
					return;
				}
				const result = session.addPlayer(player, socketId);
				if (result.status !== SuccessCode.OK){
					client.emit('exception', {
						status: 'error',
						errorCode: result.status,
						message: result.message || 'Error in adding the player in the session'
					});
					client.disconnect();
					this.logger.warn(`${userDbId} is not in game list`);
				}
			}
		}
		else{
			client.emit('exception', {
				status: 'error',
				errorCode: ErrorCode.PLAYER_NOT_FOUND,
				message: 'This player isn t in the game list'
			});
			client.disconnect();
			this.logger.warn(`${userDbId} is not in game list`);
		}
	}

	/* Implementation of OnGatewayDisconnect */
	handleDisconnect(@ConnectedSocket() client: Socket): void {
		const socketId = client.id;
		if (!socketId) return;

		this.gameService.handlePlayerDisconnect(socketId);

		this.logger.log(`client with socket-id ${socketId} is crashed`);
	}

	/* @SubscribeMessage: Listens for specific events named 'input'.
	@MessageBody: Automatically extracts and parses the JSON payload into a Vector object.*/
	@SubscribeMessage(SocketEvents.INPUT)
	handleInput(
		@ConnectedSocket() client: Socket,
		@MessageBody() input: GameInputDto): void{

		const socketId = client.id;

		this.gameService.handleInput(socketId, Vector.fromData(input), input.attackType, input.playerIndex);
	}

	@SubscribeMessage(SocketEvents.GAME_MESSAGE)
	handleGameMessage(
		@ConnectedSocket() client: Socket,
		@MessageBody() input: GameMessageDto): void{

			const socketId = client.id;

			if (!socketId) return ;

			this.gameService.processGameMessage(socketId, input.message);
		}
}
