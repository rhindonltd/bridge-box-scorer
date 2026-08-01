export const MovementCategories = ["Pairs", "Teams"] as const;
export type MovementCategory = (typeof MovementCategories)[number];
