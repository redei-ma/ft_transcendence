import {
	Injectable,
	ForbiddenException,
	NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
	NotificationsQueryDto,
	NotificationListResponseDto,
	CreateNotificationDto,
} from "@transcendence/types";

@Injectable()
export class NotificationService {
	constructor(private readonly prisma: PrismaService) {}

	// ─── Public API ────────────────────────────────────────────────────────────

	/**
	 * Returns a paginated list of notifications for the given user.
	 * Unread notifications are sorted first, then by creation date descending.
	 * The unreadCount reflects the total across all pages, not just the current one.
	 *
	 * @param userId - ID of the requesting user (from JWT).
	 * @param query - Pagination options and optional unread-only filter.
	 * @returns NotificationListResponseDto — paginated notifications with unread count.
	 */
	async getNotifications(
		userId: number,
		query: NotificationsQueryDto,
	): Promise<NotificationListResponseDto> {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const skip = (page - 1) * limit;

		const where = {
			userId,
			...(query.unreadOnly ? { isRead: false } : {}),
		};

		const [notifications, total, unreadCount] =
			await this.prisma.$transaction([
				this.prisma.notification.findMany({
					where,
					orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
					skip,
					take: limit,
					select: {
						id: true,
						type: true,
						message: true,
						isRead: true,
						createdAt: true,
					},
				}),
				this.prisma.notification.count({ where }),
				this.prisma.notification.count({
					where: { userId, isRead: false },
				}),
			]);

		return { notifications, total, unreadCount, page, limit };
	}

	/**
	 * Marks a single notification as read.
	 *
	 * @param userId - ID of the requesting user (from JWT).
	 * @param notificationId - ID of the notification to mark as read.
	 * @throws NotFoundException (404) — if the notification does not exist.
	 * @throws ForbiddenException (403) — if the notification belongs to another user.
	 */
	async markAsRead(userId: number, notificationId: number): Promise<void> {
		const notification = await this.prisma.notification.findUnique({
			where: { id: notificationId },
			select: { id: true, userId: true },
		});

		if (!notification)
			throw new NotFoundException("Notification not found");
		if (notification.userId !== userId) throw new ForbiddenException();

		await this.prisma.notification.update({
			where: { id: notificationId },
			data: { isRead: true },
		});
	}

	/**
	 * Marks all unread notifications of the given user as read.
	 *
	 * @param userId - ID of the requesting user (from JWT).
	 */
	async markAllAsRead(userId: number): Promise<void> {
		await this.prisma.notification.updateMany({
			where: { userId, isRead: false },
			data: { isRead: true },
		});
	}

	/**
	 * Permanently deletes a single notification.
	 *
	 * @param userId - ID of the requesting user (from JWT).
	 * @param notificationId - ID of the notification to delete.
	 * @throws NotFoundException (404) — if the notification does not exist.
	 * @throws ForbiddenException (403) — if the notification belongs to another user.
	 */
	async deleteNotification(
		userId: number,
		notificationId: number,
	): Promise<void> {
		const notification = await this.prisma.notification.findUnique({
			where: { id: notificationId },
			select: { id: true, userId: true },
		});

		if (!notification)
			throw new NotFoundException("Notification not found");
		if (notification.userId !== userId) throw new ForbiddenException();

		await this.prisma.notification.delete({
			where: { id: notificationId },
		});
	}

	// ─── Internal API ──────────────────────────────────────────────────────────

	/**
	 * Creates an in-app notification for the given user.
	 * Called internally by game-service or friendship flows via InternalUserController.
	 *
	 * @param userId - ID of the user to notify.
	 * @param dto - Notification type and message.
	 */
	async createNotification(
		userId: number,
		dto: CreateNotificationDto,
	): Promise<void> {
		await this.prisma.notification.create({
			data: { userId, type: dto.type, message: dto.message },
		});
	}
}
