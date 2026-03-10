"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpellAttackState = void 0;
const types_1 = require("@transcendence/types");
class SpellAttackState {
    constructor(combatSystem, gameWorld) {
        this.combatSystem = combatSystem;
        this.gameWorld = gameWorld;
        this.timer = 0;
        this.duration = types_1.GameConfig.COMBAT.ATTACK_VISUALIZATION;
        this.hasAttacked = false;
    }
    onEnter(player) {
        player.isAttacking = true;
        player.spellAttackCooldown = 0;
    }
    update(player, dt) {
        this.timer += dt;
        if (this.timer >= this.duration) {
            player.isAttacking = false;
            return (true);
        }
        if (!this.hasAttacked) {
            this.combatSystem.handleSpellAttack(player, this.gameWorld);
            this.hasAttacked = true;
        }
        return (false);
    }
}
exports.SpellAttackState = SpellAttackState;
