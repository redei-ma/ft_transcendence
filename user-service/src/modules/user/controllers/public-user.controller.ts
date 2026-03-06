import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Body,
	Param,
	Query,
	ParseIntPipe,
	HttpCode,
	HttpStatus,
	UseGuards,
	UseInterceptors,
	UploadedFile,
	BadRequestException,
} from "@nestjs/common";
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiParam,
	ApiBearerAuth,
	ApiConsumes,
	ApiBody,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard, CurrentUser } from "@transcendence/auth";
import { UserService } from "../services/user.service";
import {
	UpdateUsernameDto,
	UpdateEmailDto,
	CheckEmailQueryDto,
	CheckUsernameQueryDto,
	LeaderboardQueryDto,
	UserProfileResponseDto,
	UserStatsResponseDto,
	UserSettingsResponseDto,
	PublicProfileResponseDto,
	LeaderboardResponseDto,
	CheckAvailabilityResponseDto,
	MatchHistoryQueryDto,
	MatchHistoryResponseDto,
	UserAchievementsResponseDto,
} from "@transcendence/types";
import { MatchHistoryService } from "../services/match-history.service";
import { AchievementService } from "../services/achievement.service";

/**
 * Controller for public user endpoints.
 * These endpoints are exposed to the frontend and typically require JWT authentication.
 */
@ApiTags("Users")
@Controller("api/users")
export class PublicUserController {
	constructor(
		private readonly userService: UserService,
		private readonly matchHistoryService: MatchHistoryService,
		private readonly achievementService: AchievementService,
	) {}

	// ─── ─────────────────────────────────────────────────────────────────────────────
	/**
	 * Get player leaderboard ordered by ELO (descending).
	 */
	@Get("leaderboard")
	@ApiOperation({ summary: "Get ELO leaderboard" })
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Paginated leaderboard data",
		type: LeaderboardResponseDto,
	})
	async getLeaderboard(
		@Query() query: LeaderboardQueryDto,
	): Promise<LeaderboardResponseDto> {
		return this.userService.getLeaderboard(query);
	}
	// ─── ─────────────────────────────────────────────────────────────────────────────

	// ─── Useer profile ─────────────────────────────────────────────────────────────────────────────

	/**
	 * Retrieve the basic profile of the currently authenticated user.
	 */
	@Get("me")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Get current user profile" })
	@ApiResponse({
		status: HttpStatus.OK,
		description: "User profile retrieved successfully",
		type: UserProfileResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Missing or invalid JWT",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description:
			"User not found (e.g., account deleted but token still valid)",
	})
	async getMyProfile(
		@CurrentUser("sub") userId: number,
	): Promise<UserProfileResponseDto> {
		return this.userService.getMyProfile(userId);
	}

	/**
	 * Retrieve full statistics for the currently authenticated user.
	 */
	@Get("me/stats")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Get current user statistics" })
	@ApiResponse({
		status: HttpStatus.OK,
		description: "User statistics with character-specific details",
		type: UserStatsResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Missing or invalid JWT",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User or stats not found",
	})
	async getMyStats(
		@CurrentUser("sub") userId: number,
	): Promise<UserStatsResponseDto> {
		return this.userService.getMyStats(userId);
	}

	/**
	 * Retrieve security and privacy settings for the currently authenticated user.
	 */
	@Get("me/settings")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Get current user security settings" })
	@ApiResponse({
		status: HttpStatus.OK,
		description: "User security settings retrieved successfully",
		type: UserSettingsResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Missing or invalid JWT",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User not found",
	})
	async getMySettings(
		@CurrentUser("sub") userId: number,
	): Promise<UserSettingsResponseDto> {
		return this.userService.getMySettings(userId);
	}

	// ─── Update user ───────────────────────────────────────────────────────────────────────────────

	/**
	 * Update current user's username.
	 */
	@Patch("me/username")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Update current user username" })
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Profile updated successfully",
		type: UserProfileResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Missing or invalid JWT",
	})
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: "Username already in use",
	})
	async updateUsername(
		@CurrentUser("sub") userId: number,
		@Body() dto: UpdateUsernameDto,
	): Promise<UserProfileResponseDto> {
		return this.userService.updateUsername(userId, dto);
	}

	/**
	 * Update current user's email.
	 */
	@Patch("me/email")
	@HttpCode(HttpStatus.NO_CONTENT)
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Update email (requires re-verification)" })
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description:
			"Email updated. Verification reset and OAuth providers unlinked.",
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description:
			"No LOCAL account found (needed to prevent account lockout)",
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Missing or invalid JWT",
	})
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: "Email already in use",
	})
	async updateEmail(
		@CurrentUser("sub") userId: number,
		@Body() dto: UpdateEmailDto,
	): Promise<void> {
		return this.userService.updateEmail(userId, dto);
	}

	/**
	 * Upload a custom avatar image.
	 */
	@Post("me/avatar")
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@Throttle({ global: { limit: 5, ttl: 60_000 } })
	@ApiOperation({
		summary: "Upload a custom avatar image (max 5MB, jpeg/png/gif/webp)",
	})
	@ApiConsumes("multipart/form-data")
	@ApiBody({
		schema: {
			type: "object",
			properties: {
				avatar: { type: "string", format: "binary" },
			},
		},
	})
	@ApiResponse({ status: HttpStatus.OK, type: UserProfileResponseDto })
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "No file, invalid type, or not a real image",
	})
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	@UseInterceptors(
		FileInterceptor("avatar", {
			storage: memoryStorage(),
			limits: { fileSize: 5 * 1024 * 1024 },
			fileFilter: (
				_req: Express.Request,
				file: Express.Multer.File,
				callback: (error: Error | null, acceptFile: boolean) => void,
			) => {
				const allowed = [
					"image/jpeg",
					"image/png",
					"image/gif",
					"image/webp",
				];
				if (allowed.includes(file.mimetype)) {
					callback(null, true);
				} else {
					callback(
						new BadRequestException(
							"Only image files are allowed (jpeg, png, gif, webp)",
						),
						false,
					);
				}
			},
		}),
	)
	async uploadAvatar(
		@CurrentUser("sub") userId: number,
		@UploadedFile() file: Express.Multer.File | undefined,
	): Promise<UserProfileResponseDto> {
		if (!file) {
			throw new BadRequestException("Avatar file is required");
		}
		return this.userService.uploadAvatar(userId, file.buffer);
	}

	/**
	 * Reset avatar to default.
	 */
	@Delete("me/avatar")
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Reset avatar to default DiceBear" })
	@ApiResponse({ status: HttpStatus.OK, type: UserProfileResponseDto })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async resetAvatar(
		@CurrentUser("sub") userId: number,
	): Promise<UserProfileResponseDto> {
		return this.userService.resetAvatar(userId);
	}

	// ─── Delete account ────────────────────────────────────────────────────────

	/**
	 * Permanently delete the current user's account and all associated data.
	 */
	@Delete("me")
	@HttpCode(HttpStatus.NO_CONTENT)
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Delete account permanently" })
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description: "Account and all associated data deleted successfully",
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Missing or invalid JWT",
	})
	async deleteMyAccount(@CurrentUser("sub") userId: number): Promise<void> {
		return this.userService.deleteUser(userId);
	}

	// ─── Check availability ────────────────────────────────────────────────────────────────────────

	/**
	 * Check if an email is already registered.
	 */
	@Get("check/email")
	@ApiOperation({ summary: "Check email availability" })
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Returns exists:true if taken, exists:false if available",
		type: CheckAvailabilityResponseDto,
	})
	async checkEmail(
		@Query() query: CheckEmailQueryDto,
	): Promise<CheckAvailabilityResponseDto> {
		return this.userService.checkEmail(query.email);
	}

	/**
	 * Check if a username is already taken.
	 */
	@Get("check/username")
	@ApiOperation({ summary: "Check username availability" })
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Returns exists:true if taken, exists:false if available",
		type: CheckAvailabilityResponseDto,
	})
	async checkUsername(
		@Query() query: CheckUsernameQueryDto,
	): Promise<CheckAvailabilityResponseDto> {
		return this.userService.checkUsername(query.username);
	}

	// ─── Public data ───────────────────────────────────────────────────────────────────────────────

	/**
	 * View a specific player's public profile and stats.
	 */
	@Get(":id")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Get public profile of a player" })
	@ApiParam({
		name: "id",
		type: Number,
		description: "The player's unique ID",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Public profile and statistics retrieved successfully",
		type: PublicProfileResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Missing or invalid JWT",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "Player not found",
	})
	async getPublicProfile(
		@Param("id", ParseIntPipe) id: number,
	): Promise<PublicProfileResponseDto> {
		return this.userService.getPublicProfile(id);
	}

	// ─── Match history ─────────────────────────────────────────────────────────

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

	// ─── Achievements ──────────────────────────────────────────────────────────

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
