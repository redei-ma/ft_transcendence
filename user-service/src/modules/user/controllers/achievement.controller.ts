import {
	Controller,
	Get,
	Param,
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
import { AchievementService } from "../services/achievement.service";
import { UserAchievementsResponseDto } from "../dto";

@ApiTags("Users")
@Controller("api/users")
export class AchievementController {
	constructor(
		private readonly achievementService: AchievementService,
	) {}

	@Get("me/achievements")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Get current user achievements" })
	@ApiResponse({ status: HttpStatus.OK, type: UserAchievementsResponseDto })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async getMyAchievements(
		@CurrentUser("sub") userId: number,
	): Promise<UserAchievementsResponseDto> {
		return this.achievementService.getMyAchievements(userId);
	}

	@Get(":id/achievements")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Get achievements of a player" })
	@ApiParam({ name: "id", type: Number })
	@ApiResponse({ status: HttpStatus.OK, type: UserAchievementsResponseDto })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async getUserAchievements(
		@Param("id", ParseIntPipe) targetId: number,
	): Promise<UserAchievementsResponseDto> {
		return this.achievementService.getUserAchievements(targetId);
	}
}
