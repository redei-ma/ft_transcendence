"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefenceAttack = void 0;
const types_1 = require("@transcendence/types");
class DefenceAttack {
    constructor() {
        this.timer = 0;
        this.duration = types_1.GameConfig.COMBAT.DEFENCE_DURATION;
    }
    onEnter(player) {
        player.isDefending = true;
        player.defenceAttackCooldown = 0;
    }
    update(player, dt) {
        this.timer += dt;
        if (this.timer >= this.duration) {
            player.isDefending = false;
            return (true);
        }
        return (false);
    }
}
exports.DefenceAttack = DefenceAttack;
