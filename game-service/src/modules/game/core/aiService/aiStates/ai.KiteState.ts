import { IAiStates } from "../aiInterfaces/IAiStates";
import { Logger } from "@nestjs/common";
import { GameWorld } from '../../../game-interfaces';
import { Player, Vector,GameConfig, AttackType } from '@transcendence/types'
import { tacticsHelper } from "../ai.tactics.helper";
import { CHARACTER_DATA } from "src/modules/game/factories";
import { SpellAttackState } from "./ai.SpellAttackState";

export class KiteState implements IAiStates{
    logger: Logger = new Logger(KiteState.name);
    name: string = 'KiteState';
    private murderer: Player;
    private moveInput: Vector = new Vector(0, 0);

    constructor(murdererPlayer: Player){
        this.murderer = murdererPlayer;
    }

    onEnter(bot: Player): void {
    }

    update(bot: Player, gameWorld: GameWorld, allPlayers: Readonly<Map<string, Player>>, dt: number): IAiStates | undefined {
        const recommendedState: IAiStates = tacticsHelper(bot, this.murderer);
        if (recommendedState.name !== this.name){
            return recommendedState;
        }

        const dx: number = bot.position.x - this.murderer.position.x;
        const dz: number = bot.position.z - this.murderer.position.z;
        this.moveInput.set(dx, dz);
        this.moveInput.normalize();

        const distanceSq: number = (dx * dx) + (dz * dz);
        const spellDistanceSq = (GameConfig.COMBAT.BULLET_LIFE * bot.spellAttackspeed) * (GameConfig.COMBAT.BULLET_LIFE * bot.spellAttackspeed);

        const stats = CHARACTER_DATA[bot.characterName];

        if (bot.spellAttackCooldown >= stats.COOLDOWN_SPELL_ATTACK && distanceSq <= spellDistanceSq){
            return (new SpellAttackState(this.murderer));
        }

        bot.inputQueue.length = 0;
        bot.inputQueue.push({
            attackType: undefined,
            input: this.moveInput
        });

        return (undefined);
    }
    
    onExit(bot: Player): void {
    }
    
}