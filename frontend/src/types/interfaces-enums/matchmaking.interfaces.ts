import { CharacterName, MatchMode, MatchType } from "./game.enums";

export interface MatchMakingData{
	socketId: string | undefined;
	characterName: CharacterName;
	userDbId: number | null;
	isAiPlayer: boolean;
	playerIndex: number | undefined;
};