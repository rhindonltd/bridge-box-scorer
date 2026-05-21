export const Rooms = {
  game: (gameId: string) => `game:${gameId}`,

  table: (gameId: string, tableId: string) => `game:${gameId}:table:${tableId}`,
};
