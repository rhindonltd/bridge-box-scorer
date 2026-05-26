export const GameTypes = ["INDIVIDUAL", "PAIRS"] as const;
export type GameType = (typeof GameTypes)[number];
