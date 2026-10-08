export const SocketEvents = {
  // Client initiated - Global
  // NOTE: game creation is an HTTP route (POST /api/games), not a socket event;
  // it broadcasts JOINABLE_GAMES globally from that route.
  CONNECT: "connect",

  // Client initiated - Game specific
  JOIN_GAME: "game:join",
  CREATE_PARTICIPANT: "game:createParticipant",
  // Player-authed (the seat's own token), setup-only: a seated player vacates
  // their seat before the game starts, freeing it. Broadcasts PARTICIPANTS.
  // (Director eviction is a separate director-authed HTTP DELETE.)
  LEAVE_TABLE: "game:leaveTable",
  // Player-authed seat handoff to another device (available any time). The old
  // device mints a short transfer code (CREATE_SEAT_TRANSFER); the new device
  // claims it (CLAIM_SEAT_TRANSFER, unauthenticated — the code is the
  // credential), which ROTATES the seat's secret so only the new device owns
  // the seat. Backed by the seatTransferCodes table (system db).
  CREATE_SEAT_TRANSFER: "game:createSeatTransfer",
  CLAIM_SEAT_TRANSFER: "game:claimSeatTransfer",
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
  // Server-initiated: a board's results changed while someone is viewing the
  // end-of-round team results summary. Carries the single changed board's
  // instances; the client merges it into the boards it is showing.
  ROUND_RESULTS_SYNC: "roundResults:sync",
  // Client-initiated (player, teams): request the board instances for a set of
  // boards at once (returned on the ack) and join the game's round-results
  // room, so a late result from the other room updates the summary live.
  // Matching leave on unmount.
  REQUEST_STATE_ROUND_RESULTS: "roundResults:requestState",
  LEAVE_ROUND_RESULTS: "roundResults:leave",
  // Client-initiated (director): override a board result.
  OVERRIDE_RESULT_TRAVELLER: "traveller:overrideResult",
  // Client-initiated (director): cancel a board copy that could not be played
  // (fouled / mis-dealt / arrow-switched). Assigns the §3.3.2 artificial
  // adjusted score (AVE+/AVE+ or AVE) and flips the row to CANCELLED.
  CANCEL_BOARD_TRAVELLER: "traveller:cancelBoard",
  // Client-initiated (director): remove a board from a TEAMS match that could
  // not be played (§3.3.7). Awards a ±3 IMP indemnity by the director's fault
  // ruling and flips the row to REMOVED_TEAMS.
  REMOVE_TEAMS_BOARD_TRAVELLER: "traveller:removeTeamsBoard",
  // Client-initiated (director): VOID a whole TEAMS match (§3.3.6.1 incorrect
  // seating / §3.3.9 less-than-half-playable). Credits each team a ruling VP
  // (flat 40%/60% or the §3.3.9 split) and flips the match's rows to VOID_MATCH.
  VOID_TEAMS_MATCH_TRAVELLER: "traveller:voidTeamsMatch",
  // Client-initiated (director): VOID a whole SWISS-PAIRS match (§3.3.8/§3.3.9).
  // Removes the match from the field and credits each pair an AVE+/AVE−/AVE
  // compensation by fault; flips the match's rows to VOID_PAIR.
  VOID_PAIRS_MATCH_TRAVELLER: "traveller:voidPairsMatch",
  // Client-initiated (director): declare a SWISS match a MISMATCH (§3.5). The
  // boards stay real/scored; only the mismatched side's round VP is recomputed
  // via the §3.5.2 one-sided adjustment. Flips the match's rows to MISMATCH.
  // (§3.5 mismatch CANDIDATE DETECTION is a read-only director HTTP GET —
  // `/api/games/[gameId]/mismatch-candidates` — not a socket event, since it is
  // a one-shot read with no live push, unlike this mutating declaration.)
  MISMATCH_TRAVELLER: "traveller:markMismatch",

  // Client-initiated (player): submit the dealt cards for a board after the
  // round is complete. First entry for a board wins (global across sections);
  // later submissions are told it already exists.
  DEAL_SUBMIT: "deal:submit",
  // Client-initiated (director): enter or overwrite the dealt cards for a
  // board. Also the entry point a future dealing-machine file import reuses.
  DEAL_OVERRIDE: "deal:override",

  // Client-initiated (director): draw the next Swiss Pairs round from the
  // current standings. Only valid once the current round is fully scored and
  // the event has rounds remaining. Materializes the next round's boards and
  // broadcasts the resulting live updates; the acknowledgement carries the
  // drawn round number plus advisories (unavoidable repeat, stationary
  // conflict, sit-out pair) for the director.
  DRAW_NEXT_SWISS_ROUND: "swiss:drawNextRound",

  // Client-initiated (director): PREVIEW the next Swiss Pairs round without
  // committing it. Runs the same preconditions and draw as
  // DRAW_NEXT_SWISS_ROUND but writes nothing and broadcasts nothing; the
  // acknowledgement carries the proposed seating (stable pair ids + resolved
  // player names), the sit-out pair and the advisories, so the director can
  // review/edit it before accepting. The accompanying commit is
  // DRAW_NEXT_SWISS_ROUND, which now takes the (possibly edited) seating.
  PREVIEW_NEXT_SWISS_ROUND: "swiss:previewNextRound",

  // Client-initiated (director): draw the next Swiss Teams round from the
  // current standings. Only valid once the current round is fully scored and
  // the event has rounds remaining. Materializes the next round's boards (two
  // tables per match) and broadcasts the resulting live updates; the
  // acknowledgement carries the drawn round number plus an unavoidable-repeat
  // advisory for the director.
  DRAW_NEXT_SWISS_TEAMS_ROUND: "swissTeams:drawNextRound",

  // Client-initiated (director): PREVIEW the next Swiss Teams round without
  // committing it. Runs the same preconditions and draw as
  // DRAW_NEXT_SWISS_TEAMS_ROUND but writes nothing and broadcasts nothing; the
  // acknowledgement carries the proposed matches (stable team ids + resolved
  // team names), the odd-field resolution (bye or triple) and the repeat
  // advisory, so the director can review it before accepting. The accompanying
  // commit is DRAW_NEXT_SWISS_TEAMS_ROUND, which takes the accepted matches.
  PREVIEW_NEXT_SWISS_TEAMS_ROUND: "swissTeams:previewNextRound",
} as const;
