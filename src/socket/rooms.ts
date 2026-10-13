export const Rooms = {
  game: (gameId: string) => `game:${gameId}`,

  table: (gameId: string, tableId: string) => `game:${gameId}:table:${tableId}`,

  /**
   * A room scoped to a single seat, joined by the device currently holding it
   * when it mints a "change device" transfer code. When another device claims
   * that code the server emits `SEAT_TAKEN_OVER` to this room so the old
   * device learns it has been signed out (the claiming device has not joined
   * the room yet, so it is not notified).
   */
  seat: (gameId: string, seat: string) => `game:${gameId}:seat:${seat}`,

  /**
   * A room scoped to a single section of a game. Used to broadcast
   * section-specific updates (e.g. a section's movement changing) without
   * over-broadcasting to clients in other sections.
   */
  section: (gameId: string, section: string) =>
    `game:${gameId}:section:${section}`,

  /**
   * A room scoped to a single section's timer. Clients viewing that section's
   * timer (director controls or the Room Display) join this room so the
   * server broadcasts each section's timer only to the clients watching it.
   */
  timer: (gameId: string, section: string) =>
    `game:${gameId}:timer:${section}`,

  /**
   * A room scoped to a game's leaderboard. Clients currently viewing the
   * leaderboard join this room so the server can (a) push recomputed
   * leaderboard snapshots to just those clients and (b) skip the recompute
   * entirely when the room is empty.
   */
  leaderboard: (gameId: string) => `game:${gameId}:leaderboard`,

  /**
   * A room scoped to a single board's traveller. Clients viewing that board's
   * traveller join this room, so a result for that board only recomputes and
   * broadcasts to the clients actually viewing it.
   */
  traveller: (gameId: string, boardNumber: number) =>
    `game:${gameId}:traveller:${boardNumber}`,

  /**
   * A room scoped to a game's end-of-round team results summary. A teams player
   * on that screen joins this room so a late result from the other room (any
   * board) is pushed to them and the summary updates live. One room per game
   * (not per board): the summary spans a whole round, and the pushed sync
   * carries the single changed board, which the client merges into whatever
   * boards it is showing.
   */
  roundResults: (gameId: string) => `game:${gameId}:roundResults`,
};
