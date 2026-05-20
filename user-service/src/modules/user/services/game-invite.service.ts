import {
	Injectable,
	NotFoundException,
	ConflictException,
	ForbiddenException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SseService } from "./sse.service";
import {
	InviteStatus,
	UserStatus,
} from "@transcendence/types";
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
	constructor(
		private readonly prisma: PrismaService,
		private readonly sseService: SseService,
	) {}

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
	 * @throws NotFoundException (404) — if sender or receiver does not exist.
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

		const [sender, receiver] = await Promise.all([
			this.prisma.user.findUnique({
				where: { id: senderId },
				select: { username: true },
			}),
			this.prisma.user.findUnique({
				where: { id: receiverId },
				select: INVITE_USER_SELECT,
			}),
		]);

		if (!sender || !receiver) throw new NotFoundException("User not found");

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

		const invite = await this.prisma.gameInvite.create({
			data: {
				senderId,
				receiverId,
				status: InviteStatus.PENDING,
				expiresAt,
			},
			select: INVITE_SELECT,
		});

		this.sseService.pushGameInvite(receiverId, {
			id: invite.id,
			expiresAt: invite.expiresAt,
			sender: invite.sender,
		});

		return invite;
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
	 *
	 * On ACCEPTED:
	 *   - Checks that the sender is still ONLINE (fast fail before calling matchmaking).
	 *   - Calls matchmaking-service to create a direct session for character selection.
	 *   - Returns { sessionId } for the receiver to join the matchmaking WS.
	 *
	 * On REJECTED:
	 *   - Marks the invite as REJECTED. No further action.
	 *
	 * @param userId - ID of the receiver responding to the invite (from JWT).
	 * @param inviteId - ID of the invite to respond to.
	 * @param dto - Action to take: ACCEPTED or REJECTED.
	 * @returns RespondGameInviteResponseDto — sessionId when ACCEPTED, null when REJECTED.
	 * @throws NotFoundException (404) — if the invite does not exist.
	 * @throws ForbiddenException (403) — if the invite belongs to another user.
	 * @throws BadRequestException (400) — if the invite is no longer pending or has expired.
	 * @throws ConflictException (409) — if the sender is no longer available.
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
			this.sseService.pushGameInviteDeclined(invite.senderId, inviteId, userId);
			return { sessionId: null };
		}

		// ─── ACCEPTED ──────────────────────────────────────────────────────────

		// Fast fail: check sender is still ONLINE before calling matchmaking.
		// Matchmaking will perform the definitive atomic check against Redis.
		const sender = await this.prisma.user.findUnique({
			where: { id: invite.senderId },
			select: { status: true },
		});

		if (!sender || sender.status !== UserStatus.ONLINE) {
			throw new ConflictException(
				"The challenger is no longer available",
			);
		}

		// TODO: call matchmaking-service to create a direct session
		// POST http://matchmaking-service:3500/internal/matchmaking/direct-session
		// Body:     { player1Id: invite.senderId, player2Id: userId }
		// Response: { sessionId: string }
		// On 409:   throw ConflictException — player entered game/queue (race condition)
		// On error: propagate as InternalServerErrorException
		const sessionId = "TODO_MATCHMAKING_NOT_YET_IMPLEMENTED";

		await this.prisma.gameInvite.update({
			where: { id: inviteId },
			data: { status: InviteStatus.ACCEPTED },
		});

		return { sessionId };
	}
}
