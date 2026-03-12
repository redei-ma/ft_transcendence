import {
	Controller,
	Get,
	Param,
	Query,
	ParseIntPipe,
	HttpStatus,
	UseGuards,
} from "@nestjs/common";
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiParam,
	ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard, CurrentUser } from "@transcendence/auth";
import { MatchHistoryService } from "../services/match-history.service";
import { MatchHistoryQueryDto, MatchHistoryResponseDto } from "../dto";

@ApiTags("Users")
@Controller("api/users")
export class MatchHistoryController {
	constructor(
		private readonly matchHistoryService: MatchHistoryService,
	) {}

	@Get("me/matches")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Get current user match history" })
	@ApiResponse({ status: HttpStatus.OK, type: MatchHistoryResponseDto })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async getMyMatchHistory(
		@CurrentUser("sub") userId: number,
		@Query() query: MatchHistoryQueryDto,
	): Promise<MatchHistoryResponseDto> {
		return this.matchHistoryService.getMyMatchHistory(userId, query);
	}

	@Get(":id/matches")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Get match history of a player" })
	@ApiParam({ name: "id", type: Number })
	@ApiResponse({ status: HttpStatus.OK, type: MatchHistoryResponseDto })
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async getUserMatchHistory(
		@Param("id", ParseIntPipe) targetId: number,
		@Query() query: MatchHistoryQueryDto,
	): Promise<MatchHistoryResponseDto> {
		return this.matchHistoryService.getUserMatchHistory(targetId, query);
	}
}
