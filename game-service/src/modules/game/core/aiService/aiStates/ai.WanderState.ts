import { IAiStates } from "../aiInterfaces/IAiStates";
import { Logger } from "@nestjs/common";
import { GameWorld } from '../../../game-interfaces';
import { Player, Vector,GameConfig } from '@transcendence/types'
import { ChaseState } from "./ai.ChaseState";

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

    private checkVisualForAttack(bot: Player, allPlayers: Readonly<Map<string, Player>>): Player | undefined{
        let distanceSqRecord: number = Infinity;
        let victim: Player | undefined = undefined;
        for (const targetPlayer of allPlayers.values()){
            if (targetPlayer.entityId !== bot.entityId && targetPlayer.teamId !== bot.teamId){

                if (!targetPlayer.isDead && !targetPlayer.isGhost){
                    const dx: number = targetPlayer.position.x - bot.position.x;
                    const dz: number = targetPlayer.position.z - bot.position.z;

                    const distanceSq: number = (dx * dx) + (dz * dz);
                    if (distanceSq < GameConfig.BOT.VISUAL_RADIUS_SQ){
                        if (distanceSq < distanceSqRecord){
                            distanceSqRecord = distanceSq;
                            victim = targetPlayer;
                        }
                    }
                }
            }
        }
        return (victim);
    }

    update(bot: Player, gameWorld: GameWorld, allPlayers: Readonly<Map<string, Player>>, dt: number): IAiStates | undefined {

        let victim: Player | undefined = this.checkVisualForAttack(bot, allPlayers);

        if (victim){
            return (new ChaseState(victim));
        }

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

        if (this.moveInput.lengthSq() < GameConfig.BOT.WAYPOINT_TOLERANCE_SQ || this.stuckTimer >= GameConfig.BOT.WANDER_STUCK_TIMER){
            this.hasTarget = false;
            this.stuckTimer = 0.0;
            return undefined;
        }

        this.moveInput.normalize();
        bot.inputQueue.length = 0;
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