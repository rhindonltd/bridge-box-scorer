export const ScoringTypes = ["MP", "IMP", "XIMP"] as const;
export type ScoringType = (typeof ScoringTypes)[number];
