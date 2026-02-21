/* Struttura del dato che ricevo quando qualcuno si vuole mettere in coda nel matchmaking */

export class JoinQueueDto {
  userId: string;
  rank: number;
  characterName: string;
  isAiPlayer: boolean;
  socketId?: string;
  matchMode: Enumerator;
  matchType: Enumerator;
}