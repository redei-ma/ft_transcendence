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

export enum ErrorCode {
	PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',
	MATCH_ALREADY_STARTED = 'MATCH_ALREADY_STARTED',
	MAP_LOAD_FAILED = 'MAP_LOAD_FAILED',
	INVALID_INPUT = 'INVALID_INPUT',
	UNAUTHORIZED = 'UNAUTHORIZED',
	INTERNAL_ERROR = 'INTERNAL_ERROR',
	SESSION_NOT_FOUND = 'SESSION_NOT_FOUND'
}

export enum SuccessCode{
	OK = 'OK',
}