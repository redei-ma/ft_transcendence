import { IAiStates } from "../aiInterfaces/IAiStates";
import { Logger } from "@nestjs/common";
import { Player, Vector, AttackType, GameConfig } from '@transcendence/types'
import { tacticsHelper } from "../ai.tactics.helper";
import { World } from "../../game.world";

export class MeleeAttackState implements IAiStates{
    logger: Logger = new Logger(MeleeAttackState.name);
    name: string = 'MeleeAttackState';

    private victim: Player;
    private moveInput: Vector = new Vector(0, 0);
    private hasStartedToAttack: boolean = false;
    private stuckTimer: number = 0.0;

    constructor(victimToKill: Player){
        this.victim = victimToKill;
    }

    onEnter(bot: Player): void {
        this.logger.debug('ai in meleeAttackState');

        const dx = this.victim.position.x - bot.position.x;
        const dz = this.victim.position.z - bot.position.z;

        this.moveInput.set(dx, dz);
        this.moveInput.normalize();

        bot.inputQueue.push({
            attackType: AttackType.MELEE_ATTACK,
            input: this.moveInput
        })
    }

    update(bot: Player, gameWorld: World, allPlayers: Readonly<Map<string, Player>>, dt: number): IAiStates | undefined {

        this.stuckTimer += dt;

        if (!this.hasStartedToAttack){
            if (bot.isAttacking){
                this.hasStartedToAttack = true;
                return undefined;
            }
        }

        if ((this.hasStartedToAttack && !bot.isAttacking) ||
            this.stuckTimer >= GameConfig.COMBAT.ATTACK_VISUALIZATION * 2){
                return tacticsHelper(bot, this.victim);
        }

        return undefined;
    }

    onExit(bot: Player): void {
    }
    
}