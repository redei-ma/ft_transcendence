import { IAiStates } from "../aiInterfaces/IAiStates";
import { Logger } from "@nestjs/common";
import { GameWorld } from '../../../game-interfaces';
import { Player, Vector,GameConfig } from '@transcendence/types'
import { ChaseState } from "./ai.ChaseState";
import { World } from "../../game.world";
import { PathFinder } from "../pathFinder/ai.PathFinder";
import { checkVisualForAttack } from "../ai.tactics.helper";

export class WanderState implements IAiStates{
    logger: Logger = new Logger(WanderState.name);
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
			this.findTargetPosition(gameWorld);
			this.path = PathFinder.findPath(bot.position, this.targetPosition, gameWorld);
			this.pathTimer = 0.0;
		}

		let victim: Player | undefined = checkVisualForAttack(bot, allPlayers);

        if (victim){
			return (new ChaseState(victim));
        }

        if (!this.hasTarget){
			this.findTargetPosition(gameWorld);
			this.path = PathFinder.findPath(bot.position, this.targetPosition, gameWorld);
        }

		this.moveToPath(bot);
        return undefined;
    }

    private moveToPath(bot: Player){
        if (this.path.length === 0){
            this.moveInput.set(0, 0);
        }
        else{
            let targetPoint: Vector = this.path[0];
            let dx: number = targetPoint.x - bot.position.x;
            let dz: number = targetPoint.z - bot.position.z;

            const distanceSq: number = (dx * dx) + (dz * dz);
            if (distanceSq <= GameConfig.BOT.WAYPOINT_TOLERANCE_SQ){
                this.path.shift();
                if (this.path.length === 0) {
                    bot.inputQueue.length = 0;
					this.hasTarget = false;
                    return;
                }
                targetPoint = this.path[0];
                dx = targetPoint.x - bot.position.x;
                dz = targetPoint.z - bot.position.z;
            }
            this.moveInput.set(dx, dz);
        }

        this.moveInput.normalize();
        bot.inputQueue.length = 0;
        bot.inputQueue.push({
            attackType: undefined,
            input: new Vector(this.moveInput.x, this.moveInput.z),
        })
    }

	private findTargetPosition(gameWorld: World){
		this.hasTarget = true;
        const margin: number = 5;
		let isAGoodStreet: boolean = false;
		let targetX: number = 0;
		let targetZ: number = 0;

		while (!isAGoodStreet){
			targetX = margin + (Math.random() * (gameWorld.width - margin * 2));
			targetZ = margin + Math.random() * (gameWorld.depth - margin * 2);

			let gridX = Math.floor(targetX / GameConfig.MAP.CELL_SIZE);
			let gridZ = Math.floor(targetZ / GameConfig.MAP.CELL_SIZE);

			if (gridX < 0 || gridX >= gameWorld.gridWidth || gridZ < 0 || gridZ >= gameWorld.gridDepth) continue;
			const index = gridX + (gridZ * gameWorld.gridWidth);
			if (gameWorld.pathFindingGrid[index] === 0)
				isAGoodStreet = true;
		}
        this.targetPosition.set(targetX, targetZ);
	}
    
    onExit(bot: Player): void {
    }

}