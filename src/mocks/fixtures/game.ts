export const mockGame = {
  gameId: "abc123",
  eventName: "Monday AM Pairs",
  director: "Jacqui Collier",
  gameType: "PAIRS" as const,
  scoringType: "MP" as const,
  sessionName: "1",
  sectionName: "A",
  eventDate: new Date().toISOString(),
  tables: 8,
  leadCardRequired: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const pairsGame4Tables = {
  ...mockGame,
  tables: 4,
};

export const teamsGame4Tables = {
  ...mockGame,
  gameType: "TEAMS" as const,
  scoringType: "IMP" as const,
  tables: 4,
};
