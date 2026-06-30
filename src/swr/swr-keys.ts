export const swrKeys = {
  individualInitialSeats: (gameId: string) =>
    `/api/games/individual/${gameId}/initial-seat`,

  pairsInitialSeats: (gameId: string) =>
    `/api/games/pairs/${gameId}/initial-seat`,

  joinableGames: () => "/api/games/joinable",

  game: (gameId: string) => {
    return `/api/games/${gameId}`;
  },

  assignment: (gameId: string, participantId: string) => {
    return `/api/games/${gameId}/assignment/${participantId}`;
  },
};
