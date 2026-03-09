import { CharacterName, MatchType, MatchMode } from "@transcendence/types";

/* Struttura del dato che ricevo quando qualcuno si vuole mettere in coda nel matchmaking */

export class JoinQueueDto {
	userDbId: string;
	characterName: CharacterName;
	isAiPlayer: boolean;
	matchType: MatchType;
	matchMode: MatchMode;
	rankRange: number;
	socketId?: string;
}
