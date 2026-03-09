import { Vector } from "../game.types";
import { AttackType, BulletHit } from "./game.enums";
import { Player } from "./dynamic-entitys.interfaces";
import { CharacterName } from '@transcendence/types';

export interface PlayerSnapshot {
	id: string;
	type: string;
	characterName: CharacterName;
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

export interface BulletSnapshot{
	type: string;
	id: string;
	characterName: CharacterName;
	position: Vector;
	entityHit: Player | undefined;
	hit: BulletHit;
}

export interface WinnerData{
	winnerTeam: number | null;
	winnerPlayersIds: string[];
}

export interface GameStateEvents{
	eventName: 'game-state';
	data:{
		players: PlayerSnapshot[] | undefined,
		bullets: BulletSnapshot[] | undefined,
	};
	time: number;
}

export interface GameEndEvents{
	eventName: 'game-over';
	winnerData: WinnerData | undefined;
	time: number;
}