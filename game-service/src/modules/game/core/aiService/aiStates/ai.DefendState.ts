import { IAiStates } from "../aiInterfaces/IAiStates";
import { Logger } from "@nestjs/common";
import { Player, Bullet, Vector, AttackType, GameConfig } from '@transcendence/types'
import { World } from "../../game.world";
import { CHARACTER_DATA } from "src/modules/game/factories";
import { tacticsHelper } from "../ai.tactics.helper";
import { WanderState } from "./ai.WanderState";

export class DefendState implements IAiStates{
    logger: Logger = new Logger(DefendState.name);
    name: string = 'DefendState';
    private threat: Player | Bullet;
    private hasStartedToDefend: boolean = false;
    private stuckTimer: number = 0.0;
    private moveInput: Vector = new Vector(0, 0);
    private lastDistanceSq: number = Infinity;

    constructor(threatDetected: Player | Bullet){
        this.threat = threatDetected;
    }

    onEnter(bot: Player): void {
        this.logger.debug('bot in defend mode');
    }

    update(bot: Player, gameWorld: World, allPlayers: Readonly<Map<string, Player>>, dt: number): IAiStates | undefined {
        this.stuckTimer += dt;
        const dx: number = bot.position.x - this.threat.position.x;
        const dz: number = bot.position.z - this.threat.position.z;
        const stats = CHARACTER_DATA[bot.characterName];
        bot.inputQueue.length = 0;

        if ('isAttacking' in this.threat){
            if (!this.hasStartedToDefend && bot.isDefending) {
                this.hasStartedToDefend = true;
            }
            if ((this.hasStartedToDefend && !bot.isDefending) || this.stuckTimer >= GameConfig.COMBAT.DEFENCE_DURATION * 2) {
                return tacticsHelper(bot, this.threat);
            }
            this.handlePlayerDefend(bot, stats, dx, dz);
        }
        else{
            // is a bullet
            const newState = this.handleBulletDefend(bot, stats, dx, dz);
            if (newState) {
                return newState;
            }
        }
        return undefined;
    }

    private handlePlayerDefend(bot: Player, stats, dx, dz){
        this.moveInput.set(dx, dz);
        this.moveInput.normalize();
        if (bot.defenceAttackCooldown >= stats.COOLDOWN_DEFENCE_ATTACK){
            bot.inputQueue.push({
                attackType: AttackType.DEFENCE_ATTACK,
                input: this.moveInput,
            })
        }
        else{
            bot.inputQueue.push({
                attackType: undefined,
                input: this.moveInput,
            })
        }
    }

    private handleBulletDefend(bot: Player, stats, dx: number, dz: number){
        const distanceSq: number = (dx * dx) + (dz * dz);
        const threatBullet = this.threat as Bullet;

        if (!threatBullet || !threatBullet.isActive || distanceSq > GameConfig.BOT.BULLET_DANGER_ZONE ||
            this.stuckTimer >= 2.0 || distanceSq > this.lastDistanceSq) { 
            return new WanderState();
        }

        this.moveInput.set(-dz, dx);
        this.moveInput.normalize();
        this.lastDistanceSq = distanceSq;

		if (bot.defenceAttackCooldown >= stats.COOLDOWN_DEFENCE_ATTACK) {
            bot.inputQueue.push({
                attackType: AttackType.DEFENCE_ATTACK,
                input: new Vector(this.moveInput.x, this.moveInput.z),
            });
        } else {
            bot.inputQueue.push({
                attackType: undefined,
                input: new Vector(this.moveInput.x, this.moveInput.z),
            });
        }
        return (undefined);
    }
    
    onExit(bot: Player): void {
        
    }

}