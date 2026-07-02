export const swrKeys = {
  individuals: (gameId: string) =>
    `/api/games/individual/${gameId}/participants`,

  pairs: (gameId: string) => `/api/games/pairs/${gameId}/participants`,

  joinableGames: () => "/api/games/joinable",

  game: (gameId: string) => {
    return `/api/games/${gameId}`;
  },

  individualMovements: (tables: number) =>
    `/api/movements/individual/${tables}`,
  pairMovements: (tables: number) => `/api/movements/pairs/${tables}`,
  teamMovements: (tables: number) => `/api/movements/teams/${tables}`,
};
