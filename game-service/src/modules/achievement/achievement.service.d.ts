import { OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CharacterName } from "@transcendence/types";
import { MatchResult } from "../../types/match-result.interface";
/** Stats snapshot after the match transaction has been committed */
export interface UpdatedPlayerStats {
    userId: number;
    totalWins: number;
    totalLosses: number;
    totalDraws: number;
    totalKills: number;
    totalDeaths: number;
    currentWinStreak: number;
    currentLoseStreak: number;
    characterWins: Map<CharacterName, number>;
}
export declare class AchievementService implements OnModuleInit {
    private readonly prisma;
    private readonly logger;
    /** In-memory cache: achievement name → achievement id */
    private achMap;
    private totalCount;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    /** Loads all achievements into memory to avoid DB queries on every match */
    private loadCache;
    /**
     * Checks all achievement conditions for each real player in the match.
     *
     * Called AFTER the match + stats transaction is committed.
     * Uses match result (live data) and updated stats (cumulative data)
     * to determine which achievements to unlock.
     *
     * @returns Array of { userId, achievementName } for newly unlocked achievements
     */
    checkAchievements(matchResult: MatchResult, playersStats: UpdatedPlayerStats[]): Promise<{
        userId: number;
        achievementName: string;
    }[]>;
}
//# sourceMappingURL=achievement.service.d.ts.map