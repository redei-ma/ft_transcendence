import { PlayerSnapshot, BulletSnapshot, WinnerData } from './game.types';
import { CharacterName } from '@transcendence/types';

export interface JoinLobbyPayload {
  characterName: CharacterName;
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