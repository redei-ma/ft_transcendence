import { Vector, Player, Bullet, PlayerSnapshot, BulletSnapshot } from "@transcendence/types"

export class Snapshot{
	static toPlayerSnapshot(player: Player): PlayerSnapshot{
		let fixedX: number = Math.round(player.position.x * 100) / 100;
		let fixedZ: number = Math.round(player.position.z * 100) / 100;

		let fixedRotation: number = Math.round(player.rotation * 100) / 100;

		let snapshot :PlayerSnapshot = {
			//vedi game-states.interfaces.ts
			//type e characterName si potrebbero togliere? chiedere a fra
			type: 'player',
			characterName: player.characterName,

			//invece di entity id non e' meglio mandare userDbId?
			id: player.entityId,
			teamId: player.teamId,
			//x: fixedX,
			//z: fixedZ,
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
			//vedi game-states.interfaces.ts
			//type e characterName si potrebbero togliere? chiedere a fra
			type: 'bullet',
			id: bullet.entityId,
			characterName: bullet.characterName,
			position: {x: fixedX, z: fixedZ} as Vector,
			//x: number,
			//z: number,
			entityHit: bullet.entityHit,
			hit: bullet.hit,
		};

		return (snapshot);
	}
}