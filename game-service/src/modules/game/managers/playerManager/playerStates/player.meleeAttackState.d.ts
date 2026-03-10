import { Player } from "@transcendence/types";
import { CombatSystem } from "../../../systems";
import { IPlayerState } from "../..";
export declare class MeleeAttackState implements IPlayerState {
    private readonly combatSystem;
    private readonly players;
    private timer;
    private duration;
    private hasAttacked;
    constructor(combatSystem: CombatSystem, players: Map<string, Player>);
    onEnter(player: Player): void;
    update(player: Player, dt: number): boolean;
}
//# sourceMappingURL=player.meleeAttackState.d.ts.map