import { CombatSystem, PhysicsSystem } from "../../systems";
import { World } from "../../core";
import { Player } from "@transcendence/types";
export declare class PlayerManager {
    private readonly physicsSystem;
    private readonly combatSystem;
    constructor(physicsSystem: PhysicsSystem, combatSystem: CombatSystem);
    updateAllPlayers(players: Map<string, Player>, gameWorld: World, dt: number): void;
    private playerRoutine;
    updateSinglePlayer(player: Player, gameWorld: World, players: Map<string, Player>, dt: number): void;
    private applyMovement;
    private respawnPlayer;
    private updateAttackState;
}
//# sourceMappingURL=player.manager.d.ts.map