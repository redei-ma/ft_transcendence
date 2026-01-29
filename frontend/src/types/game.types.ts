export class Vector {
  constructor(public x: number, public z: number) {}

  static fromData(data: { x: number; z: number }): Vector {
    return new Vector(data.x, data.z);
  }

  getRotation(): number {
    return Math.atan2(this.z, this.x);
  }

  normalize(): void {
    const distance = Math.sqrt(this.x * this.x + this.z * this.z);
    if (distance > 1) {
      this.x /= distance;
      this.z /= distance;
    }
  }

  set(newX: number, newZ: number): void {
    this.x = newX;
    this.z = newZ;
  }
}

export enum Team {
  RED = 'RED',
  BLUE = 'BLUE'
}

export enum AttackType {
  MELEE_ATTACK = 'melee-attack',
  SPELL_ATTACK = 'spell-attack',
}

export enum BulletHit {
  PLAYER_HIT = 'player-hit',
  WALL_HIT = 'wall-hit',
  NONE = 'none',
}

export interface PlayerSnapshot {
  type: 'player';
  characterName: string;
  id: string;
  team: Team;
  position: Vector;
  rotation: number;
  hp: number;
  isAttacking: boolean;
  attackType: AttackType | undefined;
  isDead: boolean;
  respawnTimer: number;
}

export interface BulletSnapshot {
  type: 'bullet';
  id: string;
  position: Vector;
  hit: BulletHit;
}

export interface StaticEntity {
  id: string;
  position: Vector;
  width: number;
  depth: number;
}

export interface MapData {
  meta: {
    name: string;
    version: string;
    author: string;
  };
  settings: {
    width: number;
    depth: number;
    maxPlayers: number;
  };
  walls: Array<{
    id: string;
    x: number;
    z: number;
    width: number;
    depth: number;
  }>;
}