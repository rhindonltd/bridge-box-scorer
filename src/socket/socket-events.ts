export const SocketEvents = {
  // Client initiated - Global
  CREATE_GAME: "create-game",
  CONNECT: "connect",

  // Client initiated - Game specific
  JOIN_GAME: "game:join",
  CREATE_PARTICIPANT: "game:createParticipant",
  EVICT_PARTICIPANT: "game:evictParticipant",
  SELECT_MOVEMENT: "game:selectMovement",
  START_GAME: "game:start",
  UPDATE_TABLES: "game:updateTables",
  CREATE_SECTION: "game:createSection",
  RENAME_SECTION: "game:renameSection",
  DELETE_SECTION: "game:deleteSection",
  SET_SECTION_MOVEMENT: "game:setSectionMovement",
  LEAVE_GAME: "game:leave",
  GENERATE_SHARE_CODE: "game:generateShareCode",
  CLAIM_DIRECTOR_CODE: "game:claimDirectorCode",

  // Server initiated - Global
  JOINABLE_GAMES: "joinable-games",

  // Server initiated - Game specific
  PARTICIPANTS: "game:participants",
  GAME_UPDATED: "game:updated",
  // Server initiated - Section specific (config/movement changed for a section)
  SECTION_UPDATED: "game:sectionUpdated",

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
  PREVIOUS_TIMER: "timer:previous",
  ADJUST_TIME_TIMER: "timer:adjustTime",
  UPDATE_CONFIG_TIMER: "timer:updateConfig",
  // Client-initiated (director): save a timer configuration during game setup
  // without starting it. Persists a "configured but not started" timer state
  // (phase null, not running) that is promoted to a live timer when the game
  // starts.
  SAVE_CONFIG_TIMER: "timer:saveConfig",
  // Client-initiated request for a section's current timer snapshot; the
  // current TimerState (or null) is returned on the acknowledgement callback,
  // and the socket joins that section's timer room for live updates.
  REQUEST_STATE_TIMER: "timer:requestState",
  // Client-initiated: leave a section's timer room (on unmount / section change).
  LEAVE_TIMER: "timer:leave",

  // Server initiated - Leaderboard specific
  LEADERBOARD_SYNC: "leaderboard:sync",
  // Client-initiated: request the current leaderboard snapshot (returned on the
  // ack) and join the leaderboard room; matching leave event on unmount.
  REQUEST_STATE_LEADERBOARD: "leaderboard:requestState",
  LEAVE_LEADERBOARD: "leaderboard:leave",

  // Server initiated - Traveller specific (per board)
  TRAVELLER_SYNC: "traveller:sync",
  // Client-initiated: request a board's traveller snapshot (returned on the
  // ack) and join that board's traveller room; matching leave on switch/unmount.
  REQUEST_STATE_TRAVELLER: "traveller:requestState",
  LEAVE_TRAVELLER: "traveller:leave",
  // Client-initiated (director): override a board result.
  OVERRIDE_RESULT_TRAVELLER: "traveller:overrideResult",
} as const;
