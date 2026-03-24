import { Injectable, Logger } from "@nestjs/common";
import { NotificationType } from "@transcendence/types";

@Injectable()
export class UserNotificationClient {
	private readonly logger = new Logger(UserNotificationClient.name);
	private readonly baseUrl = "http://user-service:3001";

	async createNotification(
		userId: number,
		type: NotificationType,
		message: string,
	): Promise<void> {
		const url = `${this.baseUrl}/internal/users/${userId}/notifications`;
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ type, message }),
		});

		if (!response.ok) {
			this.logger.error(
				`Failed to send notification to user ${userId}: ${response.status}`,
			);
		}
	}
}
