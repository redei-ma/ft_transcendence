export enum GameEvents {
  // Matchmaking — verso Leonardo (socket logic-service)
  JOIN_LOCAL = 'join_local',
  JOIN_AI = 'join_ai',
  JOIN_UNRANKED = 'join_unranked',
  JOIN_RANKED = 'join_ranked',
  MATCH_FOUND = 'match_found',

  // Game — verso Giovanni (socket game-service)
  MAP_EMIT = 'map-emit',
  GAME_STATE = 'game-state',
  GAME_OVER = 'game-over',
  INPUT = 'game-input',
  GAME_MESSAGE = 'game-message',
}