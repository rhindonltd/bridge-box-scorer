export const swrKeys = {
  pairs: (gameId: string) => `/api/games/${gameId}/participants`,

  joinableGames: () => "/api/games/joinable",

  game: (gameId: string) => {
    return `/api/games/${gameId}`;
  },

  startCheck: (gameId: string) => `/api/games/${gameId}/start-check`,

  sections: (gameId: string) => `/api/games/${gameId}/sections`,

  movementDetail: (movementType: string, movementId: number) =>
    `/api/movements/detail/${movementType}/${movementId}`,

  schedule: (gameId: string, seat: string) =>
    `/api/games/${gameId}/schedule/${seat}`,

  boards: (gameId: string) => `/api/games/${gameId}/boards`,

  resultsSummary: (gameId: string) => `/api/games/${gameId}/results-summary`,

  club: () => "/api/system/club",

  playerSearch: (query: string) =>
    `/api/players/search?q=${encodeURIComponent(query)}`,

  network: () => "/api/system/network",

  wifiScan: () => "/api/system/wifi/scan",

  wifiScanStatus: () => "/api/system/wifi/scan/status",

  wifiDiagnostics: () => "/api/system/wifi/diagnostics",

  adminKeyValidate: () => "/api/system/admin-key/validate",

  directorValidate: (gameId: string) =>
    `/api/games/${gameId}/director/validate`,

  wifiTestStatus: () => "/api/system/wifi/test/status",
};
