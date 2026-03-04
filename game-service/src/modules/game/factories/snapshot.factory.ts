import { Player, Bullet, PlayerSnapshot, BulletSnapshot } from "../interfaces-enums";
import { Vector } from "../utils";

export class Snapshot{
	static toPlayerSnapshot(player: Player): PlayerSnapshot{
		let fixedX: number = Math.round(player.position.x * 100) / 100;
		let fixedZ: number = Math.round(player.position.z * 100) / 100;

		let fixedRotation: number = Math.round(player.rotation * 100) / 100;

		let snapshot :PlayerSnapshot = {
			type: 'player',
			characterName: player.characterName,
			id: player.entityId,
			teamId: player.teamId,
			position: {x: fixedX, z: fixedZ} as Vector,
			rotation: fixedRotation,
			hp: player.hp,
			isAttacking: player.isAttacking,
			isDefending: player.isDefending,
			attackType: player.attackType,
			isDead: player.isDead,
			respawnTimer: player.respawnTimer,
			isDisconnected: player.isDisconnected,
			disconnectionTimer: player.disconnectionTimer,
		}
		return(snapshot);
	}

	static toBulletSnapshot(bullet: Bullet): BulletSnapshot{

		let fixedX: number = Math.round(bullet.position.x * 100) / 100;
		let fixedZ: number = Math.round(bullet.position.z * 100) / 100;

		let snapshot: BulletSnapshot = {
			type: 'bullet',
			id: bullet.entityId,
			characterName: bullet.characterName,
			position: {x: fixedX, z: fixedZ} as Vector,
			entityHit: bullet.entityHit,
			hit: bullet.hit,
		};

		return (snapshot);
	}
}