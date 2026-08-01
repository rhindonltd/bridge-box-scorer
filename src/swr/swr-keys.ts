export const swrKeys = {
  pairs: (gameId: string) => `/api/games/pairs/${gameId}/pairs`,

  joinableGames: () => "/api/games/joinable",

  game: (gameId: string) => {
    return `/api/games/${gameId}`;
  },

  assignment: (gameId: string, participantId: string) => {
    return `/api/games/${gameId}/assignment/${participantId}`;
  },
};
