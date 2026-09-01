export const swrKeys = {
  pairs: (gameId: string) => `/api/games/${gameId}/participants`,

  joinableGames: () => "/api/games/joinable",

  game: (gameId: string) => {
    return `/api/games/${gameId}`;
  },

  assignment: (gameId: string, participantId: string) => {
    return `/api/games/${gameId}/assignment/${participantId}`;
  },

  leaderboard: (gameId: string) => `/api/games/${gameId}/leaderboard`,

  startCheck: (gameId: string) => `/api/games/${gameId}/start-check`,

  schedule: (gameId: string, seat: string) =>
    `/api/games/${gameId}/schedule/${seat}`,

  boardInstances: (gameId: string, boardNumber: number) =>
    `/api/games/${gameId}/boards/${boardNumber}`,

  boards: (gameId: string) => `/api/games/${gameId}/boards`,

  club: () => "/api/system/club",

  playerSearch: (query: string) =>
    `/api/players/search?q=${encodeURIComponent(query)}`,

  wifiScan: () => "/api/system/wifi/scan",
};
