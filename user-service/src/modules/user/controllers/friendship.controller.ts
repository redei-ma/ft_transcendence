import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Param,
	Body,
	ParseIntPipe,
	HttpCode,
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
import { FriendshipService } from "../services/friendship.service";
import {
	RespondFriendRequestDto,
	FriendResponseDto,
	FriendListResponseDto,
	FriendRequestsResponseDto,
	FriendshipStatusResponseDto,
} from "../dto";

@ApiTags("Friendships")
@Controller("api/users/me/friends")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendshipController {
	constructor(private readonly friendshipService: FriendshipService) {}

	// ─── Read ──────────────────────────────────────────────────────────────────

	@Get()
	@ApiOperation({ summary: "List accepted friends" })
	@ApiResponse({ status: HttpStatus.OK, type: FriendListResponseDto })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async getFriends(
		@CurrentUser("sub") userId: number,
	): Promise<FriendListResponseDto> {
		return this.friendshipService.getFriends(userId);
	}

	@Get("requests")
	@ApiOperation({ summary: "List pending friend requests (sent + received)" })
	@ApiResponse({ status: HttpStatus.OK, type: FriendRequestsResponseDto })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async getFriendRequests(
		@CurrentUser("sub") userId: number,
	): Promise<FriendRequestsResponseDto> {
		return this.friendshipService.getFriendRequests(userId);
	}

	@Get(":targetId/status")
	@ApiOperation({
		summary: "Get friendship status with a specific user",
		description:
			"Returns the current relationship state between the authenticated user and targetId. All fields are null if no relationship exists.",
	})
	@ApiParam({ name: "targetId", type: Number })
	@ApiResponse({
		status: HttpStatus.OK,
		type: FriendshipStatusResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Cannot check status with yourself",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User not found",
	})
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async getFriendshipStatus(
		@CurrentUser("sub") userId: number,
		@Param("targetId", ParseIntPipe) targetId: number,
	): Promise<FriendshipStatusResponseDto> {
		return this.friendshipService.getFriendshipStatus(userId, targetId);
	}

	// ─── Mutate ────────────────────────────────────────────────────────────────

	@Post(":targetId")
	@ApiOperation({ summary: "Send a friend request" })
	@ApiParam({ name: "targetId", type: Number })
	@ApiResponse({ status: HttpStatus.CREATED, type: FriendResponseDto })
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Cannot add yourself",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "User not found",
	})
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: "Already friends or request pending",
	})
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async sendFriendRequest(
		@CurrentUser("sub") userId: number,
		@Param("targetId", ParseIntPipe) targetId: number,
	): Promise<FriendResponseDto> {
		return this.friendshipService.sendFriendRequest(userId, targetId);
	}

	@Patch(":targetId/respond")
	@ApiOperation({ summary: "Accept or reject a received friend request" })
	@ApiParam({ name: "targetId", type: Number })
	@ApiResponse({ status: HttpStatus.OK, type: FriendResponseDto })
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "No pending request from this user",
	})
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async respondFriendRequest(
		@CurrentUser("sub") userId: number,
		@Param("targetId", ParseIntPipe) targetId: number,
		@Body() dto: RespondFriendRequestDto,
	): Promise<FriendResponseDto> {
		return this.friendshipService.respondFriendRequest(
			userId,
			targetId,
			dto,
		);
	}

	@Delete(":targetId")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Remove a friend or cancel a sent request" })
	@ApiParam({ name: "targetId", type: Number })
	@ApiResponse({ status: HttpStatus.NO_CONTENT })
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "No active friendship found",
	})
	@ApiResponse({
		status: HttpStatus.FORBIDDEN,
		description: "Cannot cancel a request you did not send",
	})
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async removeFriend(
		@CurrentUser("sub") userId: number,
		@Param("targetId", ParseIntPipe) targetId: number,
	): Promise<void> {
		return this.friendshipService.removeFriend(userId, targetId);
	}
}
