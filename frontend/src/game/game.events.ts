export enum GameEvents {
	// Client -> Server
	JOIN_LOBBY = 'join-lobby',
	INPUT = 'game-input',
	CLOSE_ATTACK = 'close-attack',

	// Server -> Client
	GAME_STATE = 'game-state',
	GAME_OVER = 'game-over',
	MAP_EMIT = 'map-emit',
}