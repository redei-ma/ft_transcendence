// types/game.types.ts
// Mirrors backend interfaces — keep in sync manually.

export interface Vector {
  x: number;
  z: number;
}

// --- Enums ---

export enum AttackType {
  MELEE_ATTACK   = 'melee-attack',
  SPELL_ATTACK   = 'spell-attack',
  DEFENCE_ATTACK = 'defence-attack',
}

export enum BulletHit {
  PLAYER_HIT = 'player-hit',
  WALL_HIT   = 'wall-hit',
  NONE       = 'none',
}

export enum CharacterName {
  ADE     = 'ade',
  ZEUS    = 'zeus',
  DEFAULT = 'default',
}

export enum EndReason {
  TIMEOUT     = 'timeout',
  RESIGNATION = 'resignation',
  KILLOUT     = 'killout',
}

export enum MatchMode {
  RANKED   = 'ranked',
  UNRANKED = 'unranked',
  LOCAL    = 'local',
  AI       = 'ai',
}

export enum MatchType {
  TEAM = 'team',
  FFA  = 'ffa',
}

// --- Snapshot: what the server sends every tick ---

export interface PlayerSnapshot {
  id: string;
  type: string;
  characterName: string;
  teamId: number;
  position: Vector;
  rotation: number;
  hp: number;
  attackType: AttackType | undefined;
  respawnTimer: number;
  disconnectionTimer: number;

  isDead: boolean;
  isAttacking: boolean;
  isDisconnected: boolean;
  isDefending: boolean;
}

export interface BulletSnapshot {
  type: string;
  id: string;
  characterName: string;
  position: Vector;
  hit: BulletHit;
}

// --- Game state payloads ---

export interface GameStatePayload {
  players: PlayerSnapshot[];
  bullets: BulletSnapshot[];
  time: number;
}

export interface WinnerData {
  winnerTeam: number | null;
  winnerPlayersIds: string[];
}

export interface GameOverPayload {
  winnerData: WinnerData | undefined;
  time: number;
}

// --- Match results (for stats/history) ---

export interface PlayerResult {
  userId: number | null;
  teamId: number;
  characterName: CharacterName;
  kills: number;
  deaths: number;
}

export interface MatchResult {
  mode: MatchMode;
  type: MatchType;
  endReason: EndReason;
  durationSeconds: number;
  winningTeamId: number | null;
  players: PlayerResult[];
}

// --- Map payload ---

export interface Pillar {
  id: string;
  position: Vector;
  radius: number;
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

// --- Matchmaking ---

export interface MatchMakingData {
  socketId: string | undefined;
  characterName: CharacterName;
  userDbId: number | null;
  isAiPlayer: boolean;
  playerIndex: number | undefined;
}