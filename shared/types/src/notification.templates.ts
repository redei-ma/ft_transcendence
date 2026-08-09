/** Notification content returned by every template function. */
export interface NotificationContent {
	title: string;
	message: string;
}

interface NotificationTemplateMap {
	FRIEND_REQ: (username: string) => NotificationContent;
	FRIEND_ACCEPTED: (username: string) => NotificationContent;
	GAME_INVITE: (username: string) => NotificationContent;
	ACHV_UNLOCKED: (achievementName: string) => NotificationContent;
}

/**
 * Notification message templates for all persistent notification types.
 * Used by any service that creates notifications via the internal user-service endpoint.
 *
 * @example
 * const { message } = NotificationTemplates.FRIEND_REQ("mario");
 */
export const NotificationTemplates: NotificationTemplateMap = {
	// ─── Friendship ───────────────────────────────────────────────

	FRIEND_REQ: (username) => ({
		title: "Friend Request",
		message: `${username} sent you a friend request.`,
	}),

	FRIEND_ACCEPTED: (username) => ({
		title: "Friendship Accepted",
		message: `${username} accepted your friend request.`,
	}),

	// ─── Game Invites ─────────────────────────────────────────────

	GAME_INVITE: (username) => ({
		title: "Game Challenge",
		message: `${username} invited you to play a match.`,
	}),

	// ─── Achievements ─────────────────────────────────────────────

	ACHV_UNLOCKED: (achievementName) => ({
		title: "Achievement Unlocked!",
		message: `Congratulations! You've earned the "${achievementName}" achievement.`,
	}),
};
