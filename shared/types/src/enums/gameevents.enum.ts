export enum GameEvents {
	// Matchmaking
	JOIN_LOCAL = "join_local",
	JOIN_QUEUE = "join_queue",
	JOIN_AI = "join_ai",
	JOIN_UNRANKED = "join_unranked",
	JOIN_RANKED = "join_ranked",
	MATCH_FOUND = "match_found",
	INTERNAL_MATCH_FOUND = "match_found_internal",
	LEAVE_QUEUE = "leave_queue",
	GET_QUEUE_COUNT = "get_queue_count",
	END_GAME = "end-game",
	ACCEPT_DIRECT_INVITE = "accept_direct_invite",
	INTERNAL_DIRECT_SESSION_READY = "internal_direct_session_ready",

	// Game
	MAP_EMIT = "map-emit",
	GAME_STATE = "game-state",
	GAME_OVER = "game-over",
	INPUT = "game-input",
	GAME_MESSAGE = "game-message",
	LEAVE_GAME = "leave-game"
}
