export const Rooms = {
  game: (gameId: string) => `game:${gameId}`,

  table: (gameId: string, tableId: string) => `game:${gameId}:table:${tableId}`,

  /**
   * A room scoped to a single section of a game. Used to broadcast
   * section-specific updates (e.g. a section's movement changing) without
   * over-broadcasting to clients in other sections.
   */
  section: (gameId: string, section: string) =>
    `game:${gameId}:section:${section}`,
};
