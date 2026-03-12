import {
	Controller,
	Get,
	Post,
	Patch,
	Param,
	Body,
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
import { GameInviteService } from "../services/game-invite.service";
import {
	SendGameInviteDto,
	RespondGameInviteDto,
	RespondGameInviteResponseDto,
	GameInviteResponseDto,
	GameInviteListResponseDto,
} from "../dto";

@ApiTags("Game Invites")
@Controller("api/users/me/invites")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GameInviteController {
	constructor(private readonly gameInviteService: GameInviteService) {}

	@Post(":targetId")
	@ApiOperation({ summary: "Send a game invite" })
	@ApiParam({ name: "targetId", type: Number })
	@ApiResponse({ status: HttpStatus.CREATED, type: GameInviteResponseDto })
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Cannot invite yourself",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User not found",
	})
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: "Pending invite already exists",
	})
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async sendInvite(
		@CurrentUser("sub") userId: number,
		@Param("targetId", ParseIntPipe) targetId: number,
		@Body() dto: SendGameInviteDto,
	): Promise<GameInviteResponseDto> {
		return this.gameInviteService.sendInvite(userId, targetId, dto);
	}

	@Get()
	@ApiOperation({ summary: "List pending received game invites" })
	@ApiResponse({ status: HttpStatus.OK, type: GameInviteListResponseDto })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async getPendingInvites(
		@CurrentUser("sub") userId: number,
	): Promise<GameInviteListResponseDto> {
		return this.gameInviteService.getPendingInvites(userId);
	}

	@Patch(":id/respond")
	@ApiOperation({ summary: "Accept or reject a game invite" })
	@ApiParam({ name: "id", type: Number })
	@ApiResponse({
		status: HttpStatus.OK,
		type: RespondGameInviteResponseDto,
		description:
			"lobbyId is set when ACCEPTED (join for character selection), null when REJECTED",
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Invite expired or not pending",
	})
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: "A player is no longer available (in game or queue)",
	})
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	@ApiResponse({ status: HttpStatus.FORBIDDEN })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async respondInvite(
		@CurrentUser("sub") userId: number,
		@Param("id", ParseIntPipe) inviteId: number,
		@Body() dto: RespondGameInviteDto,
	): Promise<RespondGameInviteResponseDto> {
		return this.gameInviteService.respondInvite(userId, inviteId, dto);
	}
}
