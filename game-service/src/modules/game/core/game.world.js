"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameWorld = exports.World = void 0;
const game_vector_1 = require("../utils/game.vector");
const types_1 = require("@transcendence/types");
Object.defineProperty(exports, "GameWorld", { enumerable: true, get: function () { return types_1.GameWorld; } });
class World {
    constructor(mapData) {
        this.mapData = mapData;
        this.bulletIndex = 0;
        this.MAX_BULLETS = 100;
        this.id = mapData.meta.name;
        this.width = mapData.settings.width;
        this.depth = mapData.settings.depth;
        this.position = new game_vector_1.Vector(0, 0);
        this.maxPlayers = mapData.settings.maxPlayers;
        this.walls = [];
        this.grid = [];
        this.bullets = [];
        this.spawnPoints = [];
        this.pillars = [];
        for (const spawn of mapData.spawn_points.values()) {
            this.spawnPoints.push(new game_vector_1.Vector(spawn.x, spawn.z));
        }
        for (let i = 0; i < this.MAX_BULLETS; i++) {
            this.bullets[i] = {
                entityId: `bullet-${i}`,
                teamId: -1,
                ownerId: '',
                characterName: types_1.CharacterName.ZEUS,
                speed: 0.0,
                radius: 0.0,
                position: new game_vector_1.Vector(0.0, 0.0),
                displacement: new game_vector_1.Vector(0.0, 0.0),
                lifeTime: types_1.GameConfig.COMBAT.BULLET_LIFE,
                hit: types_1.BulletHit.NONE,
                entityHit: undefined,
                isActive: false,
            };
        }
        this.walls = mapData.walls.map(wall => ({
            id: wall.id,
            position: new game_vector_1.Vector(wall.x, wall.z),
            width: wall.width,
            depth: wall.depth,
        }));
        this.pillars = mapData.pillars.map(pillar => ({
            id: pillar.id,
            position: new game_vector_1.Vector(pillar.x, pillar.z),
            radius: pillar.radius,
        }));
        /* ceil rounds a number up to the nearest whole integer, regardless of the decimal part */
        this.gridWidth = Math.ceil(this.width / types_1.GameConfig.MAP.CELL_SIZE);
        this.gridDepth = Math.ceil(this.depth / types_1.GameConfig.MAP.CELL_SIZE);
        this.buildGrid();
    }
    ;
    spawnBullet(ownerId, characherName, team, newPosition, newDisplacement, newSpeed, newRadius) {
        const bullet = this.bullets[this.bulletIndex];
        if (!bullet)
            return;
        bullet.isActive = true;
        bullet.teamId = team;
        bullet.ownerId = ownerId;
        bullet.characterName = characherName,
            bullet.position.set(newPosition.x, newPosition.z);
        bullet.displacement.set(newDisplacement.x, newDisplacement.z);
        bullet.speed = newSpeed;
        bullet.radius = newRadius;
        bullet.hit = types_1.BulletHit.NONE;
        bullet.entityHit = undefined;
        bullet.lifeTime = types_1.GameConfig.COMBAT.BULLET_LIFE;
        this.bulletIndex = (this.bulletIndex + 1) % this.MAX_BULLETS;
    }
    buildGrid() {
        /* Initialize a 1D array for efficient spatial partitioning (Flattened Grid).
            0 = Walkable floor (Safe)
            1 = Wall / Obstacle (Collision) */
        this.grid = new Array(this.gridWidth * this.gridDepth);
        this.grid.fill(0);
        for (let wall of this.walls.values()) {
            /* Convert world coordinates (meters) into grid indices.
                We determine the range of cells (Start -> End) covered by this wall.
                Formula: Index = floor(position / cellSize) => Bounding Box
                Subtracting 0.1 prevents selecting the next cell if the wall ends exactly on the border */
            const startCellX = Math.floor(wall.position.x / types_1.GameConfig.MAP.CELL_SIZE);
            const endCellX = Math.floor((wall.position.x + wall.width - 0.1) / types_1.GameConfig.MAP.CELL_SIZE);
            const startCellZ = Math.floor(wall.position.z / types_1.GameConfig.MAP.CELL_SIZE);
            const endCellZ = Math.floor((wall.position.z + wall.depth - 0.1) / types_1.GameConfig.MAP.CELL_SIZE);
            for (let z = startCellZ; z <= endCellZ; z++) {
                for (let x = startCellX; x <= endCellX; x++) {
                    if (x >= 0 && x < this.gridWidth && z >= 0 && z < this.gridDepth) {
                        let index = x + (z * this.gridWidth);
                        this.grid[index] = 1;
                    }
                }
            }
        }
    }
    isWallCollision(position, radius) {
        // Convert the entity's bounding box from world coordinates to grid cell indices
        const minCellX = Math.floor((position.x - radius) / types_1.GameConfig.MAP.CELL_SIZE);
        const maxCellX = Math.floor((position.x + radius) / types_1.GameConfig.MAP.CELL_SIZE);
        const minCellZ = Math.floor((position.z - radius) / types_1.GameConfig.MAP.CELL_SIZE);
        const maxCellZ = Math.floor((position.z + radius) / types_1.GameConfig.MAP.CELL_SIZE);
        // Iterate through all grid cells covered by the entity's bounding box
        for (let z = minCellZ; z <= maxCellZ; z++) {
            for (let x = minCellX; x <= maxCellX; x++) {
                // Ensure the cell is within the actual map boundaries
                if (x >= 0 && x < this.gridWidth && z >= 0 && z < this.gridDepth) {
                    // Check if the current cell is marked as a wall (1)
                    if (this.grid[x + (z * this.gridWidth)] === 1) {
                        // Find the point on the wall cell that is closest to the circle's center
                        const closest = this.getClosestPointOnCell(position, x, z);
                        // Calculate the distance vector between the center and the closest point
                        const dx = position.x - closest.x;
                        const dz = position.z - closest.z;
                        // Use the Pythagorean theorem (squared) to determine if the distance 
                        // is less than or equal to the radius
                        if ((dx * dx + dz * dz) <= radius * radius) {
                            return true; // Collision detected
                        }
                    }
                }
            }
        }
        return false; // No collision found in any nearby cell
    }
    getClosestPointOnCell(position, cellX, cellZ) {
        // Determine the world-space boundaries of the grid cell
        const wallLeft = cellX * types_1.GameConfig.MAP.CELL_SIZE;
        const wallRight = wallLeft + types_1.GameConfig.MAP.CELL_SIZE;
        const wallTop = cellZ * types_1.GameConfig.MAP.CELL_SIZE;
        const wallBottom = wallTop + types_1.GameConfig.MAP.CELL_SIZE;
        // Clamp the position coordinates to the cell's boundaries to find the closest point
        return {
            x: Math.max(wallLeft, Math.min(position.x, wallRight)),
            z: Math.max(wallTop, Math.min(position.z, wallBottom))
        };
    }
    getMaxPlayers() {
        return (this.maxPlayers);
    }
}
exports.World = World;
