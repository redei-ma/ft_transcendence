export enum SocketEvents {
	// Client -> Server
	JOIN_LOBBY = 'join-lobby',
	INPUT = 'game-input',

	// Server -> Client
	GAME_STATE = 'game-state',
	GAME_OVER = 'game-over',
	MAP_EMIT = 'map-emit',
	GAME_MESSAGE = 'game-message',
}