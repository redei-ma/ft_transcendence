import { CharacterName } from "@transcendence/types";

export interface MatchMakingData{
	characterName: CharacterName;
	userDbId: number | null;
	isAiPlayer: boolean;
};

export interface GameData{
	gameId: string,
	players: MatchMakingData[]
}