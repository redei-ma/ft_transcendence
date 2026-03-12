import {
	Injectable,
	NotFoundException,
	ConflictException,
	ForbiddenException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { InviteStatus } from "@transcendence/types";
import {
	SendGameInviteDto,
	RespondGameInviteDto,
	RespondGameInviteResponseDto,
	GameInviteResponseDto,
	GameInviteListResponseDto,
} from "../dto";

const INVITE_USER_SELECT = {
	id: true,
	username: true,
	avatarUrl: true,
	status: true,
} as const;

const INVITE_SELECT = {
	id: true,
	status: true,
	createdAt: true,
	expiresAt: true,
	sender: { select: INVITE_USER_SELECT },
	receiver: { select: INVITE_USER_SELECT },
} as const;

@Injectable()
export class GameInviteService {
	constructor(private readonly prisma: PrismaService) {}

	// ─── Public API ────────────────────────────────────────────────────────────

	/**
	 * Sends a game invite from senderId to receiverId.
	 * Blocks if a non-expired PENDING invite already exists for the same pair.
	 *
	 * @param senderId - ID of the user sending the invite (from JWT).
	 * @param receiverId - ID of the user to invite.
	 * @param dto - Optional expiration duration in seconds (default: 60).
	 * @returns GameInviteResponseDto — the created invite record.
	 * @throws BadRequestException (400) — if senderId and receiverId are the same.
	 * @throws NotFoundException (404) — if the receiver does not exist.
	 * @throws ConflictException (409) — if a non-expired pending invite already exists.
	 */
	async sendInvite(
		senderId: number,
		receiverId: number,
		dto: SendGameInviteDto,
	): Promise<GameInviteResponseDto> {
		if (senderId === receiverId) {
			throw new BadRequestException("Cannot invite yourself");
		}

		const receiver = await this.prisma.user.findUnique({
			where: { id: receiverId },
			select: { id: true },
		});
		if (!receiver) throw new NotFoundException("User not found");

		const existing = await this.prisma.gameInvite.findFirst({
			where: {
				senderId,
				receiverId,
				status: InviteStatus.PENDING,
				expiresAt: { gt: new Date() },
			},
		});
		if (existing) {
			throw new ConflictException(
				"A pending invite already exists for this user",
			);
		}

		const expiresAt = new Date(
			Date.now() + (dto.expiresInSeconds ?? 60) * 1000,
		);

		return this.prisma.gameInvite.create({
			data: {
				senderId,
				receiverId,
				status: InviteStatus.PENDING,
				expiresAt,
			},
			select: INVITE_SELECT,
		});
	}

	/**
	 * Returns all PENDING non-expired invites received by the given user.
	 *
	 * @param userId - ID of the receiving user (from JWT).
	 * @returns GameInviteListResponseDto — pending invites with total count.
	 */
	async getPendingInvites(
		userId: number,
	): Promise<GameInviteListResponseDto> {
		const invites = await this.prisma.gameInvite.findMany({
			where: {
				receiverId: userId,
				status: InviteStatus.PENDING,
				expiresAt: { gt: new Date() },
			},
			orderBy: { createdAt: "desc" },
			select: INVITE_SELECT,
		});

		return { invites, total: invites.length };
	}

	/**
	 * Accepts or rejects a received game invite.
	 * When ACCEPTED, creates a direct lobby via matchmaking-service and notifies the sender.
	 *
	 * @param userId - ID of the receiver responding to the invite (from JWT).
	 * @param inviteId - ID of the invite to respond to.
	 * @param dto - Action to take: ACCEPTED or REJECTED.
	 * @returns lobbyId when ACCEPTED (for character selection), null when REJECTED.
	 * @throws NotFoundException (404) — if the invite does not exist.
	 * @throws ForbiddenException (403) — if the invite belongs to another user.
	 * @throws BadRequestException (400) — if the invite is no longer pending or has expired.
	 * @throws ConflictException (409) — if either player is no longer available (in game or queue).
	 */
	async respondInvite(
		userId: number,
		inviteId: number,
		dto: RespondGameInviteDto,
	): Promise<RespondGameInviteResponseDto> {
		const invite = await this.prisma.gameInvite.findUnique({
			where: { id: inviteId },
			select: {
				id: true,
				senderId: true,
				receiverId: true,
				status: true,
				expiresAt: true,
			},
		});

		if (!invite) throw new NotFoundException("Invite not found");
		if (invite.receiverId !== userId) throw new ForbiddenException();
		if (invite.status !== InviteStatus.PENDING) {
			throw new BadRequestException("Invite is no longer pending");
		}
		if (invite.expiresAt < new Date()) {
			await this.prisma.gameInvite.update({
				where: { id: inviteId },
				data: { status: InviteStatus.EXPIRED },
			});
			throw new BadRequestException("Invite has expired");
		}

		if (dto.action === "REJECTED") {
			await this.prisma.gameInvite.update({
				where: { id: inviteId },
				data: { status: InviteStatus.REJECTED },
			});
			return { lobbyId: null };
		}

		// ACCEPTED flow

		// TODO: check that both sender and receiver are ONLINE (not IN_GAME or IN_QUEUE)
		// Query User.status for invite.senderId and userId, throw ConflictException if either is busy.

		// TODO: call matchmaking-service POST /internal/matchmaking/direct-match/lobby
		// Body: { senderId: invite.senderId, receiverId: userId }
		// Returns: { lobbyId: string }
		// Throw ConflictException if matchmaking returns 409 (race condition, player became busy).
		const lobbyId = "TODO_MATCHMAKING_NOT_YET_IMPLEMENTED";

		await this.prisma.gameInvite.update({
			where: { id: inviteId },
			data: { status: InviteStatus.ACCEPTED },
		});

		// TODO: notify sender via notification WS: { event: "lobby_ready", lobbyId }
		// Call user notification WS gateway to push event to invite.senderId.

		return { lobbyId };
	}
}
