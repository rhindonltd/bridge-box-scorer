export const BoardStatuses = [
  "NOT_PLAYED",
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "OVERRIDDEN",
  // A board that is not played at a given table in a given round because the
  // pair there is sitting out (one-pair-short session). Never played, scored,
  // or submittable.
  "SIT_OUT",
] as const;

export type BoardStatus = (typeof BoardStatuses)[number];
