export const swrKeys = {
  pairs: (gameId: string) => `/api/games/${gameId}/participants`,

  joinableGames: () => "/api/games/joinable",

  game: (gameId: string) => {
    return `/api/games/${gameId}`;
  },

  assignment: (gameId: string, participantId: string) => {
    return `/api/games/${gameId}/assignment/${participantId}`;
  },

  startCheck: (gameId: string) => `/api/games/${gameId}/start-check`,

  sections: (gameId: string) => `/api/games/${gameId}/sections`,

  schedule: (gameId: string, seat: string) =>
    `/api/games/${gameId}/schedule/${seat}`,

  boards: (gameId: string) => `/api/games/${gameId}/boards`,

  resultsSummary: (gameId: string) => `/api/games/${gameId}/results-summary`,

  club: () => "/api/system/club",

  playerSearch: (query: string) =>
    `/api/players/search?q=${encodeURIComponent(query)}`,

  wifiScan: () => "/api/system/wifi/scan",
};
