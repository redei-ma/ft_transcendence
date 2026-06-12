import { CharacterName, EndReason, MatchMode, MatchType, Pillar, PlayerSnapshot, BulletSnapshot, FinalData } from '@transcendence/types';
export { CharacterName, EndReason, MatchMode, MatchType };

export interface EloPreviewPlayer {
  id: number;
  username: string;
  eloCurrent: number;
}

export interface EloPreviewOutcome {
  win: number;
  draw: number;
  loss: number;
}

export interface EloPreview {
  player1: EloPreviewPlayer;
  player2: EloPreviewPlayer;
  preview: {
    player1: EloPreviewOutcome;
    player2: EloPreviewOutcome;
  };
}

export interface Vector {
  x: number;
  z: number;
}

// --- Game state payloads ---

export interface GameStatePayload {
  players: PlayerSnapshot[];
  bullets: BulletSnapshot[];
  time: number;
}

export interface GameOverPayload {
  finalData: FinalData | undefined;
  time: number;
}

export interface MapEmitPayload {
  map: {
    id: string;
    walls: Array<{
      id: string;
      position: Vector;
      width: number;
      depth: number;
    }>;
    pillars: Pillar[];
    width: number;
    depth: number;
    spawnPoints: Vector[];
    maxPlayers: number;
  };
  config: {
    playerRadius: number;
    playerSpeed: number;
  };
}