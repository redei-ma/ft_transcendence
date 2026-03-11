import { IPlayerState } from "../game-interfaces";
import { Vector } from "../game.vector";
import { CharacterName, BulletHit, AttackType } from "../enums";

export interface	DynamicEntity{
	entityId: string; // Unique identifier (Socket ID for players, UUID for projectiles)
	speed: number;
	position: Vector;
	displacement: Vector; // Displacement vector
	radius: number; //hitbox
}

export interface	Bullet extends DynamicEntity{
	ownerId: string;
	characterName: CharacterName;
	teamId: number;
	lifeTime: number;
	hit: BulletHit;
	entityHit: Player | undefined;
	isActive: boolean;
}

export interface InputQueue{
	input: Vector;
	attackType: AttackType | undefined;
}

export interface	Player extends DynamicEntity{
	type: 'player';
	socketId: string | undefined;
	userDbId:  string | null;

	rotation: number; // Orientation angle (in radians)

	characterName: CharacterName;
	teamId: number,
	spawnIndex: number;
	playerIndex: number;

	hp: number;
	kill: number;
	damage: number;
	deads: number;

	meleeAttackHitboxRadius: number;
	spellAttackHitboxRadius: number;

	meleeAttackDamage: number;
	spellAttackDamage: number;

	spellAttackspeed: number;

	meleeAttackCooldown: number;
	spellAttackCooldown: number;
	defenceAttackCooldown: number;

	attackType: AttackType | undefined,
	isAttacking: boolean;

	isDead: boolean;
	isWinner: boolean;
	isGhost: boolean;
	isDefending: boolean;
	isDisconnected: boolean;
	isBot: boolean;
	
	disconnectionTimer: number;
	respawnTimer: number;
	
	inputQueue: InputQueue[];

	currentState: IPlayerState | undefined;
	clutchMasterUnlook: boolean;
}