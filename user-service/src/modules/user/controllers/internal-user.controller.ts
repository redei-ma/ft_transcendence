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
	ParseEnumPipe,
	HttpCode,
	HttpStatus,
} from "@nestjs/common";
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiParam,
	ApiQuery,
} from "@nestjs/swagger";
import { Provider } from "@transcendence/types";
import { UserService } from "../services/user.service";
import {
	CreateLocalUserDto,
	CreateOAuthUserDto,
	SetPasswordDto,
	UpdatePasswordDto,
	UpdateStatusDto,
	LinkOAuthDto,
	Setup2faDto,
	FindUserQueryDto,
	UserWithAccountsResponseDto,
	UserEloResponseDto,
	SuccessResponseDto,
	CreateNotificationDto,
} from "@transcendence/types";
import { NotificationService } from "../services/notification.service";

/**
 * Controller for internal user management endpoints.
 * These are intended for use by other backend services (e.g. auth-service) and are not exposed to the frontend.
 */
@ApiTags("Internal Users")
@Controller("internal/users")
export class InternalUserController {
	constructor(
		private readonly userService: UserService,
		private readonly notificationService: NotificationService,
	) {}

	// ─── Create user ───────────────────────────────────────────────────────────────────────────────

	/**
	 * Local user registration (email + password)
	 */
	@Post()
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({
		summary: "Create a new local user",
		description:
			"Registers a user with email + password. " +
			"Creates User, Account (provider LOCAL with passwordHash), and UserStats.",
	})
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: "User created successfully",
		type: UserWithAccountsResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: "Email or username already taken",
	})
	async createLocalUser(
		@Body() dto: CreateLocalUserDto,
	): Promise<UserWithAccountsResponseDto> {
		return this.userService.createLocalUser(dto);
	}

	/**
	 * OAuth user creation
	 */
	@Post("oauth")
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({
		summary: "Create an OAuth user",
		description:
			"Registers a user with via OAuth provider. " +
			"Creates User, Account (with oauthId and selected provider), and UserStats." +
			"If the email is already registered, use POST /users/link-oauth to link the provider to the existing account.",
	})
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: "User created successfully",
		type: UserWithAccountsResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: "User already exists with this email.",
	})
	async createOAuthUser(
		@Body() dto: CreateOAuthUserDto,
	): Promise<UserWithAccountsResponseDto> {
		return this.userService.createOAuthUser(dto);
	}

	// ─── Get user ──────────────────────────────────────────────────────────────────────────────────

	/**
	 * Find a user by ID, email, or username.
	 */
	@Get()
	@ApiOperation({ summary: "Find a user by ID, email, or username" })
	@ApiQuery({ name: "id", required: false, type: Number })
	@ApiQuery({ name: "email", required: false, type: String })
	@ApiQuery({ name: "username", required: false, type: String })
	@ApiResponse({
		status: HttpStatus.OK,
		description: "User found matching the provided criteria",
		type: UserWithAccountsResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "No search parameters provided",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User not found",
	})
	async findUser(
		@Query() query: FindUserQueryDto,
	): Promise<UserWithAccountsResponseDto> {
		return this.userService.findUser(query);
	}

	/**
	 * Returns only the current ELO of a user.
	 */
	@Get(":id/elo")
	@ApiOperation({ summary: "Get current ELO of a user (for matchmaking)" })
	@ApiParam({ name: "id", type: Number })
	@ApiResponse({
		status: HttpStatus.OK,
		description: "ELO rating of the user",
		type: UserEloResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User stats not found",
	})
	async getUserElo(
		@Param("id", ParseIntPipe) id: number,
	): Promise<UserEloResponseDto> {
		return this.userService.getUserElo(id);
	}

	/**
	 * Find a user by provider and oauthId
	 */
	@Get(":provider/:oauthId")
	@ApiOperation({ summary: "Find a user by provider and oauthId" })
	@ApiParam({ name: "provider", description: "OAuth provider" })
	@ApiParam({ name: "oauthId", description: "OAuth user ID" })
	@ApiResponse({
		status: HttpStatus.OK,
		description: "User found matching the provided criteria",
		type: UserWithAccountsResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "No search parameters provided",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User not found",
	})
	async findUserOauth(
		@Param("provider", new ParseEnumPipe(Provider)) provider: Provider,
		@Param("oauthId") oauthId: string,
	): Promise<UserWithAccountsResponseDto> {
		return this.userService.findUserOauth(provider, oauthId);
	}

	// ─── Update user ───────────────────────────────────────────────────────────────────────────────

	/**
	 * Set a password for an existing user without a LOCAL account.
	 */
	@Post(":id/password/set")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Create LOCAL account (for OAuth-only users)" })
	@ApiParam({ name: "id", type: Number })
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description: "Local account created",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User not found",
	})
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: "Local account already exists",
	})
	async setPassword(
		@Param("id", ParseIntPipe) id: number,
		@Body() dto: SetPasswordDto,
	): Promise<void> {
		return this.userService.setPassword(id, dto);
	}

	/**
	 * Change password for an existing LOCAL user.
	 */
	@Patch(":id/password/change")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Change password for an existing LOCAL user" })
	@ApiParam({ name: "id", type: Number })
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description: "Password changed",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User or LOCAL account not found",
	})
	async changePassword(
		@Param("id", ParseIntPipe) id: number,
		@Body() dto: UpdatePasswordDto,
	): Promise<void> {
		return this.userService.changePassword(id, dto);
	}

	/**
	 * Mark a user's email as verified.
	 */
	@Patch(":id/verify-email")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Mark email as verified" })
	@ApiParam({ name: "id", type: Number })
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description: "Email verified",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User not found",
	})
	async verifyEmail(@Param("id", ParseIntPipe) id: number): Promise<void> {
		return this.userService.verifyEmail(id);
	}

	/**
	 * Increment the token version, invalidating all existing JWTs.
	 */
	@Patch(":id/token-version")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Increment token version (invalidates JWTs)" })
	@ApiParam({ name: "id", type: Number })
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description: "Token version incremented",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User not found",
	})
	async incrementTokenVersion(
		@Param("id", ParseIntPipe) id: number,
	): Promise<void> {
		return this.userService.incrementTokenVersion(id);
	}

	/**
	 * Update user status (ONLINE/OFFLINE/IN_GAME).
	 */
	@Patch(":id/status")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Update user status (ONLINE/OFFLINE/IN_GAME)" })
	@ApiParam({ name: "id", type: Number })
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description: "Status updated",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User not found",
	})
	async updateStatus(
		@Param("id", ParseIntPipe) id: number,
		@Body() dto: UpdateStatusDto,
	): Promise<void> {
		return this.userService.updateStatus(id, dto);
	}

	// ─── OAuth ─────────────────────────────────────────────────────────────────────────────────────

	/**
	 * Link an OAuth provider to an existing user.
	 */
	@Post(":id/oauth/:provider")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Link OAuth account to existing user" })
	@ApiParam({ name: "id", type: Number })
	@ApiParam({
		name: "provider",
		enum: Provider,
		description: "Provider OAuth",
	})
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description: "Provider linked",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User not found",
	})
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: "Provider already linked",
	})
	async linkOAuth(
		@Param("id", ParseIntPipe) id: number,
		@Param("provider", new ParseEnumPipe(Provider)) provider: Provider,
		@Body() dto: LinkOAuthDto,
	): Promise<void> {
		return this.userService.linkOAuth(id, provider, dto);
	}

	/**
	 * Unlink an OAuth provider from a user.
	 */
	@Delete(":id/oauth/:provider")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Unlink OAuth account from user" })
	@ApiParam({ name: "id", type: Number })
	@ApiParam({ name: "provider", enum: Provider })
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description: "Provider unlinked",
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Last login method",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User or provider not found",
	})
	async unlinkOAuth(
		@Param("id", ParseIntPipe) id: number,
		@Param("provider", new ParseEnumPipe(Provider)) provider: Provider,
	): Promise<void> {
		return this.userService.unlinkOAuth(id, provider);
	}

	// ─── 2FA ─────────────────────────────────────────────────────────────────────────────────────

	/**
	 * Save TOTP secret for 2FA setup (step 1).
	 */
	@Patch(":id/2fa/setup")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Save TOTP secret (Step 1 setup 2FA)" })
	@ApiParam({ name: "id", type: Number })
	@ApiResponse({ status: HttpStatus.NO_CONTENT, description: "Secret saved" })
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User not found",
	})
	async setup2fa(
		@Param("id", ParseIntPipe) id: number,
		@Body() dto: Setup2faDto,
	): Promise<void> {
		return this.userService.setup2fa(id, dto);
	}

	/**
	 * Activate 2FA after verifying the TOTP code (step 2).
	 */
	@Patch(":id/2fa/enable")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({
		summary: "Activate 2FA (Step 2 after confirming TOTP code)",
	})
	@ApiParam({ name: "id", type: Number })
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description: "2FA activated",
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description:
			"TOTP secret not configured (run setup first) or invalid TOTP code",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User not found",
	})
	async enable2fa(@Param("id", ParseIntPipe) id: number): Promise<void> {
		return this.userService.enable2fa(id);
	}

	/**
	 * Disable 2FA and remove the TOTP secret.
	 */
	@Delete(":id/2fa/disable")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Disable 2FA and remove TOTP secret" })
	@ApiParam({ name: "id", type: Number })
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description: "2FA disabled",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User not found",
	})
	async disable2fa(@Param("id", ParseIntPipe) id: number): Promise<void> {
		return this.userService.disable2fa(id);
	}

	// ─── Notifications ────────────────────────────────────────────────────────

	/**
	 * Creates a notification for a user.
	 * Called by game-service after unlocking an achievement, or by friendship flows.
	 */
	@Post(":id/notifications")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Create a notification for a user (internal)" })
	@ApiParam({ name: "id", type: Number })
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description: "Notification created",
	})
	async createNotification(
		@Param("id", ParseIntPipe) id: number,
		@Body() dto: CreateNotificationDto,
	): Promise<void> {
		return this.notificationService.createNotification(id, dto);
	}
}
