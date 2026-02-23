/**
 * @file game.config.ts
 * @description Single source of truth for gameplay variables and achievement thresholds.
 *
 * Achievement thresholds are derived from gameplay values so they stay
 * proportional when game balance changes. For example, if killsToWin
 * goes from 3 to 10, KILL_MACHINE_THRESHOLD scales from 100 to ~330.
 *
 * The multiplier logic:
 * - KILL_MACHINE: ~33 matches worth of kills
 * - SPEED_DEMON: 1/3 of the match time limit
 * - CHAMPION_WINS: fixed at 10 (not gameplay-dependent)
 * - STREAK: fixed at 5 (not gameplay-dependent)
 * - CLUTCH_HP_PERCENT: fixed at 5% (already proportional)
 */

// ─── Gameplay Variables ──────────────────────────────────────────────

const KILLS_TO_WIN = 3;
const MATCH_TIME_LIMIT_SECONDS = 180;
const CLUTCH_HP_PERCENT = 5;

export const AchievementConfig = {
	achievements: {
		/** Total kills to earn "Kill Machine" (~33 matches worth) */
		KILL_MACHINE_THRESHOLD: Math.round(KILLS_TO_WIN * 33),

		/** Win a match faster than this for "Speed Demon" (1/3 of time limit) */
		SPEED_DEMON_SECONDS: Math.round(MATCH_TIME_LIMIT_SECONDS / 3),

		/** Wins with a specific character for "Champion" achievements */
		CHAMPION_WINS: 10,

		/** Consecutive wins/losses for streak achievements */
		STREAK_THRESHOLD: 5,

		/** HP percentage threshold for "Clutch Master" */
		CLUTCH_HP_PERCENT: CLUTCH_HP_PERCENT,
	},
} as const;
