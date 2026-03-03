import {
	Injectable,
	NotFoundException,
	ConflictException,
	BadRequestException,
	ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { FriendshipStatus } from "@transcendence/types";
import {
	FriendResponseDto,
	FriendListResponseDto,
	FriendRequestsResponseDto,
	RespondFriendRequestDto,
} from "@transcendence/types";

const FRIEND_USER_SELECT = {
	id: true,
	username: true,
	avatarUrl: true,
	status: true,
} as const;

const FRIENDSHIP_SELECT = {
	id: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	senderId: true,
	receiverId: true,
	sender: { select: FRIEND_USER_SELECT },
	receiver: { select: FRIEND_USER_SELECT },
} as const;

@Injectable()
export class FriendshipService {
	constructor(private readonly prisma: PrismaService) {}

	// ─── Read ──────────────────────────────────────────────────────────────────

	/**
	 * Returns all ACCEPTED friendships for the given user.
	 *
	 * @param userId - ID of the requesting user (from JWT).
	 * @returns FriendListResponseDto — accepted friends list with total count.
	 */
	async getFriends(userId: number): Promise<FriendListResponseDto> {
		const rows = await this.prisma.friendship.findMany({
			where: {
				status: FriendshipStatus.ACCEPTED,
				OR: [{ senderId: userId }, { receiverId: userId }],
			},
			orderBy: { updatedAt: "desc" },
			select: FRIENDSHIP_SELECT,
		});

		const friends: FriendResponseDto[] = rows.map((f) => {
			const isSender = f.senderId === userId;
			return {
				id: f.id,
				friend: isSender ? f.receiver : f.sender,
				status: f.status,
				direction: isSender ? "SENT" : "RECEIVED",
				createdAt: f.createdAt,
				updatedAt: f.updatedAt,
			};
		});

		return { friends, total: friends.length };
	}

	/**
	 * Returns all PENDING friend requests split into sent and received.
	 *
	 * @param userId - ID of the requesting user (from JWT).
	 * @returns FriendRequestsResponseDto — pending requests grouped by direction.
	 */
	async getFriendRequests(
		userId: number,
	): Promise<FriendRequestsResponseDto> {
		const rows = await this.prisma.friendship.findMany({
			where: {
				status: FriendshipStatus.PENDING,
				OR: [{ senderId: userId }, { receiverId: userId }],
			},
			orderBy: { createdAt: "desc" },
			select: FRIENDSHIP_SELECT,
		});

		const toDto = (
			f: (typeof rows)[0],
			direction: "SENT" | "RECEIVED",
		): FriendResponseDto => ({
			id: f.id,
			friend: direction === "SENT" ? f.receiver : f.sender,
			status: f.status,
			direction,
			createdAt: f.createdAt,
			updatedAt: f.updatedAt,
		});

		return {
			sent: rows
				.filter((f) => f.senderId === userId)
				.map((f) => toDto(f, "SENT")),
			received: rows
				.filter((f) => f.receiverId === userId)
				.map((f) => toDto(f, "RECEIVED")),
		};
	}

	// ─── Mutate ────────────────────────────────────────────────────────────────

	/**
	 * Sends a friend request from userId to targetId.
	 * If a previously REJECTED record exists, it is reused and reset to PENDING
	 * to avoid duplicate rows.
	 *
	 * @param userId - ID of the sender (from JWT).
	 * @param targetId - ID of the user to send the request to.
	 * @returns FriendResponseDto — the created or reused friendship record.
	 * @throws BadRequestException (400) — if userId and targetId are the same.
	 * @throws NotFoundException (404) — if the target user does not exist.
	 * @throws ConflictException (409) — if a friendship or pending request already exists.
	 */
	async sendFriendRequest(
		userId: number,
		targetId: number,
	): Promise<FriendResponseDto> {
		if (userId === targetId) {
			throw new BadRequestException(
				"Cannot send a friend request to yourself",
			);
		}

		const target = await this.prisma.user.findUnique({
			where: { id: targetId },
			select: FRIEND_USER_SELECT,
		});
		if (!target) throw new NotFoundException("User not found");

		const existing = await this.prisma.friendship.findFirst({
			where: {
				OR: [
					{ senderId: userId, receiverId: targetId },
					{ senderId: targetId, receiverId: userId },
				],
			},
		});

		if (existing) {
			if (existing.status === FriendshipStatus.ACCEPTED) {
				throw new ConflictException("Already friends");
			}
			if (existing.status === FriendshipStatus.PENDING) {
				throw new ConflictException("Friend request already pending");
			}
			// REJECTED — reuse the row, resetting direction to current sender
			const updated = await this.prisma.friendship.update({
				where: { id: existing.id },
				data: {
					senderId: userId,
					receiverId: targetId,
					status: FriendshipStatus.PENDING,
				},
				select: FRIENDSHIP_SELECT,
			});
			return {
				id: updated.id,
				friend: updated.receiver,
				status: updated.status,
				direction: "SENT",
				createdAt: updated.createdAt,
				updatedAt: updated.updatedAt,
			};
		}

		const created = await this.prisma.friendship.create({
			data: {
				senderId: userId,
				receiverId: targetId,
				status: FriendshipStatus.PENDING,
			},
			select: FRIENDSHIP_SELECT,
		});

		return {
			id: created.id,
			friend: created.receiver,
			status: created.status,
			direction: "SENT",
			createdAt: created.createdAt,
			updatedAt: created.updatedAt,
		};
	}

	/**
	 * Accepts or rejects a PENDING request that targetId sent to userId.
	 *
	 * @param userId - ID of the receiver responding to the request (from JWT).
	 * @param targetId - ID of the user who sent the request.
	 * @param dto - Action to take: ACCEPTED or REJECTED.
	 * @throws NotFoundException (404) — if no pending request from targetId to userId exists.
	 */
	async respondFriendRequest(
		userId: number,
		targetId: number,
		dto: RespondFriendRequestDto,
	): Promise<void> {
		const friendship = await this.prisma.friendship.findFirst({
			where: {
				senderId: targetId,
				receiverId: userId,
				status: FriendshipStatus.PENDING,
			},
		});

		if (!friendship) {
			throw new NotFoundException(
				"No pending friend request from this user",
			);
		}

		await this.prisma.friendship.update({
			where: { id: friendship.id },
			data: {
				status:
					dto.action === "ACCEPTED"
						? FriendshipStatus.ACCEPTED
						: FriendshipStatus.REJECTED,
			},
		});
	}

	/**
	 * Removes an ACCEPTED friendship or cancels a PENDING request sent by userId.
	 *
	 * @param userId - ID of the requesting user (from JWT).
	 * @param targetId - ID of the other user in the friendship.
	 * @throws NotFoundException (404) — if no active friendship or pending request exists.
	 * @throws ForbiddenException (403) — if trying to cancel a request sent by the other user.
	 */
	async removeFriend(userId: number, targetId: number): Promise<void> {
		const friendship = await this.prisma.friendship.findFirst({
			where: {
				OR: [
					{ senderId: userId, receiverId: targetId },
					{ senderId: targetId, receiverId: userId },
				],
				status: {
					in: [FriendshipStatus.ACCEPTED, FriendshipStatus.PENDING],
				},
			},
		});

		if (!friendship) {
			throw new NotFoundException(
				"No active friendship or pending request found",
			);
		}

		if (
			friendship.status === FriendshipStatus.PENDING &&
			friendship.senderId !== userId
		) {
			throw new ForbiddenException(
				"Cannot cancel a request you did not send. Use respond instead.",
			);
		}

		await this.prisma.friendship.delete({ where: { id: friendship.id } });
	}
}
