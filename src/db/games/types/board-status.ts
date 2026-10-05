export const BoardStatuses = [
  "NOT_PLAYED",
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "OVERRIDDEN",
  // A board that is not played at a given table in a given round because the
  // pair there is sitting out (one-pair-short session). Never played, scored,
  // or submittable.
  "SIT_OUT",
  // A board a pair does NOT play because it is a non-anchor in a Swiss Pairs
  // "2 half matches" round: it plays one half for real and is credited an
  // average-plus/average blend for the half it misses. These rows mark the
  // missed half (ns = the non-anchor pair, ew = a phantom); they are never
  // played or submittable, and the half-match scorer recomputes the AVE+/AVE
  // split across them (board rows stay dumb — no fraction is stored).
  "HALF_AVERAGE",
] as const;

export type BoardStatus = (typeof BoardStatuses)[number];
