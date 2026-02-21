import { Controller, Logger } from "@nestjs/common";
import { GameService } from "./game.service";
import { EventPattern, Payload } from "@nestjs/microservices";
import { NetworkConfig } from "./configs";
import { MatchType, MatchMakingData, MatchMode } from "./interfaces-enums";

@Controller('matchmaking')
export class MatchMakingController{

	private logger: Logger = new Logger(MatchMakingController.name);

	constructor(private readonly gameService: GameService) {}

	@EventPattern(NetworkConfig.MATCHMAKING.MATCH_EVENTS.CREATE_MATCH)
	handleMatchCreation(@Payload() data: {playersData: MatchMakingData[], gameId: string, matchType: MatchType, matchMode: MatchMode}){

		const gameId: string | undefined = this.gameService.createMatch(data.playersData, data.gameId, data.matchMode, data.matchType);

		if (gameId){
			this.logger.log(`Match created with id ${gameId}`);
		}

		return (gameId);
	}
}