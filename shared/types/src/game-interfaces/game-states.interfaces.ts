import { Vector } from "../game.vector";
import { AttackType, BulletHit, CharacterName } from "../enums";
import { Player } from "./dynamic-entitys.interfaces";

export interface FinalPlayerStats{
	userName: string,
	kill: number,
	dead: number
}

export interface FinalData {
	winnerTeam: number | null;
	winnerPlayersStats: FinalPlayerStats[];
	loserPlayersStats: FinalPlayerStats[];
}

export interface PlayerSnapshot {
	//potremmo togliere dati superflui per alleggerire il pacchetto
	characterName: CharacterName;
	id: string;
	userName: string;
	teamId: number;

	//potremmo sostituire l oggetto vettore con due numeri, per alleggerire il pacchetto
	//x: number
	//z: number
	position: Vector;
	rotation: number;
	hp: number;
	kill: number;
	dead: number;
	attackType: AttackType | undefined;
	respawnTimer: number;
	disconnectionTimer: number;

	meleeAttackCooldown: number;
	spellAttackCooldown: number;
	defenceAttackCooldown: number;

	isDead: boolean;
	isAttacking: boolean;
	isDisconnected: boolean;
	isDefending: boolean;
}

export interface BulletSnapshot {
	//stessa cosa del player
	type: string;
	id: string;
	characterName: CharacterName;
	position: Vector;
	//x: number,
	//z: number
	entityHit: Player | undefined;
	hit: BulletHit;
}