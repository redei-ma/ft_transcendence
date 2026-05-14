import { Injectable, Logger, MessageEvent } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Observable, Subject } from "rxjs";
import { PrismaService } from "../../prisma/prisma.service";
import {
	FriendshipStatus,
	UserStatus,
	NotificationType,
} from "@transcendence/types";

/** Payload sent over SSE for a new notification. */
interface NotificationSseData {
	id: number;
	type: NotificationType;
	message: string;
	isRead: boolean;
	createdAt: Date;
}

/** Payload sent over SSE when a friend changes online status. */
interface FriendStatusSseData {
	userId: number;
	status: UserStatus;
}

/** Payload sent over SSE when a game invite is received. */
export interface GameInviteSseData {
	id: number;
	expiresAt: Date;
	sender: { id: number; username: string; avatarUrl: string | null };
}

/** Internal record for one active SSE connection. */
interface SseConnection {
	userId: number;
	subject: Subject<MessageEvent>;
}

/**
 * Manages all active SSE connections and pushes real-time events to clients.
 *
 * Status transitions (ONLINE/OFFLINE) are delegated via events:
 * - `user.connected`    — emitted when the first SSE connection for a user opens.
 * - `user.disconnected` — emitted after an 8-second grace period when no connections remain.
 *
 * InternalUserService listens to these events and is the single source of truth
 * for DB status writes + SSE friend notifications.
 */
@Injectable()
export class SseService {
	private readonly logger = new Logger(SseService.name);
	private readonly connections = new Map<symbol, SseConnection>();

	constructor(
		private readonly prisma: PrismaService,
		private readonly eventEmitter: EventEmitter2,
	) {}

	// ─── Connection lifecycle ──────────────────────────────────────────────────

	/**
	 * Registers a new SSE connection for the given user.
	 * Emits `user.connected` on the first connection.
	 */
	register(userId: number): { stream: Observable<MessageEvent>; key: symbol } {
		const isFirst = !this.hasConnections(userId);
		const key = Symbol(`sse:${userId}`);
		const subject = new Subject<MessageEvent>();
		this.connections.set(key, { userId, subject });
		this.logger.log(`SSE connected: userId=${userId}`);

		if (isFirst) {
			this.eventEmitter.emit("user.connected", userId);
		}

		return { stream: subject.asObservable(), key };
	}

	/**
	 * Unregisters an SSE connection identified by its key.
	 * After an 8-second grace period, emits `user.disconnected` if no connections remain.
	 */
	unregister(key: symbol): void {
		const conn = this.connections.get(key);
		if (!conn) return;

		conn.subject.complete();
		this.connections.delete(key);
		this.logger.log(`SSE disconnected: userId=${conn.userId}`);

		if (!this.hasConnections(conn.userId)) {
			setTimeout(() => {
				if (!this.hasConnections(conn.userId)) {
					this.eventEmitter.emit("user.disconnected", conn.userId);
				}
			}, 8_000);
		}
	}

	/**
	 * Closes all active SSE connections for the given user and removes them.
	 * Used when an account is deleted to immediately terminate the stream.
	 */
	closeUserConnections(userId: number): void {
		for (const [key, conn] of this.connections.entries()) {
			if (conn.userId === userId) {
				conn.subject.complete();
				this.connections.delete(key);
			}
		}
		this.logger.log(`Closed all SSE connections for userId=${userId}`);
	}

	// ─── Push helpers ──────────────────────────────────────────────────────────

	/**
	 * Pushes a `notification` SSE event to all active connections of the given user.
	 */
	pushNotification(userId: number, data: NotificationSseData): void {
		this.logger.log(`Pushing notification SSE to userId=${userId}`);
		this.pushToUser(userId, { type: "notification", data });
	}

	/**
	 * Pushes a `game_invite` SSE event to the invite receiver.
	 */
	pushGameInvite(receiverId: number, data: GameInviteSseData): void {
		this.logger.log(`Pushing game_invite SSE to userId=${receiverId}`);
		this.pushToUser(receiverId, { type: "game_invite", data });
	}

	/**
	 * Pushes a `friend_status` SSE event to all online friends of the given user.
	 * Called by InternalUserService after every status change.
	 */
	async notifyStatusChange(
		userId: number,
		status: UserStatus,
	): Promise<void> {
		await this.pushStatusToFriends(userId, status);
	}

	// ─── Private helpers ───────────────────────────────────────────────────────

	private pushToUser(userId: number, event: MessageEvent): void {
		let sent = 0;
		for (const conn of this.connections.values()) {
			if (conn.userId === userId) {
				conn.subject.next(event);
				sent++;
			}
		}
		this.logger.log(`pushToUser userId=${userId} type=${event.type} connections=${sent}`);
	}

	private hasConnections(userId: number): boolean {
		for (const conn of this.connections.values()) {
			if (conn.userId === userId) return true;
		}
		return false;
	}

	private async pushStatusToFriends(
		userId: number,
		status: UserStatus,
	): Promise<void> {
		const friendships = await this.prisma.friendship.findMany({
			where: {
				status: FriendshipStatus.ACCEPTED,
				OR: [{ senderId: userId }, { receiverId: userId }],
			},
			select: { senderId: true, receiverId: true },
		});

		const payload: FriendStatusSseData = { userId, status };

		for (const f of friendships) {
			const friendId =
				f.senderId === userId ? f.receiverId : f.senderId;
			this.pushToUser(friendId, { type: "friend_status", data: payload });
		}
	}
}
