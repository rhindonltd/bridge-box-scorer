export const swrKeys = {
  individuals: (gameId: string) =>
    `/api/games/individual/${gameId}/participants`,

  pairs: (gameId: string) => `/api/games/pairs/${gameId}/participants`,

  joinableGames: () => "/api/games/joinable",

  game: (gameId: string) => {
    return `/api/games/${gameId}`;
  },

  assignment: (gameId: string, participantId: string) => {
    return `/api/games/${gameId}/assignment/${participantId}`;
  },
};
