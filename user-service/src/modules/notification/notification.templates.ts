/**
 * Ephemeral notification types — delivered via SSE only, never saved to DB.
 */
export type EphemeralNotificationType = "GAME_INVITE" | "GAME_INVITE_ACCEPTED" | "NEW_MESSAGE";

/** Notification content returned by every template function. */
export interface NotificationContent {
	title: string;
	message: string;
}

/**
 * Centralised notification message templates.
 * Persistent types (FRIEND_REQ, FRIEND_ACCEPTED, ACHV_UNLOCKED) are saved to DB.
 * Ephemeral types (GAME_INVITE, GAME_INVITE_ACCEPTED, NEW_MESSAGE) are delivered via SSE only.
 */
export const NotificationTemplates = {
	FRIEND_REQ: (username: string): NotificationContent => ({
		title: "Friend Request",
		message: `${username} sent you a friend request.`,
	}),

	FRIEND_ACCEPTED: (username: string): NotificationContent => ({
		title: "Friendship Accepted",
		message: `${username} accepted your friend request.`,
	}),

	GAME_INVITE: (username: string): NotificationContent => ({
		title: "Game Challenge",
		message: `${username} invited you to play a match.`,
	}),

	GAME_INVITE_ACCEPTED: (username: string): NotificationContent => ({
		title: "Challenge Accepted!",
		message: `${username} accepted your challenge! Get ready to play.`,
	}),

	NEW_MESSAGE: (username: string): NotificationContent => ({
		title: "New Message",
		message: `You received a new message from ${username}.`,
	}),
};
