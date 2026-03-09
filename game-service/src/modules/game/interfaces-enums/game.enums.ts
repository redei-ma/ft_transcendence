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

export enum ErrorCode {
	PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',
	MATCH_ALREADY_STARTED = 'MATCH_ALREADY_STARTED',
	MAP_LOAD_FAILED = 'MAP_LOAD_FAILED',
	INVALID_INPUT = 'INVALID_INPUT',
	UNAUTHORIZED = 'UNAUTHORIZED',
	INTERNAL_ERROR = 'INTERNAL_ERROR',
	SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
	SERVER_SHUTDOWN = 'SERVER_SHUTDOWN',
}

export enum SuccessCode{
	OK = 'OK',
}