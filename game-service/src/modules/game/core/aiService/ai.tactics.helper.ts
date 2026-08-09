import { Player, GameConfig, Bullet, Vector} from '@transcendence/types'
import { IAiStates } from './aiInterfaces';
import { ChaseState, KiteState, WanderState } from './aiStates';
import { World } from '../game.world';
import { CHARACTER_DATA } from '../../factories';


export function tacticsHelper(bot: Player, victim: Player): IAiStates{

    if (victim.isDead || victim.isGhost){
        return new WanderState();
    }

    //AGGIUNTO PER NON FARSI INSEGUIRE TROPPO DAL BOT
    const dx: number = victim.position.x - bot.position.x;
    const dz: number = victim.position.z - bot.position.z;
    const distanceSq: number = (dx * dx) + (dz * dz);
    if (distanceSq > GameConfig.BOT.VISUAL_RADIUS_SQ * 1.5) {
        return new WanderState();
    }

    if (bot.hp <= GameConfig.PLAYER.DEFAULT_HP / 2){
        return new KiteState(victim);
    }

    return new ChaseState(victim);
}

export function checkVisualForDefend(bot: Player, allPlayers: Readonly<Map<string, Player>>): Player | undefined{
    const stats = CHARACTER_DATA[bot.characterName];
    if (bot.defenceAttackCooldown < stats.COOLDOWN_DEFENCE_ATTACK) {
        return undefined;
    }

    let distanceSqRecord: number = Infinity;
    let murderer: Player | undefined = undefined;
    

    for (const targetPlayer of allPlayers.values()){
        if (targetPlayer.entityId !== bot.entityId && targetPlayer.teamId !== bot.teamId && targetPlayer.isAttacking){
            if (!targetPlayer.isDead && !targetPlayer.isGhost){
                const dx: number = targetPlayer.position.x - bot.position.x;
                const dz: number = targetPlayer.position.z - bot.position.z;
                const distanceSq: number = (dx * dx) + (dz * dz);
                if (distanceSq < GameConfig.BOT.MELEE_DANGER_ZONE){
                    if (distanceSq < distanceSqRecord){
                        distanceSqRecord = distanceSq;
                        murderer = targetPlayer;
                    }
                }
            }
        }
    }
    return (murderer);
}

export function checkVisualForAttack(bot: Player, allPlayers: Readonly<Map<string, Player>>): Player | undefined{
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

export function threatDetector(bot: Player, allPlayers: Map<string, Player>, gameWorld: World): Bullet | Player | undefined{

    for (const bullet of gameWorld.bullets){
        if (bot.teamId === bullet.teamId || !bullet.isActive) continue;

        const dx: number = bot.position.x - bullet.position.x;
        const dz: number = bot.position.z - bullet.position.z;

        const distanceSq: number = (dx * dx) + (dz * dz);
        if (distanceSq <= GameConfig.BOT.BULLET_DANGER_ZONE) {
            const dotProduct = (bullet.displacement.x * dx) + (bullet.displacement.z * dz);
            if (dotProduct > 0) {
                return bullet;
            }
        }
    }

    const murderer: Player | undefined = checkVisualForDefend(bot, allPlayers);
    if (murderer) return murderer;

    return undefined;
}

export function executePathMovement(bot: Player, path: Vector[], gameWorld: World): void {
    let moveInput = new Vector(0, 0);

    if (path.length === 0) {
        let dx = (gameWorld.width / 2) - bot.position.x;
        let dz = (gameWorld.depth / 2) - bot.position.z;
        moveInput.set(dx, dz);
    } 
    else {
        let targetPoint: Vector = path[0];
        let dx: number = targetPoint.x - bot.position.x;
        let dz: number = targetPoint.z - bot.position.z;

        const distanceSq: number = (dx * dx) + (dz * dz);
        if (distanceSq <= GameConfig.BOT.WAYPOINT_TOLERANCE_SQ) {
            path.shift();
            if (path.length === 0) {
                bot.inputQueue.length = 0;
                return;
            }
            targetPoint = path[0];
            dx = targetPoint.x - bot.position.x;
            dz = targetPoint.z - bot.position.z;
        }
        moveInput.set(dx, dz);
    }

    moveInput.normalize();
    bot.inputQueue.length = 0;
    bot.inputQueue.push({
        attackType: undefined,
        input: new Vector(moveInput.x, moveInput.z),
    });
}