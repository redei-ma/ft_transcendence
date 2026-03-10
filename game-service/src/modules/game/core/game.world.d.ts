import { Vector } from '../utils/game.vector';
import { Bullet, GameWorld, StaticEntity, Pillar, MapData, CharacterName } from "@transcendence/types";
export declare class World implements GameWorld {
    private readonly mapData;
    id: string;
    walls: StaticEntity[];
    pillars: Pillar[];
    grid: Array<number>;
    gridWidth: number;
    gridDepth: number;
    position: Vector;
    width: number;
    depth: number;
    bullets: Bullet[];
    spawnPoints: Vector[];
    private bulletIndex;
    readonly maxPlayers: number;
    readonly MAX_BULLETS: number;
    constructor(mapData: MapData);
    spawnBullet(ownerId: string, characherName: CharacterName, team: number, newPosition: Vector, newDisplacement: Vector, newSpeed: number, newRadius: number): void;
    private buildGrid;
    isWallCollision(position: Vector, radius: number): boolean;
    private getClosestPointOnCell;
    getMaxPlayers(): number;
}
export { GameWorld };
//# sourceMappingURL=game.world.d.ts.map