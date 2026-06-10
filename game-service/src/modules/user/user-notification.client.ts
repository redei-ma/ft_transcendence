import { Injectable, Logger } from "@nestjs/common";
import { NotificationType } from "@transcendence/types";
import { getInternalHeaders } from "@transcendence/auth";

/**
 * HTTP client for sending notifications to users via user-service internal API.
 * Calls POST /internal/users/:id/notifications.
 *
 * All methods are fire-and-forget safe: they catch and log errors internally
 * so callers can use Promise.allSettled without losing match processing on failure.
 */
@Injectable()
export class UserNotificationClient {
	private readonly logger = new Logger(UserNotificationClient.name);
	private readonly baseUrl = "http://user-service:3001";

	async sendNotification(
		userId: number,
		type: NotificationType,
		message: string,
	): Promise<void> {
		try {
			const response = await fetch(
				`${this.baseUrl}/internal/users/${userId}/notifications`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json", ...getInternalHeaders() },
					body: JSON.stringify({ type, message }),
				},
			);

			if (!response.ok) {
				this.logger.warn(
					`Failed to send notification to user ${userId}: HTTP ${response.status}`,
				);
			}
		} catch (error) {
			this.logger.error(
				`Error sending notification to user ${userId}:`,
				error,
			);
		}
	}
}
