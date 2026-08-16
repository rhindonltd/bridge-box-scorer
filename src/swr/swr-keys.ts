export const swrKeys = {
  pairs: (gameId: string) => `/api/games/${gameId}/participants`,

  joinableGames: () => "/api/games/joinable",

  game: (gameId: string) => {
    return `/api/games/${gameId}`;
  },

  assignment: (gameId: string, participantId: string) => {
    return `/api/games/${gameId}/assignment/${participantId}`;
  },
};
