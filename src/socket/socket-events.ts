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
  GENERATE_SHARE_CODE: "game:generateShareCode",
  CLAIM_DIRECTOR_CODE: "game:claimDirectorCode",

  // Server initiated - Global
  JOINABLE_GAMES: "joinable-games",

  // Server initiated - Game specific
  PARTICIPANTS: "game:participants",
  GAME_UPDATED: "game:updated",

  // Client initiated - Board result submission
  SUBMIT_RESULT: "game:submitResult",

  // Server initiated - Board results
  BOARD_RESULT_UPDATED: "game:boardResultUpdated",

  // Server initiated - Board result confirmation
  BOARD_CONFIRMED: "game:boardConfirmed",
  BOARD_MISMATCH: "game:boardMismatch",

  // Server initiated - Timer specific
  TIMER_SYNC: "timer:sync",
  CREATE_TIMER: "timer:create",
  START_TIMER: "timer:start",
  PAUSE_TIMER: "timer:pause",
  NEXT_ROUND_TIMER: "timer:nextRound",
  UPDATE_CONFIG_TIMER: "timer:updateConfig",
} as const;
