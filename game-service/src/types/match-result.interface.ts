/**
2 * @file match-result.interface.ts
3 * @description Interfaces for end-of-match data.
4 *
5 * Created by the game engine at the end of a match and passed
6 * to the match service for DB persistence, stats update, and
7 * achievement checking.
8 */
import { CharacterName, MatchMode, MatchType, EndReason } from "@prisma/client";

export interface MatchResult {
	mode: MatchMode; // RANKED, UNRANKED, LOCAL, AI
	type: MatchType; // FFA, TEAM
	durationSeconds: number;
	endReason: EndReason; // TIMEOUT, RESIGNATION, KILLOUT

	winningTeamId: number | null; // null in caso di pareggio

	players: PlayerResult[];
}

export interface PlayerResult {
	userId: number | null; // null per i bot
	teamId: number; // For FFA modes, each player has a unique teamId
	characterName: CharacterName; // ADE, ZEUS
	kills: number;
	deaths: number;
	clutchMasterUnlook: boolean; // True if the player made a kill with HP < CLUTCH_HP_PERCENT
}
