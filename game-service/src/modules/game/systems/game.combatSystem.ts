import { Vector, GameConfig, Player, AttackType  } from "@transcendence/types";
import { World } from "../core";
import { CHARACTER_DATA } from "../factories";

export class CombatSystem{

	private tmpBulletDisplacement = new Vector(0, 0);
	private tmpAttackCenter = new Vector(0, 0);
	
	public updateCooldowns(player: Player, dt: number): void {
		const stats = CHARACTER_DATA[player.characterName];

		if (player.spellAttackCooldown < stats.COOLDOWN_SPELL_ATTACK) {
			player.spellAttackCooldown += dt;
		}

		if (player.meleeAttackCooldown < stats.COOLDOWN_MELEE_ATTACK) {
			player.meleeAttackCooldown += dt;
		}

		if (player.defenceAttackCooldown < stats.COOLDOWN_DEFENCE_ATTACK) {
			player.defenceAttackCooldown += dt;
		}
	}

	public handleSpellAttack(attacker: Player, gameWorld: World): void{

		this.calculateBulletDisplacement(attacker);
		this.calculateAttackImpactPoint(attacker, AttackType.SPELL_ATTACK);
		gameWorld.spawnBullet(attacker.entityId, attacker.characterName, attacker.teamId,
			this.tmpAttackCenter, this.tmpBulletDisplacement,
			attacker.spellAttackspeed, attacker.spellAttackHitboxRadius)
	}

	public handleMeleeAttack(attacker: Player, players: Map<string, Player>): void{
		
		const attackType: AttackType | undefined = attacker.attackType;
		if (!attackType) return;
		
		this.tmpAttackCenter.set(attacker.position.x, attacker.position.z);
		for (const target of players.values()){
			if (target.entityId === attacker.entityId || target.isDead) continue;
			if (this.isTargetInHitbox(target, attacker, this.tmpAttackCenter)){
				this.applyDamage(target, attacker, AttackType.MELEE_ATTACK);
			}
		}
	}
	
	public applyDamage(victim: Player | undefined, attacker: Player, attackType: AttackType): void{

		if (!victim) return ;

		if (victim.teamId === attacker.teamId || victim.isDefending) return ;

		if (attackType === AttackType.MELEE_ATTACK){
			victim.hp -= attacker.meleeAttackDamage;
			attacker.damage += attacker.meleeAttackDamage;
		}
		else if (attackType === AttackType.SPELL_ATTACK){
			victim.hp -= attacker.spellAttackDamage;
			attacker.damage += attacker.spellAttackDamage;
		}

		if (victim.hp <= 0){
			this.handleDeath(victim, attacker);
		}
	}

	private calculateBulletDisplacement(attacker: Player): void{

		const displacementX = Math.cos(attacker.rotation);
		const displacementZ = Math.sin(attacker.rotation);

		this.tmpBulletDisplacement.set(displacementX, displacementZ);
	}

	private isTargetInHitbox(victim: Player, attacker: Player, attackCenter: Vector): boolean{
		const dx = attackCenter.x - victim.position.x;
		const dz = attackCenter.z - victim.position.z;
		const distanceSquared = dx * dx + dz * dz;
		const radiiSum = victim.radius + attacker.meleeAttackHitboxRadius;
		if (distanceSquared <= radiiSum * radiiSum)
			return (true);
		return (false);
	}

	private handleDeath(victim: Player, attacker: Player){
		victim.isGhost = true;
		victim.isDead = true;
		victim.deads++;
		attacker.kill++;

		// da aggiungere, l achievement non vale in local o bot
		// if (isLocal() || isBot()) return ;
		if (attacker.hp <= (GameConfig.PLAYER.DEFAULT_HP * GameConfig.ACHIEVEMENT.CLUTCHMASTER)){
			attacker.clutchMasterUnlook = true;
		}
	}

	private calculateAttackImpactPoint(attacker: Player, attackType: AttackType | undefined): void{
		let attackDistance: number = 0;
		/* the attack isn t inside the player, is in front of it */
		if (attackType === AttackType.MELEE_ATTACK){
			attackDistance = attacker.radius + GameConfig.COMBAT.ATTACK_RANGE_OFFSET;
		}
		else{
			attackDistance = attacker.radius + GameConfig.COMBAT.SPELL_ATTACK_RANGE_OFFSET;
		}

		/* from the angle i take the position coordinate, to take the front of the player */
		const offsetX = Math.cos(attacker.rotation) * attackDistance;
		const offsetZ = Math.sin(attacker.rotation) * attackDistance;

		this.tmpAttackCenter.set(attacker.position.x + offsetX, attacker.position.z + offsetZ);
	}
}