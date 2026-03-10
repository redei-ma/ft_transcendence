"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AchievementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AchievementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const types_1 = require("@transcendence/types");
let AchievementService = AchievementService_1 = class AchievementService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AchievementService_1.name);
        /** In-memory cache: achievement name → achievement id */
        this.achMap = new Map();
        this.totalCount = 0;
    }
    // ─── Startup: Cache ────────────────────────────────────
    async onModuleInit() {
        await this.loadCache();
    }
    /** Loads all achievements into memory to avoid DB queries on every match */
    async loadCache() {
        const achievements = await this.prisma.achievement.findMany();
        this.achMap.clear();
        for (const ach of achievements) {
            this.achMap.set(ach.name, ach.id);
        }
        this.totalCount = achievements.length;
        this.logger.log(`${this.totalCount} achievements cached`);
    }
    // ─── Post-Match Achievement Check ─────────────────────────────
    /**
     * Checks all achievement conditions for each real player in the match.
     *
     * Called AFTER the match + stats transaction is committed.
     * Uses match result (live data) and updated stats (cumulative data)
     * to determine which achievements to unlock.
     *
     * @returns Array of { userId, achievementName } for newly unlocked achievements
     */
    async checkAchievements(matchResult, playersStats) {
        const unlocked = [];
        const a = types_1.AchievementConfig.achievements;
        // Load already unlocked achievements for all players in one query
        const playerIds = playersStats.map((p) => p.userId);
        const existing = await this.prisma.userAchievement.findMany({
            where: { userId: { in: playerIds } },
            select: { userId: true, achievementId: true },
        });
        const alreadyUnlocked = new Set(existing.map((e) => `${e.userId}-${e.achievementId}`));
        for (const stats of playersStats) {
            const player = matchResult.players.find((p) => p.userId === stats.userId);
            if (!player)
                continue;
            const isWinner = matchResult.winningTeamId !== null &&
                player.teamId === matchResult.winningTeamId;
            const isLoser = matchResult.winningTeamId !== null &&
                player.teamId !== matchResult.winningTeamId;
            const isDraw = matchResult.winningTeamId === null;
            const earned = [];
            // ─── Bronze ───────────────────────────────────────
            // First Blood: first match ever
            const totalMatches = stats.totalWins + stats.totalLosses + stats.totalDraws;
            if (totalMatches === 1) {
                earned.push("First Blood");
            }
            // Perfectly Balanced: draw
            if (isDraw) {
                earned.push("Perfectly Balanced");
            }
            // Total Defeat: lose with 0 kills
            if (isLoser && player.kills === 0) {
                earned.push("Total Defeat");
            }
            // Losing Streak
            if (stats.currentLoseStreak >= a.STREAK_THRESHOLD) {
                earned.push("Losing Streak");
            }
            // ─── Silver ──────────────────────────────────────
            // Flawless Victory: win with 0 deaths
            if (isWinner && player.deaths === 0) {
                earned.push("Flawless Victory");
            }
            // Speed Demon: win fast
            if (isWinner &&
                matchResult.durationSeconds < a.SPEED_DEMON_SECONDS) {
                earned.push("Speed Demon");
            }
            // Hades Champion: N wins as Ade
            if (player.characterName === types_1.CharacterName.ADE &&
                (stats.characterWins.get(types_1.CharacterName.ADE) ?? 0) >=
                    a.CHAMPION_WINS) {
                earned.push("Hades Champion");
            }
            // Zeus Champion: N wins as Zeus
            if (player.characterName === types_1.CharacterName.ZEUS &&
                (stats.characterWins.get(types_1.CharacterName.ZEUS) ?? 0) >=
                    a.CHAMPION_WINS) {
                earned.push("Zeus Champion");
            }
            // ─── Gold ────────────────────────────────────────
            // Winning Streak
            if (stats.currentWinStreak >= a.STREAK_THRESHOLD) {
                earned.push("Winning Streak");
            }
            // Kill Machine: cumulative kills
            if (stats.totalKills >= a.KILL_MACHINE_THRESHOLD) {
                earned.push("Kill Machine");
            }
            // Clutch Master: win with low HP
            if (player.clutchMasterUnlook) {
                earned.push("Clutch Master");
            }
            // ─── Save newly earned achievements ──────────────
            for (const name of earned) {
                const achId = this.achMap.get(name);
                if (!achId)
                    continue;
                const key = `${stats.userId}-${achId}`;
                if (alreadyUnlocked.has(key))
                    continue;
                await this.prisma.userAchievement.create({
                    data: {
                        userId: stats.userId,
                        achievementId: achId,
                    },
                });
                alreadyUnlocked.add(key);
                unlocked.push({ userId: stats.userId, achievementName: name });
            }
            // ─── Platinum (check after all others) ───────────
            const completionistId = this.achMap.get("Completionist");
            if (!completionistId)
                continue;
            const userUnlockedCount = [...alreadyUnlocked].filter((k) => k.startsWith(`${stats.userId}-`)).length;
            // -1 because Completionist itself doesn't count
            if (userUnlockedCount >= this.totalCount - 1 &&
                !alreadyUnlocked.has(`${stats.userId}-${completionistId}`)) {
                await this.prisma.userAchievement.create({
                    data: {
                        userId: stats.userId,
                        achievementId: completionistId,
                    },
                });
                unlocked.push({
                    userId: stats.userId,
                    achievementName: "Completionist",
                });
            }
        }
        if (unlocked.length > 0) {
            this.logger.log(`Achievements unlocked: ${unlocked.map((u) => `${u.userId}:${u.achievementName}`).join(", ")}`);
        }
        return unlocked;
    }
};
exports.AchievementService = AchievementService;
exports.AchievementService = AchievementService = AchievementService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AchievementService);
