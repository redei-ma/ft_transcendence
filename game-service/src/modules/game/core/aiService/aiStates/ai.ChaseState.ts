import { IAiStates } from "../aiInterfaces/IAiStates";
import { Logger } from "@nestjs/common";
import { GameWorld } from '../../../game-interfaces';
import { Player, GameConfig,Vector } from '@transcendence/types'
import { MeleeAttackState } from "./ai.MeleeAttackState";
import { SpellAttackState } from "./ai.SpellAttackState";
import { CHARACTER_DATA } from "src/modules/game/factories";
import { executePathMovement, tacticsHelper } from "../ai.tactics.helper";
import { PathFinder } from "../pathFinder/ai.PathFinder";
import { World } from "../../game.world";

export class ChaseState implements IAiStates{
    logger: Logger = new Logger(ChaseState.name);
    name: string = 'ChaseState';
    private victim: Player;
    private path: Vector[] = [];
    private pathTimer: number = 0.0;

    constructor(victimToKill: Player){
        this.victim = victimToKill;
    }

    onEnter(bot: Player, gameWorld: World): void {
        this.logger.debug('ai in chaseState')

        this.path = PathFinder.findPath(bot.position, this.victim.position, gameWorld);
    }

    update(bot: Player, gameWorld: World, allPlayers: Readonly<Map<string, Player>>, dt: number): IAiStates | undefined {
        
        const recommendedState: IAiStates = tacticsHelper(bot, this.victim);
        if (recommendedState.name !== this.name){
            this.pathTimer = 0;
            return recommendedState;
        }

        this.pathTimer += dt;

        if (this.pathTimer >= GameConfig.BOT.MAX_PATH_TIME){
            this.path = PathFinder.findPath(bot.position, this.victim.position, gameWorld);
            this.pathTimer = 0;
        }

        const attackState: IAiStates | undefined = this.tryToAttack(bot);
        if (attackState){
            this.pathTimer = 0;
            return attackState;
        }

        executePathMovement(bot, this.path, gameWorld);
        return undefined;
    }

    private tryToAttack(bot: Player): IAiStates | undefined{
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

        return undefined;
    }

    onExit(bot: Player): void {
    }
    
}