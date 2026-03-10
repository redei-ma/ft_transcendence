"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CombatSystem = void 0;
const types_1 = require("@transcendence/types");
const utils_1 = require("../utils");
const factories_1 = require("../factories");
class CombatSystem {
    constructor() {
        this.tmpBulletDisplacement = new utils_1.Vector(0, 0);
        this.tmpAttackCenter = new utils_1.Vector(0, 0);
    }
    updateCooldowns(player, dt) {
        const stats = factories_1.CHARACTER_DATA[player.characterName];
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
    handleSpellAttack(attacker, gameWorld) {
        this.calculateBulletDisplacement(attacker);
        this.calculateAttackImpactPoint(attacker, types_1.AttackType.SPELL_ATTACK);
        gameWorld.spawnBullet(attacker.entityId, attacker.characterName, attacker.teamId, this.tmpAttackCenter, this.tmpBulletDisplacement, attacker.spellAttackspeed, attacker.spellAttackHitboxRadius);
    }
    handleMeleeAttack(attacker, players) {
        const attackType = attacker.attackType;
        if (!attackType)
            return;
        this.tmpAttackCenter.set(attacker.position.x, attacker.position.z);
        for (const target of players.values()) {
            if (target.entityId === attacker.entityId || target.isDead)
                continue;
            if (this.isTargetInHitbox(target, attacker, this.tmpAttackCenter)) {
                this.applyDamage(target, attacker, types_1.AttackType.MELEE_ATTACK);
            }
        }
    }
    applyDamage(victim, attacker, attackType) {
        if (!victim)
            return;
        if (victim.teamId === attacker.teamId || victim.isDefending)
            return;
        if (attackType === types_1.AttackType.MELEE_ATTACK) {
            victim.hp -= attacker.meleeAttackDamage;
            attacker.damage += attacker.meleeAttackDamage;
        }
        else if (attackType === types_1.AttackType.SPELL_ATTACK) {
            victim.hp -= attacker.spellAttackDamage;
            attacker.damage += attacker.spellAttackDamage;
        }
        if (victim.hp <= 0) {
            this.handleDeath(victim, attacker);
        }
    }
    calculateBulletDisplacement(attacker) {
        const displacementX = Math.cos(attacker.rotation);
        const displacementZ = Math.sin(attacker.rotation);
        this.tmpBulletDisplacement.set(displacementX, displacementZ);
    }
    isTargetInHitbox(victim, attacker, attackCenter) {
        const dx = attackCenter.x - victim.position.x;
        const dz = attackCenter.z - victim.position.z;
        const distanceSquared = dx * dx + dz * dz;
        const radiiSum = victim.radius + attacker.meleeAttackHitboxRadius;
        if (distanceSquared <= radiiSum * radiiSum)
            return (true);
        return (false);
    }
    handleDeath(victim, attacker) {
        victim.isGhost = true;
        victim.isDead = true;
        victim.deads++;
        attacker.kill++;
        if (attacker.hp <= (types_1.GameConfig.PLAYER.DEFAULT_HP * types_1.GameConfig.ACHIEVEMENT.CLUTCHMASTER)) {
            attacker.clutchMasterUnlook = true;
        }
    }
    calculateAttackImpactPoint(attacker, attackType) {
        let attackDistance = 0;
        /* the attack isn t inside the player, is in front of it */
        if (attackType === types_1.AttackType.MELEE_ATTACK) {
            attackDistance = attacker.radius + types_1.GameConfig.COMBAT.ATTACK_RANGE_OFFSET;
        }
        else {
            attackDistance = attacker.radius + types_1.GameConfig.COMBAT.SPELL_ATTACK_RANGE_OFFSET;
        }
        /* from the angle i take the position coordinate, to take the front of the player */
        const offsetX = Math.cos(attacker.rotation) * attackDistance;
        const offsetZ = Math.sin(attacker.rotation) * attackDistance;
        this.tmpAttackCenter.set(attacker.position.x + offsetX, attacker.position.z + offsetZ);
    }
}
exports.CombatSystem = CombatSystem;
