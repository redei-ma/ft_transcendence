import { Vector } from "../classes";
import { AttackType, BulletHit } from "../enums";
import { Player } from "./dynamic-entitys.interfaces";

export interface PlayerSnapshot {
	//potremmo togliere dati superflui per alleggerire il pacchetto
	type: string;
	characterName: string;
	id: string;
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

	isDead: boolean;
	isAttacking: boolean;
	isDisconnected: boolean;
	isDefending: boolean;
}

export interface BulletSnapshot{
	//stessa cosa del player
	type: string;
	id: string;
	characterName: string;
	position: Vector;
	//x: number,
	//z: number
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