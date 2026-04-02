import { Injectable, Logger, MessageEvent } from "@nestjs/common";
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
}

/** Payload sent over SSE when a friend changes online status. */
interface FriendStatusSseData {
	userId: number;
	status: UserStatus;
}

/** Internal record for one active SSE connection. */
interface SseConnection {
	userId: number;
	subject: Subject<MessageEvent>;
}

/**
 * Manages all active SSE connections and pushes real-time events to clients.
 *
 * Two event types are sent over the stream:
 * - `notification` — a new persistent notification was created for this user.
 * - `friend_status` — a friend came online, went offline, or changed presence state.
 *
 * Supports multiple concurrent connections per user (multiple browser tabs).
 * A grace period of 8 seconds applies on disconnect before marking the user OFFLINE,
 * so brief navigation or reconnects do not cause false offline flashes.
 */
@Injectable()
export class SseService {
	private readonly logger = new Logger(SseService.name);
	private readonly connections = new Map<symbol, SseConnection>();

	constructor(private readonly prisma: PrismaService) {}

	// ─── Connection lifecycle ──────────────────────────────────────────────────

	/**
	 * Registers a new SSE connection for the given user.
	 * Returns the stream Observable and an opaque key used to unregister later.
	 */
	register(userId: number): { stream: Observable<MessageEvent>; key: symbol } {
		const key = Symbol(`sse:${userId}`);
		const subject = new Subject<MessageEvent>();
		this.connections.set(key, { userId, subject });
		this.logger.log(`SSE connected: userId=${userId}`);
		return { stream: subject.asObservable(), key };
	}

	/**
	 * Unregisters an SSE connection identified by its key.
	 * Starts an 8-second grace period: if the user has no remaining connections
	 * after the period and their status is still ONLINE, marks them OFFLINE
	 * and notifies their friends.
	 */
	unregister(key: symbol): void {
		const conn = this.connections.get(key);
		if (!conn) return;

		conn.subject.complete();
		this.connections.delete(key);
		this.logger.log(`SSE disconnected: userId=${conn.userId}`);

		if (!this.hasConnections(conn.userId)) {
			setTimeout(
				() => void this.handleOffline(conn.userId),
				8_000,
			);
		}
	}

	// ─── Push helpers ──────────────────────────────────────────────────────────

	/**
	 * Pushes a `notification` SSE event to all active connections of the given user.
	 * No-op if the user is not connected.
	 */
	pushNotification(userId: number, data: NotificationSseData): void {
		this.pushToUser(userId, { type: "notification", data });
	}

	/**
	 * Pushes a `friend_status` SSE event to all online friends of the given user.
	 * Called after any status change (login, logout, in-game, etc.).
	 */
	async notifyStatusChange(
		userId: number,
		status: UserStatus,
	): Promise<void> {
		await this.pushStatusToFriends(userId, status);
	}

	// ─── Private helpers ───────────────────────────────────────────────────────

	private pushToUser(userId: number, event: MessageEvent): void {
		for (const conn of this.connections.values()) {
			if (conn.userId === userId) {
				conn.subject.next(event);
			}
		}
	}

	private hasConnections(userId: number): boolean {
		for (const conn of this.connections.values()) {
			if (conn.userId === userId) return true;
		}
		return false;
	}

	/**
	 * Grace-period handler: sets the user OFFLINE only if they are still
	 * disconnected and their DB status is ONLINE.
	 * Skipped for IN_GAME / IN_QUEUE — those services handle their own transitions.
	 */
	private async handleOffline(userId: number): Promise<void> {
		if (this.hasConnections(userId)) return;

		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { status: true },
		});

		if (user?.status !== UserStatus.ONLINE) return;

		await this.prisma.user.update({
			where: { id: userId },
			data: { status: UserStatus.OFFLINE },
		});

		this.logger.log(`userId=${userId} marked OFFLINE after grace period`);
		await this.pushStatusToFriends(userId, UserStatus.OFFLINE);
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