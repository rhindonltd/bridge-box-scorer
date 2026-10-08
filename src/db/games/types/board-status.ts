export const BoardStatuses = [
  "NOT_PLAYED",
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "OVERRIDDEN",
  // A board a director has declared could not be played in its intended form at
  // a given table — fouled (Law 87A), mis-dealt, arrow-switched, or run out of
  // time. Per EBU White Book §3.3.2, the affected copy is cancelled and carries
  // an ARTIFICIAL ADJUSTED score in `directorOverrideResult` (AVE+/AVE+ `A60/60`
  // when an outside agency was at fault, or AVE `A50/50` by TD judgment), so it
  // still occupies a seat in the field and the correctly-played copies form a
  // Neuberg-scaled sub-field (see `scoring/traveller/pair/neuberg-across-boards.ts`).
  // Distinct from OVERRIDDEN (a plain score correction) so displays and reports
  // can show it as a fouled board. Treated as finalized/playable everywhere
  // OVERRIDDEN is.
  "CANCELLED",
  // A board REMOVED from a TEAMS match because part of the match could not be
  // played (EBU White Book §3.3.7, at least half still playable). Instead of a
  // table comparison it carries an artificial adjusted score of ±3 IMPs per the
  // director's fault ruling, encoded as a `TRM:<fault>` token in
  // `directorOverrideResult` (see `model/teams-removed-board.ts`). The teams IMP
  // scorers read the token to contribute a fixed per-board IMP swing to the
  // match margin and count the board as played (so the VP scale uses the full
  // board count). Finalized/playable like OVERRIDDEN. Teams IMP formats only;
  // not interpreted by the pairs scorers.
  "REMOVED_TEAMS",
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
  // NOTE: the §3.3.6/§3.3.9 teams void (VOID_MATCH), §3.3.8/§3.3.9 pairs void
  // (VOID_PAIR) and §3.5 mismatch (MISMATCH) are NO LONGER board statuses —
  // they are match-level director rulings on `matches.ruling` (home-relative
  // `VOID:` / `VOIDP:` / `MM:` tokens). A voided/mismatched match's board rows
  // keep their ordinary status + real result; the scorers read the ruling off
  // the match row. See docs/design/matches-table.md §6.3.
] as const;

export type BoardStatus = (typeof BoardStatuses)[number];
