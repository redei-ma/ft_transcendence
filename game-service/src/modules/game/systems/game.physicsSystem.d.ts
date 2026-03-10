import { World } from "../core";
import { Vector, Bullet, Player } from "@transcendence/types";
export declare class PhysicsSystem {
    private readonly recicleVector;
    calculateBulletPhysics(bullet: Bullet, players: Map<string, Player>, gameWorld: World, dt: number): void;
    private isVictimHit;
    calculatePhysics(entity: Player, players: Map<string, Player>, gameWorld: World, dt: number): void;
    isPillarCollision(entityPosition: Vector, entityRadius: number, gameWorld: World): boolean;
    isPlayerCollision(moverId: string, moverPosition: Vector, moverRadius: number, players: Iterable<Player>): Player | undefined;
    private isEnvironmentCollision;
}
//# sourceMappingURL=game.physicsSystem.d.ts.map