import { Player, GameConfig, Bullet } from '@transcendence/types'
import { IAiStates } from './aiInterfaces';
import { ChaseState, KiteState, WanderState } from './aiStates';
import { World } from '../game.world';


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

        const dx: number = bullet.position.x - bot.position.x;
        const dz: number = bullet.position.z - bot.position.z;

        const distanceSq: number = (dx * dx) + (dz * dz);
        if (distanceSq <= GameConfig.BOT.BULLET_DANGER_ZONE)
            return bullet;
    }

    const murderer: Player | undefined = checkVisualForDefend(bot, allPlayers);
    if (murderer) return murderer;

    return undefined;
}