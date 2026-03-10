import { Player } from "@transcendence/types";
import { World } from "../../../core";
import { CombatSystem } from "../../../systems";
import { IPlayerState } from "../..";
export declare class SpellAttackState implements IPlayerState {
    private readonly combatSystem;
    private readonly gameWorld;
    private timer;
    private duration;
    private hasAttacked;
    constructor(combatSystem: CombatSystem, gameWorld: World);
    onEnter(player: Player): void;
    update(player: Player, dt: number): boolean;
}
//# sourceMappingURL=player.spellAttackState.d.ts.map