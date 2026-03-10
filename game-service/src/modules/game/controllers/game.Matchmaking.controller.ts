import { BadRequestException, Body, Controller, Logger, Post, UseGuards } from "@nestjs/common";
import { GameService } from "../game.service";
import { CreateMatchDto } from "../dto/matchMaking.dto";
import { ExitStatus, SuccessCode, NetworkConfig } from "@transcendence/types";
import { ConfigService } from '@nestjs/config';
//import { MatchmakingGuard } from "../guards/game.matchmaking-guard";

@Controller('matchmaking')
//@UseGuards(MatchmakingGuard)
export class MatchMakingController{

	private logger: Logger = new Logger(MatchMakingController.name);

	constructor(private readonly gameService: GameService, private readonly configService: ConfigService) {}

	@Post(NetworkConfig.MATCHMAKING.MATCH_EVENTS.CREATE_MATCH)
	async handleMatchCreation(
		@Body() data: CreateMatchDto)
	{

		this.logger.log(`post http request recived by matchmaking, trying to create the match.\n
			data recived from matchmaking: gameId=${data.gameId}, player1=${data.playersData[0].userDbId},
			player2=${data.playersData[1].userDbId }, matchMode=${data.matchMode}, matchType=${data.matchType}`);

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