import { IAiStates } from "../aiInterfaces/IAiStates";
import { Logger } from "@nestjs/common";
import { GameWorld } from '../../../game-interfaces';
import { Player, GameConfig,Vector } from '@transcendence/types'
import { MeleeAttackState } from "./ai.MeleeAttackState";
import { SpellAttackState } from "./ai.SpellAttackState";
import { CHARACTER_DATA } from "src/modules/game/factories";
import { tacticsHelper } from "../ai.tactics.helper";

export class ChaseState implements IAiStates{
    logger: Logger = new Logger(ChaseState.name);
    name: string = 'ChaseState';
    private victim: Player;
    private moveInput: Vector = new Vector(0, 0);

    constructor(victimToKill: Player){
        this.victim = victimToKill;
    }

    onEnter(bot: Player): void {
        this.logger.debug('ai in chaseState')
    }

    update(bot: Player, gameWorld: GameWorld, allPlayers: Readonly<Map<string, Player>>, dt: number): IAiStates | undefined {

        const recommendedState: IAiStates = tacticsHelper(bot, this.victim);
        if (recommendedState.name !== this.name){
            return recommendedState;
        }

        const stats = CHARACTER_DATA[bot.characterName];

        const dx: number = this.victim.position.x - bot.position.x;
        const dz: number = this.victim.position.z - bot.position.z;

        const distanceSq = (dx * dx) + (dz * dz);
        const meleeDistanceSq = (bot.meleeAttackHitboxRadius + this.victim.radius) * (bot.meleeAttackHitboxRadius + this.victim.radius);
        if (distanceSq <= meleeDistanceSq && bot.meleeAttackCooldown >= stats.COOLDOWN_MELEE_ATTACK){
            return new MeleeAttackState(this.victim);
        }

        const spellDistanceSq = (GameConfig.COMBAT.BULLET_LIFE * bot.spellAttackspeed) * (GameConfig.COMBAT.BULLET_LIFE * bot.spellAttackspeed);

        if (distanceSq < spellDistanceSq && bot.spellAttackCooldown >= stats.COOLDOWN_SPELL_ATTACK){
            return new SpellAttackState(this.victim);
        }

        this.moveInput.set(dx, dz);
        this.moveInput.normalize();
        bot.inputQueue.length = 0;
        bot.inputQueue.push({
            attackType: undefined,
            input: this.moveInput,
        })
        return undefined;
    }

    onExit(bot: Player): void {
    }
    
}