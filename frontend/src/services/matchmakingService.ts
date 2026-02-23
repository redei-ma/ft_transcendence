const MATCHMAKING_URL = 'http://localhost:3001/matchmaking';

export interface JoinQueueRequest {
  userId: string;
  rank: number;
  characterName: string;
  isAiPlayer: boolean;
  socketId: string;
  matchMode: string;
  matchType: string;
}

export interface MatchmakingResponse {
  status: string;
  matchId?: string;
  players?: any[];
}

export const matchmakingService = {

  async joinQueue(data: JoinQueueRequest): Promise<MatchmakingResponse> {
    try {
      const response = await fetch(`${MATCHMAKING_URL}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error('Matchmaking error:', error);
      return { status: 'ERROR_CONNECTION' };
    }
  },
};