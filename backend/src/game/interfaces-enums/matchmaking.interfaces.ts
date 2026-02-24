import { CharacterName } from "./game.enums";

export interface MatchMakingData{
	characterName: CharacterName;
	userDbId: number | null;
	isAiPlayer: boolean;
};

export interface GameData{
	gameId: string,
	players: MatchMakingData[]
}