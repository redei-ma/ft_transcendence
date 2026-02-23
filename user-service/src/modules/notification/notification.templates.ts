import { NotificationType } from "@prisma/client";

/**
 * Persistent notification types — saved to DB.
 * Must match the NotificationType enum in Prisma schema.
 */
export type PersistentNotificationType = NotificationType;

/**
 * Ephemeral notification types — WebSocket only, not saved to DB.
 */
export type EphemeralNotificationType = "NEW_MESSAGE";

/** All supported notification types. */
export type NotificationTemplateType =
	| PersistentNotificationType
	| EphemeralNotificationType;

/** Notification content returned by every template function. */
export interface NotificationContent {
	title: string;
	message: string;
}

/**
 * Map of template function signatures per notification type.
 * Each function takes the necessary arguments to generate the notification content.
 * This ensures type safety when calling the templates and centralizes the formatting logic.
 */

interface NotificationTemplateMap {
	FRIEND_REQ: (username: string) => NotificationContent;
	FRIEND_ACCEPTED: (username: string) => NotificationContent;
	GAME_INVITE: (username: string) => NotificationContent;
	ACHV_UNLOCKED: (achievementName: string) => NotificationContent;
	NEW_MESSAGE: (username: string) => NotificationContent;
}

/**
 * Dictionary of notification templates.
 *
 * @example
 * // Persistent
 * const { title, message } = NotificationTemplates.FRIEND_REQ("john_doe");
 *
 * // Ephemeral
 * const chat = NotificationTemplates.NEW_MESSAGE("jane_doe");
 * ```
 */
export const NotificationTemplates: NotificationTemplateMap = {
	// ─── Friendship (persistent) ──────────────────────────────────

	FRIEND_REQ: (username) => ({
		title: "Friend Request",
		message: `${username} sent you a friend request.`,
	}),

	FRIEND_ACCEPTED: (username) => ({
		title: "Friendship Accepted",
		message: `${username} accepted your friend request.`,
	}),

	// ─── Game Invites (persistent) ────────────────────────────────

	GAME_INVITE: (username) => ({
		title: "Game Challenge",
		message: `${username} invited you to play a match.`,
	}),

	// ─── Achievements (persistent) ────────────────────────────────

	ACHV_UNLOCKED: (achievementName) => ({
		title: "Achievement Unlocked!",
		message: `Congratulations! You've earned the "${achievementName}" achievement.`,
	}),

	// ─── Chat (ephemeral — WebSocket only, NOT saved to DB) ──────

	NEW_MESSAGE: (username) => ({
		title: "New Message",
		message: `You received a new message from ${username}.`,
	}),
};
