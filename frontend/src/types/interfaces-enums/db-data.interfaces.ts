import { EndReason, MatchType, MatchMode, CharacterName } from "./game.enums";

export interface MatchResult {
	mode: MatchMode; // RANKED, LOCAL, AI
	type: MatchType; // TEAM, FFA
	endReason: EndReason; // TIMEOUT, RESIGNATION, KILLOUT

	durationSeconds: number;

	winningTeamId: number | null; // null in caso di pareggio

	players: PlayerResult[];
}

export interface PlayerResult {
	userId: number | null; // null per i bot
	teamId: number; // For INDIVIDUAL and FFA modes, each player has a unique teamId
	characterName: CharacterName; // ADE, ZEUS
	kills: number;
	deaths: number;

	//finalHpPercent: number;
}