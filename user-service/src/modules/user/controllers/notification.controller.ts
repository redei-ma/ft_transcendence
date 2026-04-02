import {
	Controller,
	Get,
	Patch,
	Delete,
	Param,
	Query,
	Req,
	Sse,
	ParseIntPipe,
	HttpCode,
	HttpStatus,
	UseGuards,
	MessageEvent,
} from "@nestjs/common";
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiParam,
	ApiBearerAuth,
} from "@nestjs/swagger";
import { Request } from "express";
import { Observable } from "rxjs";
import { JwtAuthGuard, CurrentUser } from "@transcendence/auth";
import { NotificationService } from "../services/notification.service";
import { SseService } from "../services/sse.service";
import {
	NotificationsQueryDto,
	NotificationListResponseDto,
} from "../dto";

@ApiTags("Notifications")
@Controller("api/users/me/notifications")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
	constructor(
		private readonly notificationService: NotificationService,
		private readonly sseService: SseService,
	) {}

	@Sse("stream")
	@ApiOperation({
		summary: "SSE stream for real-time notifications and friend presence",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description:
			"text/event-stream — emits `notification` and `friend_status` events",
	})
	stream(
		@CurrentUser("sub") userId: number,
		@Req() req: Request,
	): Observable<MessageEvent> {
		const { stream, key } = this.sseService.register(userId);
		req.on("close", () => this.sseService.unregister(key));
		return stream;
	}

	@Get()
	@ApiOperation({ summary: "Get paginated notifications (unread first)" })
	@ApiResponse({ status: HttpStatus.OK, type: NotificationListResponseDto })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async getNotifications(
		@CurrentUser("sub") userId: number,
		@Query() query: NotificationsQueryDto,
	): Promise<NotificationListResponseDto> {
		return this.notificationService.getNotifications(userId, query);
	}

	// NOTE: read-all MUST be declared before :id/read to avoid routing ambiguity
	@Patch("read-all")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Mark all notifications as read" })
	@ApiResponse({ status: HttpStatus.NO_CONTENT })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async markAllAsRead(@CurrentUser("sub") userId: number): Promise<void> {
		return this.notificationService.markAllAsRead(userId);
	}

	@Patch(":id/read")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Mark a single notification as read" })
	@ApiParam({ name: "id", type: Number })
	@ApiResponse({ status: HttpStatus.NO_CONTENT })
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	@ApiResponse({ status: HttpStatus.FORBIDDEN })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async markAsRead(
		@CurrentUser("sub") userId: number,
		@Param("id", ParseIntPipe) notificationId: number,
	): Promise<void> {
		return this.notificationService.markAsRead(userId, notificationId);
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: "Delete a notification" })
	@ApiParam({ name: "id", type: Number })
	@ApiResponse({ status: HttpStatus.NO_CONTENT })
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	@ApiResponse({ status: HttpStatus.FORBIDDEN })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED })
	async deleteNotification(
		@CurrentUser("sub") userId: number,
		@Param("id", ParseIntPipe) notificationId: number,
	): Promise<void> {
		return this.notificationService.deleteNotification(
			userId,
			notificationId,
		);
	}
}
