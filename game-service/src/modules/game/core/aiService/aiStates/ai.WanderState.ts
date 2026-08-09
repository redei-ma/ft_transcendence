import { IAiStates } from "../aiInterfaces/IAiStates";
import { Logger } from "@nestjs/common";
import { GameWorld } from '../../../game-interfaces';
import { Player, Vector,GameConfig } from '@transcendence/types'
import { ChaseState } from "./ai.ChaseState";
import { World } from "../../game.world";
import { PathFinder } from "../pathFinder/ai.PathFinder";
import { checkVisualForAttack, executePathMovement } from "../ai.tactics.helper";

export class WanderState implements IAiStates{
    private readonly logger: Logger = new Logger(WanderState.name);
    name: string = 'WanderState';

    private targetPosition: Vector = new Vector(0, 0);
    private moveInput: Vector = new Vector(0, 0);

    private hasTarget: boolean = false;

    private path: Vector[] = [];
    private pathTimer: number = 0.0;

	constructor() {}

	onEnter(bot: Player): void {
        this.logger.debug('ai in wander mode');
    }

    update(bot: Player, gameWorld: World, allPlayers: Readonly<Map<string, Player>>, dt: number): IAiStates | undefined {

		this.pathTimer += dt;
		if (this.pathTimer >= GameConfig.BOT.MAX_PATH_TIME){
			this.findTargetPosition(gameWorld, bot);
			this.path = PathFinder.findPath(bot.position, this.targetPosition, gameWorld);
			this.pathTimer = 0.0;
		}

		let victim: Player | undefined = checkVisualForAttack(bot, allPlayers);

        if (victim){
			return (new ChaseState(victim));
        }

        if (!this.hasTarget){
			this.findTargetPosition(gameWorld, bot);
			this.path = PathFinder.findPath(bot.position, this.targetPosition, gameWorld);
        }

		executePathMovement(bot, this.path, gameWorld);
        if (this.path.length === 0) {
            this.hasTarget = false;
        }
        return undefined;
    }

	private findTargetPosition(gameWorld: World, bot: Player){
		this.hasTarget = true;
        const margin: number = 5;
		let isAGoodStreet: boolean = false;
		let targetX: number = 0;
		let targetZ: number = 0;

        let attempts = 0;
        const maxAttempts = 10; 
        
		while (!isAGoodStreet && attempts < maxAttempts){
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 20;
            targetX = bot.position.x + Math.cos(angle) * distance;
            targetZ = bot.position.z + Math.sin(angle) * distance;

            targetX = Math.max(margin, Math.min(gameWorld.width - margin, targetX));
            targetZ = Math.max(margin, Math.min(gameWorld.depth - margin, targetZ));

			let gridX = Math.floor(targetX / GameConfig.MAP.CELL_SIZE);
			let gridZ = Math.floor(targetZ / GameConfig.MAP.CELL_SIZE);

			if (gridX < 0 || gridX >= gameWorld.gridWidth || gridZ < 0 || gridZ >= gameWorld.gridDepth) {
                attempts++;
                continue;
            }

			const index = gridX + (gridZ * gameWorld.gridWidth);
			if (gameWorld.grid[index] === 0) {
				isAGoodStreet = true;
            }
            attempts++;
		}

        if (!isAGoodStreet) {
             targetX = gameWorld.width / 2;
             targetZ = gameWorld.depth / 2;
        }

        this.targetPosition.set(targetX, targetZ);
	}
    
    onExit(bot: Player): void {
    }

}