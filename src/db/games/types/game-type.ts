export const GameTypes = ["PAIRS", "TEAMS"] as const;
export type GameType = (typeof GameTypes)[number];
