export const swrKeys = {
  pairs: (gameId: string) => `/api/games/${gameId}/participants`,

  expectedLateSeats: (gameId: string) =>
    `/api/games/${gameId}/expected-late-seats`,

  joinableGames: () => "/api/games/joinable",

  game: (gameId: string) => `/api/games/${gameId}`,

  startCheck: (gameId: string) => `/api/games/${gameId}/start-check`,

  sections: (gameId: string) => `/api/games/${gameId}/sections`,

  movementDetail: (movementType: string, movementId: number) =>
    `/api/movements/detail/${movementType}/${movementId}`,

  playState: (gameId: string, seat: string) =>
    `/api/games/${gameId}/play-state/${seat}`,

  boards: (gameId: string) => `/api/games/${gameId}/boards`,

  resultsSummary: (gameId: string) => `/api/games/${gameId}/results-summary`,

  club: () => "/api/system/club",

  defaultTimer: () => "/api/system/default-timer",

  bridgewebs: () => "/api/system/bridgewebs",

  ebu: () => "/api/system/ebu",

  cloudSync: () => "/api/system/cloud-sync",

  cloudSyncStatus: () => "/api/system/cloud-sync/status",

  bridgewebsEvents: (date: string) =>
    `/api/games/bridgewebs/events?date=${encodeURIComponent(date)}`,

  playerSearch: (query: string) =>
    `/api/players/search?q=${encodeURIComponent(query)}`,

  network: () => "/api/system/network",

  wifiScan: () => "/api/system/wifi/scan",

  wifiDiagnostics: () => "/api/system/wifi/diagnostics",

  adminKeyValidate: () => "/api/system/admin-key/validate",

  directorValidate: (gameId: string) =>
    `/api/games/${gameId}/director/validate`,
};
