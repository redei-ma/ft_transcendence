import { PlayerSnapshot, BulletSnapshot, FinalData, CharacterName } from '@transcendence/types';

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

export interface FinalData {
  finalData: FinalData;
  time: number;
}