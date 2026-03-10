import { CharacterName } from "../enums";

export interface MatchMakingData{
	characterName: CharacterName;
	userDbId: string | null;
	isAiPlayer: boolean;
};

export interface GameData{
	gameId: string,
	players: MatchMakingData[]
}