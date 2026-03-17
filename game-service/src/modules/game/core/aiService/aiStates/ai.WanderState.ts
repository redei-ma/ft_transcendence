import { IAiStates } from "../aiInterfaces/IAiStates";
import { Logger } from "@nestjs/common";
import { GameWorld } from '../../../game-interfaces';
import { Player, Vector } from '@transcendence/types'

export class WanderState implements IAiStates{
    logger: Logger = new Logger(WanderState.name);
    name: string = 'WanderState';

    private targetPosition: Vector = new Vector(0, 0);
    private moveInput: Vector = new Vector(0, 0);

    private stuckTimer: number = 0.0;
    private hasTarget: boolean = false;
    onEnter(bot: Player): void {
        this.logger.debug('ai in wander mode');
        this.hasTarget = false;
    }

    update(bot: Player, gameWorld: GameWorld, allPlayers: Readonly<Map<string, Player>>, dt: number): IAiStates | undefined {

        this.stuckTimer += dt;

        if (!this.hasTarget){
            this.hasTarget = true;
            const margin: number = 5;

            this.targetPosition.set(margin + (Math.random() * (gameWorld.width - margin * 2)),
                margin + Math.random() * (gameWorld.depth - margin * 2))
        }
        const dirX = this.targetPosition.x - bot.position.x;
        const dirZ = this.targetPosition.z - bot.position.z;

        this.moveInput.set(dirX, dirZ);

        if (this.moveInput.lengthSq() < 9.0 || this.stuckTimer >= 4.0){
            this.hasTarget = false;
            this.stuckTimer = 0.0;
            return undefined;
        }

        this.moveInput.normalize();
        bot.inputQueue.push({
            attackType: undefined,
            input: this.moveInput,
        })

        return undefined;
    }

    onExit(bot: Player): void {
        this.hasTarget = false;
        this.stuckTimer = 0.0;
    }
    
}