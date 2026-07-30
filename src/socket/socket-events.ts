export const SocketEvents = {
  // Client initiated - Global
  CREATE_GAME: "create-game",
  CONNECT: "connect",

  // Client initiated - Game specific
  JOIN_GAME: "game:join",
  CREATE_PARTICIPANT: "game:createParticipant",
  EVICT_PARTICIPANT: "game:evictParticipant",
  SELECT_MOVEMENT: "game:selectMovement",
  UPDATE_TABLES: "game:updateTables",
  LEAVE_GAME: "game:leave",

  // Server initiated - Global
  JOINABLE_GAMES: "joinable-games",

  // Server initiated - Game specific
  PARTICIPANTS: "game:participants",
  GAME_UPDATED: "game:updated",

  // Server initiated - Timer specific
  TIMER_SYNC: "timer:sync",
  CREATE_TIMER: "timer:create",
  START_TIMER: "timer:start",
  PAUSE_TIMER: "timer:pause",
  NEXT_ROUND_TIMER: "timer:nextRound",
  UPDATE_CONFIG_TIMER: "timer:updateConfig",
} as const;
