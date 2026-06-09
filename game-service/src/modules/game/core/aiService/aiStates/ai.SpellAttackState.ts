import { IAiStates } from "../aiInterfaces/IAiStates";
import { Logger } from "@nestjs/common";
import { Player, Vector, AttackType, GameConfig } from '@transcendence/types'
import { tacticsHelper } from "../ai.tactics.helper";
import { World } from "../../game.world";

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
        let dx: number = this.victim.position.x - bot.position.x;
        let dz: number = this.victim.position.z - bot.position.z;
        const distance = Math.sqrt((dx * dx) + (dz * dz));

        const timeToHit = distance / bot.spellAttackspeed;
        
        const predX = this.victim.position.x + (this.victim.displacement.x * this.victim.speed * timeToHit);
        const predZ = this.victim.position.z + (this.victim.displacement.z * this.victim.speed * timeToHit);
        
        dx = predX - bot.position.x;
        dz = predZ - bot.position.z;

        const baseAngle: number = Math.atan2(dz, dx);

        const maxSpreadRadiants: number = GameConfig.BOT.SPELL_AIM_SPREAD_DEG * (Math.PI / 180);
        const randomSpread: number = (Math.random() - 0.5) * 2 * maxSpreadRadiants;
        const finalAngle: number = baseAngle + randomSpread;

        const inputX = Math.cos(finalAngle);
        const inputZ = Math.sin(finalAngle);

        this.moveInput.set(inputX, inputZ);
        this.moveInput.normalize();

        bot.inputQueue.push({
            attackType: AttackType.SPELL_ATTACK,
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