import { CharacterName, MatchType, MatchMode } from '../dto/interfaces-enums/game.enums';

/* Struttura del dato che ricevo quando qualcuno si vuole mettere in coda nel matchmaking */

export class JoinQueueDto {
  userDbId: string;
  characterName: CharacterName;
  isAiPlayer: boolean;
  matchType: MatchType;
  matchMode: MatchMode;
  rank: number;
  rankRange: number;
  socketId?: string;
}