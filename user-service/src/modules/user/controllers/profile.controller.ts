import {
	Controller,
	Get,
	Patch,
	Delete,
	Body,
	Param,
	Query,
	HttpCode,
	HttpStatus,
	UseGuards,
} from "@nestjs/common";
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiParam,
	ApiQuery,
	ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard, CurrentUser } from "@transcendence/auth";
import { ProfileService } from "../services/profile.service";
import {
	UpdateUsernameDto,
	CheckEmailQueryDto,
	CheckUsernameQueryDto,
	LeaderboardQueryDto,
	UserProfileResponseDto,
	UserStatsResponseDto,
	UserSettingsResponseDto,
	PublicProfileResponseDto,
	LeaderboardResponseDto,
	CheckAvailabilityResponseDto,
	EloPreviewQueryDto,
	EloPreviewResponseDto,
	ProfileQueryDto,
	FriendUserDto,
} from "../dto";

/**
 * Controller for public user endpoints.
 * These endpoints are exposed to the frontend and typically require JWT authentication.
 */
@ApiTags("Users")
@Controller("api/users")
export class ProfileController {
	constructor(private readonly profileService: ProfileService) {}

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
		return this.profileService.getLeaderboard(query);
	}
	// ─── ─────────────────────────────────────────────────────────────────────────────

	// ─── User profile ─────────────────────────────────────────────────────────────────────────────

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
		return this.profileService.getMyProfile(userId);
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
		return this.profileService.getMyStats(userId);
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
		return this.profileService.getMySettings(userId);
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
		return this.profileService.updateUsername(userId, dto);
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
		return this.profileService.deleteUser(userId);
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
		return this.profileService.checkEmail(query.email);
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
		return this.profileService.checkUsername(query.username);
	}

	// ─── ELO preview ──────────────────────────────────────────────────────────

	/**
	 * Returns ELO of two players and the three possible point deltas (win/draw/loss).
	 */
	@Get("elo-preview")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({
		summary: "Get ELO preview for two players",
		description:
			"Returns current ELO of both players and the expected point deltas for each possible outcome (win/draw/loss).",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		type: EloPreviewResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "Player not found",
	})
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async getEloPreview(
		@Query() query: EloPreviewQueryDto,
	): Promise<EloPreviewResponseDto> {
		return this.profileService.getEloPreview(query);
	}

	// ─── Public data ───────────────────────────────────────────────────────────────────────────────

	/**
	 * View a specific player's full public profile and stats.
	 * Exactly one of id or username must be provided as a query parameter.
	 */
	@Get("profile")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Get full public profile of a player by ID or username" })
	@ApiQuery({ name: "id", required: false, type: Number, description: "Player ID" })
	@ApiQuery({ name: "username", required: false, type: String, description: "Player username" })
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Public profile and statistics retrieved successfully",
		type: PublicProfileResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Neither id nor username provided",
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
		@Query() query: ProfileQueryDto,
	): Promise<PublicProfileResponseDto> {
		return this.profileService.getPublicProfile(query);
	}

	/**
	 * Search for a player by exact username.
	 * Returns only the minimal public data needed for friend operations.
	 */
	@Get("search/:username")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Search a player by exact username" })
	@ApiParam({ name: "username", type: String, description: "Exact username to look up" })
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Player found",
		type: FriendUserDto,
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Missing or invalid JWT",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "Player not found",
	})
	async searchByUsername(
		@Param("username") username: string,
	): Promise<FriendUserDto> {
		return this.profileService.searchByUsername(username);
	}
}
