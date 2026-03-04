import { PlayerSnapshot, BulletSnapshot, WinnerData } from './game.types';

export interface JoinLobbyPayload {
  characterName: 'Zeus' | 'Ade';
}

export interface GameInputPayload {
  x: number;  // -1 a 1
  z: number;  // -1 a 1
}

export interface AttackPayload {
  attackType: 'melee-attack' | 'spell-attack';
}

export interface GameStatePayload {
  players: PlayerSnapshot[];
  bullets: BulletSnapshot[];
}

export interface GameOverPayload {
  winnerData: WinnerData;
  time: number;
}