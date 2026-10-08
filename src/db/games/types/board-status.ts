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
  // Every board of a TEAMS match that has been declared VOID (EBU White Book
  // §3.3.6.1 incorrect seating / §3.3.9 less-than-half-playable). The match's
  // margin→VP conversion no longer applies; instead each team is credited a
  // ruling VP (flat 40%/60%, or the §3.3.9 AVE+/AVE− half-board split) derived
  // from a `VOID:<cause>` token in `directorOverrideResult` (see
  // `model/teams-match-void.ts`). All of the match's board rows (both rooms)
  // carry this status so the scorer recognises the match as void. Finalized/
  // playable like OVERRIDDEN. Teams VP only.
  "VOID_MATCH",
  // A board of a SWISS-PAIRS match that has been declared VOID (§3.3.8 /
  // §3.3.9). Unlike teams (head-to-head), pairs are scored against the whole
  // section field, so a voided pairs match (a) is REMOVED from the field the
  // other pairs are matchpointed against, and (b) credits each affected pair an
  // AVE+/AVE−/AVE blend over the match's boards. Each pair's rows carry a
  // `VOIDP:<fault>` token (its own AVE+/AVE−/AVE standing) in
  // `directorOverrideResult` (see `model/pairs-match-void.ts`). Finalized/
  // playable like OVERRIDDEN; never counted in the field. Swiss-pairs VP only.
  "VOID_PAIR",
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
  // Every board of a SWISS match the director has declared a MISMATCH (EBU
  // White Book §3.5): a contestant was drawn against the wrong opponents. The
  // boards are REAL and still played/scored normally — the result stands and
  // stays in the field — but the mismatched side's per-round VP is recomputed
  // via the §3.5.2 one-sided adjustment, derived from an `MM:<side>:<dir>:<fault>`
  // token in `directorOverrideResult` (see `model/swiss-mismatch.ts`). All of
  // the match's board rows carry this status + token so the Swiss VP scorers
  // (pairs and teams) recognise the match and adjust only the mismatched side.
  // Finalized/playable like OVERRIDDEN; the opponent side is unaffected. Swiss
  // VP only.
  "MISMATCH",
] as const;

export type BoardStatus = (typeof BoardStatuses)[number];
