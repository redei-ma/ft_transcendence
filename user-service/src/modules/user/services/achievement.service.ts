import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserAchievementsResponseDto } from "@transcendence/types";

@Injectable()
export class AchievementService {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Returns the achievement collection of the authenticated user.
	 *
	 * @param userId - ID of the requesting user (from JWT).
	 * @returns UserAchievementsResponseDto — unlocked achievements, unlocked count, and total available.
	 */
	async getMyAchievements(
		userId: number,
	): Promise<UserAchievementsResponseDto> {
		return this.buildAchievements(userId);
	}

	/**
	 * Returns the achievement collection of a given player.
	 *
	 * @param targetId - ID of the player to look up.
	 * @returns UserAchievementsResponseDto — unlocked achievements, unlocked count, and total available.
	 */
	async getUserAchievements(
		targetId: number,
	): Promise<UserAchievementsResponseDto> {
		return this.buildAchievements(targetId);
	}

	/**
	 * Core query: loads all unlocked achievements for a user and the global total.
	 *
	 * @param userId - ID of the user to query.
	 * @returns UserAchievementsResponseDto — unlocked achievements with counts.
	 */
	private async buildAchievements(
		userId: number,
	): Promise<UserAchievementsResponseDto> {
		const [unlocked, totalCount] = await this.prisma.$transaction([
			this.prisma.userAchievement.findMany({
				where: { userId },
				orderBy: { unlockedAt: "desc" },
				select: {
					unlockedAt: true,
					achievement: {
						select: {
							name: true,
							description: true,
							iconPath: true,
							tier: true,
						},
					},
				},
			}),
			this.prisma.achievement.count(),
		]);

		return {
			unlocked: unlocked.map((ua) => ({
				name: ua.achievement.name,
				description: ua.achievement.description,
				iconPath: ua.achievement.iconPath,
				tier: ua.achievement.tier,
				unlockedAt: ua.unlockedAt,
			})),
			unlockedCount: unlocked.length,
			totalCount,
		};
	}
}
