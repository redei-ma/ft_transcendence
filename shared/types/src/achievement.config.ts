import { GameConfig } from "./configs";

export const AchievementConfig = {
	achievements: {
		/** Total kills to earn "Kill Machine" (~33 matches worth) */
		KILL_MACHINE_THRESHOLD: Math.round(GameConfig.SERVER.MAX_GAME_KILLS * 33),

		/** Win a match faster than this for "Speed Demon" (1/3 of time limit) */
		SPEED_DEMON_SECONDS: Math.round(GameConfig.SERVER.MAX_GAME_DURATION / 3),

		/** Wins with a specific character for "Champion" achievements */
		CHAMPION_WINS: 10,

		/** Consecutive wins/losses for streak achievements */
		STREAK_THRESHOLD: 5,

		/** HP percentage threshold for "Clutch Master" */
		CLUTCH_HP_PERCENT: GameConfig.ACHIEVEMENT.CLUTCHMASTER,
	},
} as const;
