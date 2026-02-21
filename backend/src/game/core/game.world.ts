import { Vector } from '../utils/game.vector';
import { GameConfig } from "../configs/game.config";
import { BulletHit, Bullet, GameWorld, StaticEntity, Pillar, MapData, CharacterName } from '../interfaces-enums';

export class World implements GameWorld{
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
	private bulletIndex: number = 0;
	public readonly maxPlayers: number;
	public readonly MAX_BULLETS: number = 100;

	constructor(private readonly mapData: MapData){
		this.id = mapData.meta.name;
		this.width = mapData.settings.width;
		this.depth = mapData.settings.depth;
		this.position = new Vector(0, 0);
		this.maxPlayers = mapData.settings.maxPlayers;
		this.walls = [];
		this.grid = [];
		this.bullets = [];
		this.spawnPoints = [];
		this.pillars = [];
		for (const spawn of mapData.spawn_points.values()){
			this.spawnPoints.push(new Vector(spawn.x, spawn.z));
		}

		for (let i = 0; i < this.MAX_BULLETS; i++){
			this.bullets[i] = {
				entityId: `bullet-${i}`,
				teamId: -1,
				ownerId: '',
				characterName: CharacterName.DEFAULT,
				speed: 0.0,
				radius: 0.0,
				position: new Vector(0.0, 0.0),
				displacement: new Vector (0.0, 0.0),
				lifeTime: GameConfig.COMBAT.BULLET_LIFE,
				hit: BulletHit.NONE,
				entityHit: undefined,
				isActive: false,
			}
		}

		this.walls = mapData.walls.map(wall => ({
			id: wall.id,
			position: new Vector(wall.x, wall.z),
			width: wall.width,
			depth: wall.depth,
		}));

		this.pillars = mapData.pillars.map(pillar =>({
			id: pillar.id,
			position: new Vector(pillar.x, pillar.z),
			radius: pillar.radius,
		}));

		/* ceil rounds a number up to the nearest whole integer, regardless of the decimal part */
		this.gridWidth = Math.ceil(this.width / GameConfig.MAP.CELL_SIZE);
		this.gridDepth = Math.ceil(this.depth / GameConfig.MAP.CELL_SIZE);

		this.buildGrid();
	};

	public spawnBullet(ownerId: string, characherName: CharacterName, team: number, newPosition: Vector,
		newDisplacement:Vector, newSpeed: number, newRadius: number): void{
			
		const bullet = this.bullets[this.bulletIndex];
		if (!bullet) return ;

		bullet.isActive = true;
		bullet.teamId = team;
		bullet.ownerId = ownerId;
		bullet.characterName = characherName,
		bullet.position.set(newPosition.x, newPosition.z);
		bullet.displacement.set(newDisplacement.x, newDisplacement.z);
		bullet.speed = newSpeed;
		bullet.radius = newRadius;
		bullet.hit = BulletHit.NONE;
		bullet.entityHit = undefined;
		bullet.lifeTime = GameConfig.COMBAT.BULLET_LIFE;

		this.bulletIndex = (this.bulletIndex + 1) % this.MAX_BULLETS;
	}

	private buildGrid(): void{
		/* Initialize a 1D array for efficient spatial partitioning (Flattened Grid).
			0 = Walkable floor (Safe)
			1 = Wall / Obstacle (Collision) */
		this.grid = new Array<number>(this.gridWidth * this.gridDepth);

		this.grid.fill(0);
		for (let wall of this.walls.values()){
			/* Convert world coordinates (meters) into grid indices.
				We determine the range of cells (Start -> End) covered by this wall. 
				Formula: Index = floor(Posizione / DimensioneCella) => Bounding Box 
				Subtracting 0.1 prevents selecting the next cell if the wall ends exactly on the border */
			const startCellX: number = Math.floor(wall.position.x / GameConfig.MAP.CELL_SIZE);
			const endCellX: number = Math.floor((wall.position.x + wall.width - 0.1) / GameConfig.MAP.CELL_SIZE);
			const startCellZ: number = Math.floor(wall.position.z / GameConfig.MAP.CELL_SIZE);
			const endCellZ: number = Math.floor((wall.position.z + wall.depth - 0.1) / GameConfig.MAP.CELL_SIZE);

			for (let z: number = startCellZ; z <= endCellZ; z++){
				for (let x: number = startCellX; x <= endCellX; x++){
					if (x >= 0 && x < this.gridWidth && z >= 0 && z < this.gridDepth){
						let index = x + (z * this.gridWidth);
						this.grid[index] = 1;
					}
				}
			}
		}
	}

	isWallCollision(position: Vector, radius: number): boolean{

		/* the player isn t a point, but an entity with a radius, i write a rectangle to check all the cell that include the player */
		let minCellX = Math.floor((position.x - radius) / GameConfig.MAP.CELL_SIZE);
		let maxCellX = Math.floor((position.x + radius) / GameConfig.MAP.CELL_SIZE);

		let minCellZ = Math.floor((position.z - radius) / GameConfig.MAP.CELL_SIZE);
		let maxCellZ = Math.floor((position.z + radius) / GameConfig.MAP.CELL_SIZE);

		for (let z = minCellZ; z <= maxCellZ; z++){
			for(let x = minCellX; x <= maxCellX; x++){
				if (x >= 0 && x < this.gridWidth && z >= 0 && z < this.gridDepth){
					let index = x + (z * this.gridWidth);
						if (this.grid[index] == 1){
						/* Thanks to the grid I can calculate the ends of the wall and calculate collisions precisely */
						let wallLeft = x * GameConfig.MAP.CELL_SIZE;
						let wallRight = wallLeft +  GameConfig.MAP.CELL_SIZE;
						let wallTop = z * GameConfig.MAP.CELL_SIZE;
						let wallBottom = wallTop + GameConfig.MAP.CELL_SIZE;

						/* I use clamping to force the player's position between the ends of the walls */
						const closestX = Math.max(wallLeft, Math.min(position.x, wallRight));
						const closestZ = Math.max(wallTop, Math.min(position.z, wallBottom));

						/* I use the Pythagorean theorem, but without using the square root, which is slow for the PC */
						let dx = position.x - closestX;
						let dz = position.z - closestZ;
						let distanceSquared = dx * dx + dz * dz;
						if (distanceSquared <= radius * radius)
							return (true);
					}
				}
			}
		}
		return (false);
	}

	getMaxPlayers(): number{
		return (this.maxPlayers);
	}
}