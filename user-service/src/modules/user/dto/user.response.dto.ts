import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
	UserStatus,
	Provider,
	CharacterName,
	AchievementType,
	MatchMode,
	MatchType,
	EndReason,
	FriendshipStatus,
	InviteStatus,
	NotificationType,
} from "@transcendence/types";

type MatchResult = "WIN" | "LOSS" | "DRAW";

/**
 * Base profile of the authenticated user.
 * Does not include: stats, sensitive security fields.
 */
export class UserProfileResponseDto {
	@ApiProperty({ description: "Unique user identifier", example: 1 })
	id: number;

	@ApiProperty({
		description: "Primary email address",
		example: "john@example.com",
	})
	email: string;

	@ApiProperty({ description: "Unique username", example: "john_doe" })
	username: string;

	@ApiProperty({
		description: "Avatar URL (DiceBear default or custom upload)",
		example: "https://api.dicebear.com/9.x/pixel-art/svg?seed=john_doe",
	})
	avatarUrl: string;

	@ApiProperty({
		description: "Current online status",
		enum: UserStatus,
		example: "ONLINE",
	})
	status: UserStatus;

	@ApiProperty({ description: "Privacy policy acceptance timestamp, null if not yet accepted", nullable: true })
	privacyPolicyAcceptedAt: Date | null;

	@ApiProperty({ description: "Account registration timestamp" })
	createdAt: Date;
}

/**
 * Security settings and linked authentication providers of the authenticated user.
 */
export class UserSettingsResponseDto {
	@ApiProperty({
		description: "Primary email address",
		example: "john@example.com",
	})
	email: string;

	@ApiProperty({
		description: "Whether the email address has been verified",
		example: true,
	})
	isEmailVerified: boolean;

	@ApiProperty({
		description: "Whether Two-Factor Authentication is currently enabled",
		example: false,
	})
	is2faEnabled: boolean;

	@ApiProperty({
		description:
			"Whether the user has a LOCAL account (email + password). " +
			"False means the user can only authenticate via OAuth.",
		example: true,
	})
	hasLocalAccount: boolean;

	@ApiProperty({
		description:
			"List of linked OAuth providers. Empty array if none connected.",
		enum: Provider,
		isArray: true,
		example: ["GOOGLE"],
	})
	linkedProviders: Provider[];
}

/**
 * Per-character stats breakdown.
 */
export class CharacterStatsResponseDto {
	@ApiProperty({
		description: "Playable character name",
		enum: CharacterName,
		example: "ZEUS",
	})
	characterName: CharacterName;

	@ApiProperty({ description: "Total wins with this character", example: 42 })
	wins: number;

	@ApiProperty({
		description: "Total losses with this character",
		example: 18,
	})
	losses: number;

	@ApiProperty({ description: "Total draws with this character", example: 5 })
	draws: number;

	@ApiProperty({
		description: "Total kills with this character",
		example: 130,
	})
	kills: number;

	@ApiProperty({
		description: "Total deaths with this character",
		example: 85,
	})
	deaths: number;
}

/**
 * Full statistics of the authenticated user.
 */
export class UserStatsResponseDto {
	@ApiProperty({ description: "Current ELO rating", example: 1250 })
	eloCurrent: number;

	@ApiProperty({ description: "All-time peak ELO rating", example: 1400 })
	eloPeak: number;

	@ApiProperty({ description: "Total wins across all matches", example: 85 })
	totalWins: number;

	@ApiProperty({
		description: "Total losses across all matches",
		example: 40,
	})
	totalLosses: number;

	@ApiProperty({ description: "Total draws across all matches", example: 10 })
	totalDraws: number;

	@ApiProperty({ description: "Current consecutive win streak", example: 5 })
	currentWinStreak: number;

	@ApiProperty({ description: "All-time best win streak", example: 12 })
	bestWinStreak: number;

	@ApiProperty({ description: "Current consecutive loss streak", example: 0 })
	currentLoseStreak: number;

	@ApiProperty({
		description: "Total kills across all matches",
		example: 340,
	})
	totalKills: number;

	@ApiProperty({
		description: "Total deaths across all matches",
		example: 210,
	})
	totalDeaths: number;

	@ApiProperty({
		description: "Per-character breakdown of stats",
		type: [CharacterStatsResponseDto],
	})
	characterStats: CharacterStatsResponseDto[];
}

/**
 * Public profile of another player.
 * Does not include any sensitive field.
 */
export class PublicProfileResponseDto {
	@ApiProperty({ description: "Unique player identifier", example: 42 })
	id: number;

	@ApiProperty({ description: "Player username", example: "pro_gamer" })
	username: string;

	@ApiProperty({
		description: "Player avatar URL",
		example: "https://api.dicebear.com/9.x/pixel-art/svg?seed=pro_gamer",
	})
	avatarUrl: string;

	@ApiProperty({
		description: "Current online status",
		enum: UserStatus,
		example: "ONLINE",
	})
	status: UserStatus;

	@ApiProperty({ description: "Account registration timestamp" })
	createdAt: Date;

	@ApiProperty({
		description:
			"Player stats. Null if the player has not played any match yet.",
		type: UserStatsResponseDto,
		nullable: true,
	})
	stats: UserStatsResponseDto | null;
}

/**
 * A single unlocked achievement with unlock timestamp.
 */
export class AchievementResponseDto {
	@ApiProperty({ example: "Flawless Victory" })
	name: string;

	@ApiProperty({ example: "Win a match without dying." })
	description: string;

	@ApiProperty({ example: "/icons/flawless.png" })
	iconPath: string;

	@ApiProperty({ enum: AchievementType, example: "SILVER" })
	tier: AchievementType;

	@ApiProperty()
	unlockedAt: Date;
}

/**
 * A user's full achievement collection.
 */
export class UserAchievementsResponseDto {
	@ApiProperty({ type: [AchievementResponseDto] })
	unlocked: AchievementResponseDto[];

	@ApiProperty({ example: 4 })
	unlockedCount: number;

	@ApiProperty({
		description: "Total achievements available in the game",
		example: 12,
	})
	totalCount: number;
}

/**
 * ELO rating of a user.
 */
export class UserEloResponseDto {
	@ApiProperty({
		description: "Current ELO rating of the user",
		example: 750,
	})
	eloCurrent: number;
}

// ─── MATCH HISTORY ──────────────────────────────────────────────────────────

/**
 * Single participant snapshot inside a match history entry.
 */
export class MatchParticipantSummaryDto {
	@ApiProperty({
		description: "User ID, null if the account was deleted",
		nullable: true,
		example: 7,
	})
	userId: number | null;

	@ApiProperty({
		description: "Username, null if account deleted",
		nullable: true,
		example: "pro_gamer",
	})
	username: string | null;

	@ApiProperty({
		description: "Avatar URL, null if account deleted",
		nullable: true,
		example: "https://...",
	})
	avatarUrl: string | null;

	@ApiProperty({
		description: "Team the participant belonged to",
		example: 1,
	})
	teamId: number;

	@ApiProperty({ enum: CharacterName, example: "ZEUS" })
	characterName: CharacterName;

	@ApiProperty({ example: 5 })
	kills: number;

	@ApiProperty({ example: 2 })
	deaths: number;
}

/**
 * Single match in a user's history, with result from that user's perspective.
 */
export class MatchHistoryEntryDto {
	@ApiProperty({ example: 101 })
	matchId: number;

	@ApiProperty()
	playedAt: Date;

	@ApiProperty({ enum: MatchMode, example: "RANKED" })
	mode: MatchMode;

	@ApiProperty({ enum: MatchType, example: "FFA" })
	type: MatchType;

	@ApiProperty({ description: "Match duration in seconds", example: 180 })
	durationSeconds: number;

	@ApiProperty({ enum: EndReason, nullable: true, example: "KILLOUT" })
	endReason: EndReason | null;

	@ApiProperty({
		enum: ["WIN", "LOSS", "DRAW"],
		description: "Result from the requesting user's perspective",
		example: "WIN",
	})
	result: MatchResult;

	@ApiProperty({ type: [MatchParticipantSummaryDto] })
	participants: MatchParticipantSummaryDto[];
}

/**
 * Paginated match history.
 */
export class MatchHistoryResponseDto {
	@ApiProperty({ type: [MatchHistoryEntryDto] })
	entries: MatchHistoryEntryDto[];

	@ApiProperty({ example: 150 })
	total: number;

	@ApiProperty({ example: 1 })
	page: number;

	@ApiProperty({ example: 20 })
	limit: number;
}

// ─── FRIENDSHIP ─────────────────────────────────────────────────────────────

/**
 * Minimal user info used inside friendship and invite responses.
 */
export class FriendUserDto {
	@ApiProperty({ example: 7 })
	id: number;

	@ApiProperty({ example: "pro_gamer" })
	username: string;

	@ApiProperty({
		example: "https://api.dicebear.com/9.x/pixel-art/svg?seed=pro_gamer",
	})
	avatarUrl: string;

	@ApiProperty({ enum: UserStatus, example: "ONLINE" })
	status: UserStatus;
}

/**
 * Single friendship record with direction indicator.
 */
export class FriendResponseDto {
	@ApiProperty({ description: "Friendship record ID", example: 42 })
	id: number;

	@ApiProperty({
		description: "The other user in this friendship",
		type: FriendUserDto,
	})
	friend: FriendUserDto;

	@ApiProperty({ enum: FriendshipStatus, example: "ACCEPTED" })
	status: FriendshipStatus;

	@ApiProperty({
		description:
			"SENT = current user sent the request; RECEIVED = current user received it",
		enum: ["SENT", "RECEIVED"],
		example: "SENT",
	})
	direction: "SENT" | "RECEIVED";

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;
}

/**
 * List of accepted friends.
 */
export class FriendListResponseDto {
	@ApiProperty({ type: [FriendResponseDto] })
	friends: FriendResponseDto[];

	@ApiProperty({ example: 12 })
	total: number;
}

/**
 * Pending friend requests split by direction.
 */
export class FriendRequestsResponseDto {
	@ApiProperty({
		type: [FriendResponseDto],
		description: "Requests sent by the current user",
	})
	sent: FriendResponseDto[];

	@ApiProperty({
		type: [FriendResponseDto],
		description: "Requests received by the current user",
	})
	received: FriendResponseDto[];
}

/**
 * Friendship status between the current user and another player.
 * All fields are null when no relationship exists.
 */
export class FriendshipStatusResponseDto {
	@ApiProperty({
		description: "Friendship record ID. Null if no relationship exists.",
		example: 42,
		nullable: true,
	})
	friendshipId: number | null;

	@ApiProperty({
		enum: FriendshipStatus,
		example: "PENDING",
		nullable: true,
		description: "Current status of the relationship. Null if none.",
	})
	status: FriendshipStatus | null;

	@ApiProperty({
		description:
			"SENT = current user sent the request; RECEIVED = current user received it. Null if no relationship.",
		enum: ["SENT", "RECEIVED"],
		nullable: true,
		example: "SENT",
	})
	direction: "SENT" | "RECEIVED" | null;
}

// ─── GAME INVITE ─────────────────────────────────────────────────────────────

/**
 * Single game invite record.
 */
export class GameInviteResponseDto {
	@ApiProperty({ example: 55 })
	id: number;

	@ApiProperty({ type: FriendUserDto })
	sender: FriendUserDto;

	@ApiProperty({ type: FriendUserDto })
	receiver: FriendUserDto;

	@ApiProperty({ enum: InviteStatus, example: "PENDING" })
	status: InviteStatus;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	expiresAt: Date;
}

/**
 * List of game invites.
 */
export class GameInviteListResponseDto {
	@ApiProperty({ type: [GameInviteResponseDto] })
	invites: GameInviteResponseDto[];

	@ApiProperty({ example: 3 })
	total: number;
}

// ─── NOTIFICATION ────────────────────────────────────────────────────────────

/**
 * Single in-app notification.
 */
export class NotificationResponseDto {
	@ApiProperty({ example: 1 })
	id: number;

	@ApiProperty({ enum: NotificationType, example: "FRIEND_REQ" })
	type: NotificationType;

	@ApiProperty({ example: "pro_gamer sent you a friend request." })
	message: string;

	@ApiProperty({ example: false })
	isRead: boolean;

	@ApiProperty()
	createdAt: Date;
}

/**
 * Paginated notification list with unread count.
 */
export class NotificationListResponseDto {
	@ApiProperty({ type: [NotificationResponseDto] })
	notifications: NotificationResponseDto[];

	@ApiProperty({ example: 50 })
	total: number;

	@ApiProperty({
		example: 3,
		description: "Unread count across ALL pages, not just current",
	})
	unreadCount: number;

	@ApiProperty({ example: 1 })
	page: number;

	@ApiProperty({ example: 20 })
	limit: number;
}
