export const SocketEvents = {
  // Client initiated - Global
  // NOTE: game creation is an HTTP route (POST /api/games), not a socket event;
  // it broadcasts JOINABLE_GAMES globally from that route.
  CONNECT: "connect",

  // Client initiated - Game specific
  JOIN_GAME: "game:join",
  CREATE_PARTICIPANT: "game:createParticipant",
  // NOTE: participant eviction is an HTTP route
  // (DELETE /api/games/[gameId]/participants/[seat]), not a socket event; it
  // broadcasts PARTICIPANTS from that route.
  SELECT_MOVEMENT: "game:selectMovement",
  // NOTE: starting a game is an HTTP route (POST /api/games/[gameId]/start),
  // not a socket event; it promotes the timer and broadcasts GAME_UPDATED from
  // that route.
  // NOTE: table resize and section create/rename/delete/movement are HTTP
  // routes (src/app/api/games/[gameId]/sections/*), not socket events. The
  // resulting live updates broadcast GAME_UPDATED / SECTION_UPDATED /
  // TIMER_CLEARED from those routes.
  LEAVE_GAME: "game:leave",
  // NOTE: director share codes are HTTP routes, not socket events — generating
  // (POST /api/games/[gameId]/share-code, director-only) and claiming (POST
  // /api/director-codes/claim, unauthenticated — the code is the credential).

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
  // Server initiated: a section's timer has been cleared (e.g. its movement
  // changed, invalidating the derived round structure). Clients drop their
  // current timer state and fall back to the unconfigured/empty view.
  TIMER_CLEARED: "timer:cleared",
  // NOTE: there is no ad-hoc "create timer" event. A timer is created and
  // started only via `promoteTimerAtGameStart` when the game starts (which
  // builds the engine, starts it, and schedules its phases). Timer setup writes
  // a config via HTTP (see the timer-config route); the controls below operate
  // on an already-live timer.
  START_TIMER: "timer:start",
  PAUSE_TIMER: "timer:pause",
  NEXT_ROUND_TIMER: "timer:nextRound",
  PREVIOUS_TIMER: "timer:previous",
  ADJUST_TIME_TIMER: "timer:adjustTime",
  UPDATE_CONFIG_TIMER: "timer:updateConfig",
  // NOTE: saving a timer configuration during setup is an HTTP route (PUT
  // /api/games/[gameId]/sections/[section]/timer/config), not a socket event.
  // It persists the "configured but not started" state (phase null, not
  // running, promoted to a live timer at game start) and broadcasts
  // `timer:sync` via the shared timer broadcaster.
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
