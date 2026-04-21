import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
	MatchHistoryQueryDto,
	MatchHistoryResponseDto,
	MatchHistoryEntryDto,
} from "../dto";

@Injectable()
export class MatchHistoryService {
	constructor(private readonly prisma: PrismaService) {}

	// ─── Public API ────────────────────────────────────────────────────────────

	/**
	 * Returns paginated match history for the authenticated user.
	 *
	 * @param userId - ID of the requesting user (from JWT).
	 * @param query - Pagination options and optional mode filter.
	 * @returns MatchHistoryResponseDto — paginated matches with result from the user's perspective.
	 */
	async getMyMatchHistory(
		userId: number,
		query: MatchHistoryQueryDto,
	): Promise<MatchHistoryResponseDto> {
		return this.buildMatchHistory(userId, userId, query);
	}

	/**
	 * Returns paginated match history for a given player.
	 *
	 * @param targetId - ID of the player to look up.
	 * @param query - Pagination options and optional mode filter.
	 * @returns MatchHistoryResponseDto — paginated matches with result from the player's perspective.
	 * @throws NotFoundException (404) — if the player does not exist.
	 */
	async getUserMatchHistory(
		targetId: number,
		query: MatchHistoryQueryDto,
	): Promise<MatchHistoryResponseDto> {
		const target = await this.prisma.user.findUnique({
			where: { id: targetId },
			select: { id: true },
		});
		if (!target) throw new NotFoundException("Player not found");
		return this.buildMatchHistory(targetId, targetId, query);
	}

	// ─── Private helpers ───────────────────────────────────────────────────────

	/**
	 * Core query: loads paginated matches for filterUserId and computes
	 * each match result from perspectiveUserId's team.
	 *
	 * @param perspectiveUserId - User whose team determines WIN/LOSS/DRAW.
	 * @param filterUserId - User whose participation filters the match list.
	 * @param query - Pagination options and optional mode filter.
	 * @returns MatchHistoryResponseDto — paginated match entries with computed results.
	 */
	private async buildMatchHistory(
		perspectiveUserId: number,
		filterUserId: number,
		query: MatchHistoryQueryDto,
	): Promise<MatchHistoryResponseDto> {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const skip = (page - 1) * limit;

		const where = {
			participants: { some: { userId: filterUserId } },
			...(query.mode ? { mode: query.mode } : {}),
		};

		const [matches, total] = await this.prisma.$transaction([
			this.prisma.match.findMany({
				where,
				orderBy: { playedAt: "desc" },
				skip,
				take: limit,
				select: {
					id: true,
					playedAt: true,
					mode: true,
					type: true,
					durationSeconds: true,
					endReason: true,
					winningTeamId: true,
					participants: {
						select: {
							userId: true,
							teamId: true,
							characterName: true,
							kills: true,
							deaths: true,
							user: {
								select: { username: true, avatarUrl: true },
							},
						},
					},
				},
			}),
			this.prisma.match.count({ where }),
		]);

		const entries: MatchHistoryEntryDto[] = matches.map((match) => {
			const mine = match.participants.find(
				(p) => p.userId === perspectiveUserId,
			);
			const result: "WIN" | "LOSS" | "DRAW" =
				match.winningTeamId === null
					? "DRAW"
					: mine?.teamId === match.winningTeamId
						? "WIN"
						: "LOSS";

			return {
				matchId: match.id,
				playedAt: match.playedAt,
				mode: match.mode,
				type: match.type,
				durationSeconds: match.durationSeconds,
				endReason: match.endReason,
				result,
				participants: match.participants.map((p) => ({
					userId: p.userId,
					username: p.user?.username ?? null,
					avatarUrl: p.user?.avatarUrl ?? null,
					teamId: p.teamId,
					characterName: p.characterName,
					kills: p.kills,
					deaths: p.deaths,
				})),
			};
		});

		return { entries, total, page, limit };
	}
}
