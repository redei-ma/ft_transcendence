export enum AttackType{
	MELEE_ATTACK = 'melee-attack',
	SPELL_ATTACK = 'spell-attack',
	DEFENCE_ATTACK = 'defence-attack'
}

export enum BulletHit{
	PLAYER_HIT = 'player-hit',
	WALL_HIT = 'wall-hit',
	NONE = 'none',
}

export enum CharacterName{
	ADE = 'ade',
	ZEUS = 'zeus',
	DEFAULT = 'default'
}

export enum EndReason{
	TIMEOUT = 'timeout',
	RESIGNATION = 'resignation',
	KILLOUT = 'killout',
}

export enum MatchMode{
	RANKED = 'ranked',
	UNRANKED = 'unranked',
	LOCAL = 'local',
	AI = 'ai',
}

export enum MatchType{
	TEAM = 'team',
	FFA = 'ffa'
}