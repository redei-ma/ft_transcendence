import { World } from "../core";
import { Vector, Player, MatchType, CharacterName, GameConfig } from "@transcendence/types";
import { CharacherStats } from "../game-interfaces";

export const CHARACTER_DATA: Record<CharacterName, CharacherStats> = {
	[CharacterName.ZEUS]: {
		MELEE_DAMAGE: 15.0,
		SPELL_DAMAGE: 100.0,
		SPELL_SPEED: 40.0,
		COOLDOWN_MELEE_ATTACK: 0.8,
		COOLDOWN_SPELL_ATTACK: 1.5,
		COOLDOWN_DEFENCE_ATTACK: 5.0,
	},
	[CharacterName.ADE]: {
		MELEE_DAMAGE: 15.0,
		SPELL_DAMAGE: 100.0,
		SPELL_SPEED: 40.0,
		COOLDOWN_MELEE_ATTACK: 1.2,
		COOLDOWN_SPELL_ATTACK: 1.0,
		COOLDOWN_DEFENCE_ATTACK: 6.0,
	}
}

function calculateTeamId(spawnIndex: number, matchType: MatchType): number{

	switch(matchType){
		case MatchType.FFA:{
			return spawnIndex;
		}
		case MatchType.TEAM:{
			return Math.floor( spawnIndex / GameConfig.MATCH.DEFAULT_PLAYERS_FOR_TEAM)
		}
		default:
			return 0;
	}
}

/* returns a player, if there is a position is modified else default position */
export function getNewPlayer(
	world: World, socketId: string | undefined, spawnIndex: number,
	characterName: CharacterName, userDbId: number | null, entityId: string,
	isBot: boolean, playerIndex: number | undefined,
	matchType: MatchType): Player{

	const teamId: number = calculateTeamId(spawnIndex, matchType);	
	const character = (characterName in CHARACTER_DATA) ? characterName : CharacterName.ZEUS;

	const stats = CHARACTER_DATA[character];

	return {
			type: 'player',
			teamId: teamId,
			characterName: characterName,
			userDbId: userDbId,
			socketId: socketId,
			entityId: entityId,
			position: new Vector(world.spawnPoints[spawnIndex].x, world.spawnPoints[spawnIndex].z),
			displacement: new Vector( 0 , 0 ),
			radius: GameConfig.PLAYER.RADIUS,
			spawnIndex: spawnIndex,
			playerIndex: playerIndex || 0,
			rotation: 0.0,
			speed: GameConfig.PLAYER.SPEED,
			hp: GameConfig.PLAYER.DEFAULT_HP,
			kill: 0.0,
			deads: 0.0,
			damage: 0.0,
			meleeAttackCooldown: stats.COOLDOWN_MELEE_ATTACK,
			meleeAttackHitboxRadius: GameConfig.COMBAT.MELEE_HITBOX_RADIUS,
			meleeAttackDamage: stats.MELEE_DAMAGE,
			spellAttackCooldown: stats.COOLDOWN_SPELL_ATTACK,
			spellAttackDamage: stats.SPELL_DAMAGE,
			spellAttackHitboxRadius: GameConfig.COMBAT.SPELL_HITBOX_RADIUS,
			spellAttackspeed: stats.SPELL_SPEED,
			defenceAttackCooldown: stats.COOLDOWN_DEFENCE_ATTACK,
			attackType: undefined,
			isAttacking: false,
			isDead: false,
			isWinner: false,
			isGhost: false,
			isDefending: false,
			isBot: isBot,
			respawnTimer: 0,
			disconnectionTimer: 0.0,
			isDisconnected: false,
			inputQueue: [],
			currentState: undefined,
			clutchMasterUnlook: false,
		};
}