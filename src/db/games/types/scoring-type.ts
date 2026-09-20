export const ScoringTypes = ["MP", "IMP", "XIMP", "BAM", "PAB"] as const;

export type ScoringType = (typeof ScoringTypes)[number];
