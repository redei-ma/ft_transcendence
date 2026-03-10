import { PrismaService } from "../prisma/prisma.service";
import { MatchResult } from "../../types/match-result.interface";
import { AchievementService } from "../achievement/achievement.service";
export declare class MatchResultService {
    private readonly prisma;
    private readonly achievementService;
    private readonly logger;
    constructor(prisma: PrismaService, achievementService: AchievementService);
    /**
     * Processes the end of a match: saves all data and checks achievements.
     *
     * Called by the game engine when a match ends. The MatchResult object
     * contains all live data from the match (kills, deaths, HP, duration).
     *
     * @returns Newly unlocked achievements (for notification purposes)
     */
    processMatchEnd(matchResult: MatchResult): Promise<{
        userId: number;
        achievementName: string;
    }[]>;
    /**
     * Updates UserStats and CharacterStats for a single player.
     * Returns the updated stats snapshot for achievement checking.
     */
    private updatePlayerStats;
    /**
     * Calculates ELO delta for a player after a ranked match.
     *
     * Formula per opponent:
     *   E = 1 / (1 + 10^((opponentElo - playerElo) / 400))
     *   delta = K * (actualScore - E)
     *
     * Delta is averaged across all opponents.
     * K-factor: 32.
     */
    private calculateElo;
}
//# sourceMappingURL=match-result.service.d.ts.map