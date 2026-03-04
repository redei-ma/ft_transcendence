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
