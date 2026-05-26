export const GameStatuses = [
  "CREATED",
  "JOINABLE",
  "IN_PLAY",
  "COMPLETE",
] as const;
export type GameStatus = (typeof GameStatuses)[number];
