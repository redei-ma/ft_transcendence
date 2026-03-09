import { MatchMode, MatchType, CharacterName, EndReason } from "@transcendence/types";

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
