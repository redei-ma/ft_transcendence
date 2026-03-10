// types/game.types.ts

import { Pillar, PlayerSnapshot, BulletSnapshot, WinnerData } from '@transcendence/types';

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
  winnerData: WinnerData | undefined;
  time: number;
}

// --- Map payload ---

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
