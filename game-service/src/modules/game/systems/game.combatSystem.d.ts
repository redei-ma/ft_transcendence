import { Player, AttackType } from "@transcendence/types";
import { World } from "../core";
export declare class CombatSystem {
    private tmpBulletDisplacement;
    private tmpAttackCenter;
    updateCooldowns(player: Player, dt: number): void;
    handleSpellAttack(attacker: Player, gameWorld: World): void;
    handleMeleeAttack(attacker: Player, players: Map<string, Player>): void;
    applyDamage(victim: Player | undefined, attacker: Player, attackType: AttackType): void;
    private calculateBulletDisplacement;
    private isTargetInHitbox;
    private handleDeath;
    private calculateAttackImpactPoint;
}
//# sourceMappingURL=game.combatSystem.d.ts.map