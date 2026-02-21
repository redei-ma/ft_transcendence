import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { WsThrottlerGuard } from './WsThrottlerGuard';
import { GameService } from './game.service';
import { Vector } from './utils';
import { GameInputDto, CharacterDto, GameMessageDto } from './dto';
import { CHARACTER_DATA } from './factories';
import { NetworkConfig, SocketEvents } from './configs';
import { MatchMode, CharacterName, MatchMakingData } from './interfaces-enums';
import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';

/* @WebSocketGateway()
	Decorator that marks this class as a Gateway. It enables real-time, bidirectional
	communication. It acts like a Controller but for WebSockets.
*/
@WebSocketGateway({ cors: true })

/* This decorator implements input validation.
Setting 'whitelist: true' ensures that any property not explicitly defined in the DTO is automatically stripped. */
@UsePipes(new ValidationPipe({transform: true, whitelist: true}))

/* This guard will be applied to all events, which means that it will be executed before all methods are called. */
@UseGuards(WsThrottlerGuard)
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {

	private readonly logger: Logger = new Logger(GameGateway.name);

	/* Dependency Injection:
		We ask NestJS to provide the instance of GameService.*/
	constructor(
		private readonly gameService: GameService, 
		@Inject(NetworkConfig.MATCHMAKING.SERVICE.REDIS_CLIENT) private readonly redis: Redis,
	) {}

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

		this.logger.log(`New client arrived with socket ${socketId}`);
	}

	/* Implementation of OnGatewayDisconnect */
	handleDisconnect(@ConnectedSocket() client: Socket): void {
		const socketId = client.id;
		if (!socketId) return;

		this.gameService.handlePlayerDisconnect(socketId);

		this.logger.log(`client with socket-id ${socketId} is crashed`);
	}

	/* Whene the socket event is lobby, this function is triggered */
	@SubscribeMessage(SocketEvents.JOIN_LOBBY)
	async joinGame(
		@ConnectedSocket() client: Socket,
		@MessageBody() payload: CharacterDto): Promise<void>{

			this.logger.log("join lobby event reached");

			//probabilmente questo non va bene qua perche' dovrei prima provare a riconnettere il player in locale e poi fare questa cosa
			const status = await this.redis.get(`player:${payload.userDbId}:status`);
			if (status && status != NetworkConfig.MATCHMAKING.PLAYER_STATUS.LOBBY){
				 return ;//throw new WsGameException('Already in matchmaking');
			}

			await this.redis.set(
    			`player:${payload.userDbId}:status`, 
    			NetworkConfig.MATCHMAKING.PLAYER_STATUS.PLAYING,
    			'EX',
    			3600
			);

			const data: MatchMakingData[] = [];
			let matchMode: MatchMode = MatchMode.LOCAL;

			data.push( {
				socketId: client.id,
				characterName: payload.characterName[0],
				userDbId: payload.userDbId,
				isAiPlayer: false,
				playerIndex: 0,
			});

			if (payload.isAiGame){
				const availableCharacters = Object.keys(CHARACTER_DATA).filter(name => name !== 'Default');
				const randomName = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
				data.push({
					socketId: undefined,
					characterName: randomName as CharacterName,
					userDbId: null,
					isAiPlayer: true,
					playerIndex: 1,
				});
				matchMode = MatchMode.AI;
			}
			else if (payload.isLocalGame){
				data.push( {
					socketId: client.id,
					characterName: payload.characterName[1],
					userDbId: null,
					isAiPlayer: false,
					playerIndex: 1,
				});
				matchMode = MatchMode.LOCAL;
			}

			const gameId: string = randomUUID();
			this.gameService.createMatch(data, gameId, matchMode, payload.matchType);
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