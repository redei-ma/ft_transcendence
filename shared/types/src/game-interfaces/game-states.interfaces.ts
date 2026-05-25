import { Vector } from "../game.vector";
import { AttackType, BulletHit, CharacterName } from "../enums";
import { Player } from "./dynamic-entitys.interfaces";

export interface WinnerData {
	winnerTeam: number | null;
	winnerPlayersIds: string[];
}

export interface PlayerSnapshot {
	//potremmo togliere dati superflui per alleggerire il pacchetto
	type: string;
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