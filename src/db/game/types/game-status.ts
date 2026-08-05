export const GameStatuses = ["CREATED", "JOINABLE", "COMPLETE"] as const;
export type GameStatus = (typeof GameStatuses)[number];
