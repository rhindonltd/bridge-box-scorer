export const BoardStatuses = [
  "NOT_PLAYED",
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "OVERRIDDEN",
] as const;

export type BoardStatus = (typeof BoardStatuses)[number];
