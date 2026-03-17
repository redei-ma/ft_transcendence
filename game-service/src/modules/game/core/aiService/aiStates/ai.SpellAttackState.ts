import { IAiStates } from "../aiInterfaces/IAiStates";
import { Logger } from "@nestjs/common";
import { GameWorld } from '../../../game-interfaces';
import { Player, Vector, AttackType } from '@transcendence/types'
import { ChaseState } from "./ai.ChaseState";

export class SpellAttackState implements IAiStates{

    logger: Logger = new Logger(SpellAttackState.name);
    name: string = 'SpellAttackState';

    private victim: Player;
    private moveInput: Vector = new Vector(0, 0);
    private hasStartedToAttack: boolean = false;
    private stuckTimer: number = 0.0;

    constructor(victimToKill: Player){
        this.victim = victimToKill;
    }

    onEnter(bot: Player): void {
        this.logger.debug('ai in spellAttackState');

        const dx = this.victim.position.x - bot.position.x;
        const dz = this.victim.position.z - bot.position.z;

        this.moveInput.set(dx, dz);
        this.moveInput.normalize();

        bot.inputQueue.push({
            attackType: AttackType.SPELL_ATTACK,
            input: this.moveInput
        })
    }

    update(bot: Player, gameWorld: GameWorld, allPlayers: Readonly<Map<string, Player>>, dt: number): IAiStates | undefined {

        this.stuckTimer += dt;

        if (!this.hasStartedToAttack){
            if (bot.isAttacking){
                this.hasStartedToAttack = true;
                return undefined;
            }
        }

        if (this.hasStartedToAttack && !bot.isAttacking)
            return (new ChaseState(this.victim));

        if (this.stuckTimer >= 2.5)
            return (new ChaseState(this.victim));

        return undefined;
    }

    onExit(bot: Player): void {
    }
    
}