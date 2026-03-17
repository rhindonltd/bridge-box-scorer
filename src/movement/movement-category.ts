export const MovementCategories = ["Pairs", "Teams", "Individual"] as const;
export type MovementCategory = (typeof MovementCategories)[number];
