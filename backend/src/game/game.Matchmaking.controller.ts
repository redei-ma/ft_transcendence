import { BadRequestException, Body, Controller, Logger, Post, Headers, UnauthorizedException } from "@nestjs/common";
import { GameService } from "./game.service";
import { NetworkConfig } from "./configs";
import { CreateMatchDto } from "./dto/matchMaking.dto";
import { ErrorCode, SuccessCode } from "./interfaces-enums";
import { ExitStatus } from "./interfaces-enums/exitStatus.interface";
import { ConfigService } from '@nestjs/config';

@Controller('matchmaking')
export class MatchMakingController{

	private logger: Logger = new Logger(MatchMakingController.name);

	constructor(private readonly gameService: GameService, private readonly configService: ConfigService) {}

	@Post(NetworkConfig.MATCHMAKING.MATCH_EVENTS.CREATE_MATCH)
	async handleMatchCreation(
		@Body() data: CreateMatchDto)
		//@Headers('authorization') authHeader: string)
		{

		// const secretKey: string =  this.configService.get<string>('MATCHMAKING_SECRET') || 'default-secret'

		//if (authHeader !== secretKey){
			//this.logger.warn('unauthorized connection recived');
			//throw new UnauthorizedException({
				//errorCode: ErrorCode.UNAUTHORIZED,
				//message: 'this request is unauthorized, closing the connection',
				//gameId: data.gameId,
			//});
		//}
		//La roba commentata va aggiunta per la sicurezza della rotta, oltre all https
		this.logger.log('post http request recived by matchmaking, trying to create the match');

		this.logger.log(`post http request recived by matchmaking, trying to create the match.\n
			data recived from matchmaking: gameId=${data.gameId}, players=${data.playersData}, matchMode=${data.matchMode}, matchType=${data.matchType}`);
		const result: ExitStatus = this.gameService.prepareMatch(data.gameId, data.playersData, data.matchMode, data.matchType);

		if (result.status !== SuccessCode.OK){
			this.logger.warn(`match not created, internal error ${data.gameId}`);
			throw new BadRequestException({
				errorCode: result.status,
				message: result.message || 'Match creation failed', 
				gameId: data.gameId
			});
		}
		this.logger.log(`match created with id ${data.gameId}`);
		return ({message: 'CREATED', gameId: data.gameId});
	}
}