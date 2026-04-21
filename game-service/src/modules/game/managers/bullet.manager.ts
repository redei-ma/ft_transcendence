import { Injectable } from "@nestjs/common";
import { World } from "../core";
import { CombatSystem, PhysicsSystem } from "../systems";
import { Player, BulletHit, AttackType } from "@transcendence/types";

@Injectable()
export class BulletManager{

	constructor(private readonly physicsSystem: PhysicsSystem,
		private readonly combatSystem: CombatSystem) {}

	updateBullets(dt: number, gameWorld: World, players: Map<string, Player>): void{
		for (const bullet of gameWorld.bullets.values()){

			if (!bullet.isActive) continue;
			let attacker: Player | undefined = players.get(bullet.ownerId);

			if (!attacker){
				bullet.isActive = false;
				continue ;
			}

			this.physicsSystem.calculateBulletPhysics(bullet, players, gameWorld, dt);
			if (bullet.hit !== BulletHit.NONE || bullet.lifeTime <= 0){
				if (bullet.hit === BulletHit.PLAYER_HIT && bullet.entityHit){
					this.combatSystem.applyDamage(bullet.entityHit, attacker, AttackType.SPELL_ATTACK);
				}
				bullet.isActive = false;
			}
		}
	}
}