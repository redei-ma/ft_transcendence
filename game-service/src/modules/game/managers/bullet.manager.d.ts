import { World } from "../core";
import { CombatSystem, PhysicsSystem } from "../systems";
import { Player } from "@transcendence/types";
export declare class BulletManager {
    private readonly physicsSystem;
    private readonly combatSystem;
    constructor(physicsSystem: PhysicsSystem, combatSystem: CombatSystem);
    updateBullets(dt: number, gameWorld: World, players: Map<string, Player>): void;
}
//# sourceMappingURL=bullet.manager.d.ts.map