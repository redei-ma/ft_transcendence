import { MapData, PlayerSnapshot, BulletSnapshot, Vector } from './game.types';

export enum GameEvents {
  // Client → Server
  JOIN_LOBBY = 'join-lobby',
  INPUT = 'game-input',
  ATTACK = 'attack',
  
  // Server → Client
  GAME_STATE = 'game-state',
  GAME_OVER = 'game-over',
  MAP_EMIT = 'map-emit',
}

export interface JoinLobbyPayload {
  characterName: 'Zeus' | 'Ade';
}

export interface GameInputPayload {
  x: number; // -1 a 1
  z: number; // -1 a 1
}

export interface AttackPayload {
  attackType: 'melee-attack' | 'spell-attack';
}

export interface GameStatePayload {
  players: PlayerSnapshot[];
  bullets: BulletSnapshot[];
}

export interface GameOverPayload {
  winnerData: any;
  time: number;
}