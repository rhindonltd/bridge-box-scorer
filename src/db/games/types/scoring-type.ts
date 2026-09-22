export const ScoringTypes = [
  "MP",
  "IMP",
  "IMP_VP",
  "XIMP",
  "BAM",
  "PAB",
] as const;

export type ScoringType = (typeof ScoringTypes)[number];
