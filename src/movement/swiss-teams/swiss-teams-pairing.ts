/**
 * Pure Swiss Teams pairing engine.
 *
 * A team is the two pairs seated at one home table: the pair sitting North/
 * South stays there all event (the "home" pair), and the pair sitting East/
 * West is the one that travels to face other teams (the "away" pair). A team's
 * stable id for the whole event is simply its home table number (1..teams).
 *
 * Each round pairs teams into head-to-head matches. A match between team A and
 * team B is played in two rooms that share the same boards:
 *   - the "open" room at A's home table: A's home pair (NS) vs B's away pair (EW),
 *   - the "closed" room at B's home table: B's home pair (NS) vs A's away pair (EW).
 * The match result is the net IMP margin comparing the two tables board by board.
 *
 * Only round 1 (a random pairing) is known up front; every later round is drawn
 * from the current standings, avoiding repeat opponents. Home pairs never move,
 * and only away pairs travel.
 *
 * Odd team counts are supported two ways, chosen by the director (`oddHandling`):
 *   - "BYE": one team sits out each round (the bottom table in round 1, then the
 *     lowest-ranked team without a prior bye), mirroring the Swiss Pairs sit-out.
 *   - "TRIPLE": three teams play a three-way (a "triple") instead of one team
 *     sitting out. The three chosen teams meet as a round-robin of three
 *     head-to-head comparisons — x v y, y v z, z v x (for teams x < y < z) —
 *     and the remaining even field is paired normally. A triple comes in two
 *     flavours, fixed per round by the director's `oddRoundPlan`:
 *       - SHORT: the whole three-way fits in ONE round. Each head-to-head is a
 *         half-sized board comparison; the three comparisons use three disjoint
 *         board sets A, B, C (A/B are the round's two halves, C a fresh
 *         half-set). The away pairs switch tables at the round's midpoint.
 *       - LONG: the three-way is spread over TWO consecutive rounds R and R+1.
 *         Each head-to-head is a FULL-board comparison; the first room of each
 *         plays in round R, the second in round R+1. No extra board set is
 *         needed (the two rounds already have distinct board ranges).
 * In BOTH flavours every team plays all of its boards — there is no sit-out and
 * no unplayed-board compensation for a teams triple (contrast Swiss Pairs).
 *
 * This module is framework/IO-free: all persistence, scoring and socket
 * plumbing lives elsewhere.
 */

/** A team's stable id for the whole event: its home table number (1..teams). */
export type TeamId = number;

/** How an odd team field is resolved for the event (director's choice). */
export type OddHandling = "BYE" | "TRIPLE";

/**
 * How a single round's odd team is resolved, taken from the director's
 * `oddRoundPlan`:
 *   - "BYE"  — one team sits out this round.
 *   - "SHORT" — a short triple (whole three-way inside this one round).
 *   - { kind: "LONG"; group } — one slot of a long triple spanning this round
 *     and its adjacent partner round (both plan entries share `group`).
 * An even field ignores this entirely.
 */
export type OddRoundResolution =
  | "BYE"
  | "SHORT"
  | { kind: "LONG"; group: number };

/** Which flavour of triple a drawn round carries. */
export type TripleKind = "SHORT" | "LONG";

/** A single drawn match between two teams for one round. */
export interface TeamsMatch {
  /** The two team ids meeting this round (order is not significant). */
  a: TeamId;
  b: TeamId;
}

/**
 * A three-way "triple" for one round: three teams that play a round-robin of
 * three head-to-head comparisons. Stored in ascending id order (`a < b < c`).
 * The three comparisons are fixed by that order: x-y, y-z, z-x (see
 * {@link expandTeamTriple} for the physical table layout).
 *
 * `kind` records whether this is a SHORT triple (the whole three-way inside one
 * round, on three half-sized board sets) or a LONG triple (spread over two
 * consecutive rounds on full boards). A LONG triple also carries the `group`
 * linking its two round slots and `slot` saying which of the two this is
 * (1 = the first/earlier round, 2 = the second). A SHORT triple has `group`
 * and `slot` null.
 */
export interface TeamsTriple {
  a: TeamId;
  b: TeamId;
  c: TeamId;
  /**
   * SHORT (one round, three half-sized board sets) or LONG (two consecutive
   * rounds, full boards). Optional for backward/forward compatibility with
   * callers and persisted shapes that predate the short/long split; absent is
   * treated as SHORT (a one-round three-way). The draw engine always sets it.
   */
  kind?: TripleKind;
  /**
   * The long-triple group id linking its two round slots. Present only for a
   * LONG triple; absent/null for SHORT.
   */
  group?: number | null;
  /**
   * Which slot of a long triple this round is: 1 (the first/earlier round) or
   * 2 (the second). Present only for a LONG triple; absent/null for SHORT.
   */
  slot?: 1 | 2 | null;
}

/**
 * One head-to-head comparison inside a triple: two teams meeting over one board
 * set, played in two rooms (as any teams match). `home`/`away` name the first
 * room's NS and EW teams; the mirror room swaps them. `boardSet` tags which of
 * the triple's board subsets this comparison uses:
 *   - SHORT: "A", "B" or "C" (the three disjoint half-sized sets).
 *   - LONG: "R1" (plays in the earlier round) or "R2" (the later round) — a long
 *     comparison's two rooms span the triple's two rounds.
 */
export interface TripleComparison {
  /** The lower-id team of this comparison. */
  low: TeamId;
  /** The higher-id team of this comparison. */
  high: TeamId;
  /** The two physical table-rows (open + closed room) for this comparison. */
  rows: TeamsSeatPlacement[];
  /** Which board subset this comparison uses (A/B/C short, R1/R2 long). */
  boardSet: TripleBoardSet;
}

/** The board subset a triple comparison plays. */
export type TripleBoardSet = "A" | "B" | "C";

/** Everything the engine needs to draw the next round. */
export interface SwissTeamsDrawInput {
  /** Number of teams in play (must be even). */
  teams: number;
  /**
   * Team ids in current standing order, best first. Every team must appear
   * exactly once; ties should already be broken by the caller into a stable
   * order, which the engine treats as authoritative.
   */
  standings: TeamId[];
  /**
   * Teams that have already played each other, as a set of unordered-pair keys
   * (see {@link teamOpponentKey}). Used to avoid repeat matches.
   */
  playedOpponents: ReadonlySet<string>;
}

/** Everything the engine needs to draw the next round. */
export interface SwissTeamsDrawInputWithBye extends SwissTeamsDrawInput {
  /**
   * How THIS round's odd team is resolved (from the director's `oddRoundPlan`).
   * Defaults to "BYE". Ignored when the field is even.
   */
  oddRound?: OddRoundResolution;
  /**
   * Teams that have already had a bye (each may only sit out once until the
   * field is exhausted). Only consulted for an odd "BYE" field. Optional;
   * defaults to none.
   */
  hadBye?: ReadonlySet<TeamId>;
  /**
   * Teams that have already been in a triple (each takes a triple at most
   * once until the field is exhausted). Only consulted for an odd triple
   * field. Optional; defaults to none.
   */
  hadTriple?: ReadonlySet<TeamId>;
  /**
   * A pre-determined triple to use for this round INSTEAD of choosing one — set
   * for the SECOND slot of a long triple, whose three teams are fixed by its
   * first slot (see {@link continueLongTriple}). When present, the engine does
   * NOT run {@link chooseTeamTriple}: it uses this triple verbatim, removes its
   * three teams, and pairs the rest of the field. Ignored unless `oddRound` is a
   * triple (`"SHORT"` or `{kind:"LONG"}`) and the field is odd.
   */
  fixedTriple?: TeamsTriple;
}

/** The drawn next round plus any advisories the director should see. */
export interface SwissTeamsDrawResult {
  /** The matches for the round, in ascending lower-team-id order. */
  matches: TeamsMatch[];
  /**
   * True when at least one drawn match repeats a pairing already played (only
   * ever set when no repeat-free complete pairing exists).
   */
  hadUnavoidableRepeat: boolean;
  /**
   * The team sitting out this round (odd field, bye handling), or null when the
   * field is even or a triple was used. The bye team plays no match and is
   * credited an average-plus result in the standings.
   */
  byeTeamId: TeamId | null;
  /**
   * The three-way triple for this round (odd field, triple handling), or
   * null when the field is even or a bye was used.
   */
  triple: TeamsTriple | null;
}

/** Round 1 matches plus the odd-field resolution (bye team or triple). */
export interface SwissTeamsRoundOneResult {
  matches: TeamsMatch[];
  byeTeamId: TeamId | null;
  triple: TeamsTriple | null;
}

/**
 * One pair-seat placement produced by expanding a team match into the two
 * physical tables. `homeTeam` sits at `tableNumber` (its home); the two pairs
 * at that table are `homeTeam`'s home pair (NS) and `awayTeam`'s away pair (EW).
 */
export interface TeamsSeatPlacement {
  tableNumber: number;
  /** The team whose home table this is (its home pair sits NS here). */
  nsTeam: TeamId;
  /** The team whose away pair travels here to sit EW. */
  ewTeam: TeamId;
}

/**
 * A stable, order-independent key for the unordered team pair {a, b}. Used both
 * to record played opponents and to test a candidate match against history.
 */
export function teamOpponentKey(a: TeamId, b: TeamId): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** The stable team ids for an event of `teams` teams: 1..teams. */
export function teamIds(teams: number): TeamId[] {
  return Array.from({ length: teams }, (_, i) => i + 1);
}

/**
 * A tiny deterministic PRNG (mulberry32). Seeding it makes the round-1 random
 * draw reproducible for tests and for a re-draw of the same round.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** In-place Fisher–Yates shuffle driven by the given RNG. */
function shuffle<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * Build the {@link TeamsTriple} record for a chosen set of three teams and the
 * round's resolution. For a SHORT triple `group`/`slot` are null; for a LONG
 * triple they carry the plan's group id and which of the two round slots this
 * round is.
 */
function makeTriple(
  a: TeamId,
  b: TeamId,
  c: TeamId,
  resolution: "SHORT" | { kind: "LONG"; group: number },
): TeamsTriple {
  if (resolution === "SHORT") {
    return { a, b, c, kind: "SHORT", group: null, slot: null };
  }
  return { a, b, c, kind: "LONG", group: resolution.group, slot: 1 };
}

/**
 * Round 1 is a random pairing of the teams (there are no standings yet). The
 * teams are shuffled with a seeded PRNG and paired off two at a time, so the
 * result is deterministic for a given seed. Matches are returned in ascending
 * lower-team-id order.
 *
 * Odd field: there are no standings yet, so the odd resolution is deterministic
 * (bottom tables) rather than random, driven by the round's plan entry
 * (`oddRound`, default "BYE"). Under "BYE" the BOTTOM table (highest id) sits
 * out and the remaining `teams - 1` are shuffled and paired. Under a triple
 * (SHORT or LONG) the bottom THREE tables (`teams-2, teams-1, teams`) form the
 * triple and the remaining `teams - 3` (an even count) are shuffled and paired.
 * The chosen resolution is reported on `byeTeamId` / `triple`.
 */
export function swissTeamsRoundOne(
  teams: number,
  seed: number,
  oddRound: OddRoundResolution = "BYE",
): SwissTeamsRoundOneResult {
  const isOdd = teams % 2 !== 0;
  const useTriple = isOdd && oddRound !== "BYE";

  // Odd field: the bottom table(s) take the round-1 bye/triple; pair the rest.
  const byeTeamId = isOdd && !useTriple ? teams : null;
  const triple: TeamsTriple | null = useTriple
    ? makeTriple(teams - 2, teams - 1, teams, oddRound)
    : null;

  const removed = new Set<TeamId>();
  if (byeTeamId !== null) removed.add(byeTeamId);
  if (triple !== null) {
    removed.add(triple.a);
    removed.add(triple.b);
    removed.add(triple.c);
  }
  const playing = teamIds(teams).filter((id) => !removed.has(id));

  const rng = mulberry32(seed);
  const order = shuffle(playing, rng);

  const matches: TeamsMatch[] = [];
  for (let i = 0; i < order.length; i += 2) {
    matches.push(normalizeMatch(order[i], order[i + 1]));
  }

  return { matches: sortMatches(matches), byeTeamId, triple };
}

/**
 * Choose the bye team for an odd field: the lowest-ranked team (nearest the
 * bottom of the standings) that has not already had a bye. If every team has
 * had a bye — only once the field is exhausted — fall back to the single
 * lowest-ranked team so a draw is still produced. Mirrors the Swiss Pairs
 * `chooseSitOut`.
 */
function chooseTeamBye(
  standings: TeamId[],
  hadBye: ReadonlySet<TeamId>,
): TeamId {
  for (let i = standings.length - 1; i >= 0; i--) {
    if (!hadBye.has(standings[i])) {
      return standings[i];
    }
  }
  return standings[standings.length - 1];
}

/**
 * Choose the three teams for an odd field's triple: the lowest-ranked three
 * (nearest the bottom of the standings) that have not already been in a
 * triple, scanning bottom-up. Once fewer than three such teams remain (the
 * field has been through a full cycle of triples), the pool is topped up with
 * the remaining lowest-ranked teams so a triple is always formed. Returned in
 * ascending id order so the comparison cycle (x-y, y-z, z-x) is deterministic.
 * Analogous to {@link chooseTeamBye}. Used for both SHORT triples and the
 * FIRST slot of a LONG triple (the second slot reuses the first's teams).
 */
function chooseTeamTriple(
  standings: TeamId[],
  hadTriple: ReadonlySet<TeamId>,
): [TeamId, TeamId, TeamId] {
  const chosen: TeamId[] = [];

  // Prefer the lowest-ranked teams without a prior triple (bottom-up).
  for (let i = standings.length - 1; i >= 0 && chosen.length < 3; i--) {
    if (!hadTriple.has(standings[i])) {
      chosen.push(standings[i]);
    }
  }

  // Top up (field exhausted) with the remaining lowest-ranked teams.
  for (let i = standings.length - 1; i >= 0 && chosen.length < 3; i--) {
    if (!chosen.includes(standings[i])) {
      chosen.push(standings[i]);
    }
  }

  const [a, b, c] = chosen.sort((x, y) => x - y);
  return [a, b, c];
}

/**
 * Depth-first pairing of teams in standing order, preferring to avoid repeat
 * opponents. The ideal draw is adjacent teams (1v2, 3v4, ...); the search tries
 * the nearest-ranked available partner first and backtracks, falling back to
 * the fewest-repeats assignment if no repeat-free pairing exists. Mirrors the
 * Swiss Pairs `pairUp`, minus the bye handling (the field is always even).
 */
function pairUp(
  ordered: TeamId[],
  playedOpponents: ReadonlySet<string>,
): { matches: TeamsMatch[]; hadUnavoidableRepeat: boolean } {
  const n = ordered.length;
  const used = new Array<boolean>(n).fill(false);

  let bestMatches: TeamsMatch[] | null = null;
  let bestRepeats = Number.POSITIVE_INFINITY;

  const current: TeamsMatch[] = [];

  const search = (placed: number, repeats: number): void => {
    if (repeats >= bestRepeats) return;

    if (placed === n) {
      bestMatches = current.slice();
      bestRepeats = repeats;
      return;
    }

    let i = 0;
    while (i < n && used[i]) i++;

    used[i] = true;
    for (let j = i + 1; j < n; j++) {
      if (used[j]) continue;
      used[j] = true;
      const repeat = playedOpponents.has(
        teamOpponentKey(ordered[i], ordered[j]),
      )
        ? 1
        : 0;
      current.push(normalizeMatch(ordered[i], ordered[j]));
      search(placed + 2, repeats + repeat);
      current.pop();
      used[j] = false;

      if (bestRepeats === 0) {
        used[i] = false;
        return;
      }
    }
    used[i] = false;
  };

  search(0, 0);

  return {
    // search() always completes a full pairing for a non-empty even field, so
    // bestMatches is set; the `?? []` arm is unreachable defensive code.
    /* v8 ignore next */
    matches: bestMatches ?? [],
    hadUnavoidableRepeat: bestRepeats > 0,
  };
}

/**
 * Draw the next Swiss Teams round from the current standings, avoiding repeat
 * opponents where possible (least-repeats fallback otherwise).
 *
 * Even field: every team is paired; `byeTeamId` and `triple` are null. Odd
 * field: resolved per this round's plan entry (`oddRound`, default "BYE"):
 *   - "BYE": the lowest-ranked team without a prior bye sits out (see
 *     {@link chooseTeamBye}) and the remaining even field is paired.
 *   - SHORT / LONG: the lowest-ranked three without a recent triple (see
 *     {@link chooseTeamTriple}) form a three-way and the remaining even field
 *     is paired. The returned `triple.kind` records SHORT vs LONG.
 * The chosen resolution is reported on `byeTeamId` / `triple`.
 *
 * NOTE: this draws the FIRST slot of a LONG triple (and SHORT triples). The
 * SECOND slot of a long triple is NOT drawn here — it reuses the first slot's
 * teams (see {@link continueLongTriple}); the draw service must detect a round
 * scheduled as a long triple's second slot and not draw a fresh round for it.
 */
export function drawSwissTeamsRound(
  input: SwissTeamsDrawInputWithBye,
): SwissTeamsDrawResult {
  const { standings, playedOpponents, hadBye, hadTriple, fixedTriple } = input;
  const oddRound = input.oddRound ?? "BYE";

  const isOdd = standings.length % 2 === 1;
  const useTriple = isOdd && oddRound !== "BYE";

  const byeTeamId =
    isOdd && !useTriple ? chooseTeamBye(standings, hadBye ?? new Set()) : null;

  let triple: TeamsTriple | null = null;
  if (useTriple) {
    // A long triple's second slot has its three teams fixed by its first slot,
    // so use the supplied triple verbatim rather than choosing a fresh one.
    if (fixedTriple) {
      triple = fixedTriple;
    } else {
      const [a, b, c] = chooseTeamTriple(standings, hadTriple ?? new Set());
      triple = makeTriple(a, b, c, oddRound);
    }
  }

  const removed = new Set<TeamId>();
  if (byeTeamId !== null) removed.add(byeTeamId);
  if (triple !== null) {
    removed.add(triple.a);
    removed.add(triple.b);
    removed.add(triple.c);
  }
  const playing = standings.filter((id) => !removed.has(id));

  const { matches, hadUnavoidableRepeat } = pairUp(playing, playedOpponents);

  return {
    matches: sortMatches(matches),
    hadUnavoidableRepeat,
    byeTeamId,
    triple,
  };
}

/**
 * Translate the director's event-level `oddHandling` plus the per-round
 * `oddRoundPlan` into THIS round's {@link OddRoundResolution} (1-indexed round).
 *
 * - "BYE" handling (or no triple plan): always a bye.
 * - "TRIPLE" handling: the plan's entry for the round (`oddRoundPlan[round-1]`)
 *   — a "BYE", a "SHORT" triple, or a `{ kind: "LONG"; group }` slot. If the
 *   plan is missing or shorter than the round (shouldn't happen once the schema
 *   validates length === rounds), it falls back to a bye.
 *
 * The `oddRoundPlan` entry shape is exactly {@link OddRoundResolution}, so this
 * is really a lookup with safe defaults; it lives here so both the start
 * (round 1) and draw (later rounds) paths share one translation.
 */
export function roundOddResolution(
  oddHandling: OddHandling | undefined,
  oddRoundPlan: readonly OddRoundResolution[] | undefined,
  roundNumber: number,
): OddRoundResolution {
  if (oddHandling !== "TRIPLE") return "BYE";
  return oddRoundPlan?.[roundNumber - 1] ?? "BYE";
}

/**
 * Build the SECOND slot of a long triple from its first slot. The three teams
 * are unchanged (a long triple is one three-way spread over two rounds); only
 * `slot` advances to 2. The draw service calls this for a round scheduled as a
 * long triple's second entry rather than drawing a fresh round.
 */
export function continueLongTriple(firstSlot: TeamsTriple): TeamsTriple {
  return { ...firstSlot, slot: 2 };
}

/**
 * Expand a round's team matches into physical pair-seat placements: two tables
 * per match (each team's home table), with the home team's home pair NS and the
 * opponent's away pair EW. Placements are returned in ascending table order.
 *
 * The home table for a team is its stable id (team T is at table T), so the
 * home pair never moves; only away pairs travel to the opponent's home table.
 */
export function expandTeamMatches(matches: TeamsMatch[]): TeamsSeatPlacement[] {
  const placements: TeamsSeatPlacement[] = [];

  for (const match of matches) {
    // Open room at A's home: A home pair (NS) vs B away pair (EW).
    placements.push({ tableNumber: match.a, nsTeam: match.a, ewTeam: match.b });
    // Closed room at B's home: B home pair (NS) vs A away pair (EW).
    placements.push({ tableNumber: match.b, nsTeam: match.b, ewTeam: match.a });
  }

  return placements.sort((x, y) => x.tableNumber - y.tableNumber);
}

/**
 * Expand a triple into its three head-to-head comparisons (x-y, y-z, z-x for
 * teams x < y < z), each with its two physical table-rows and board set.
 *
 * The six table-rows follow §4 of the design (left = NS pair's team, right =
 * away EW pair's team; home NS pairs never move):
 *
 *   | home NS | away EW | board set |
 *   | ------- | ------- | --------- |
 *   | x       | y       | A         |  ┐ x-y comparison (set A)
 *   | y       | x       | A         |  ┘
 *   | y       | z       | B         |  ┐ y-z comparison (set B)
 *   | z       | y       | B         |  ┘
 *   | z       | x       | C         |  ┐ z-x comparison (set C)
 *   | x       | z       | C         |  ┘
 *
 * So each comparison is an ordinary two-team match (two rooms sharing a board
 * set): x-y on A, y-z on B, z-x on C. For a SHORT triple A/B/C are three
 * disjoint half-sized sets within one round; for a LONG triple each comparison
 * plays over full boards with its first room in round R and its second in R+1
 * (the board subset tags still mark the two rooms as A/B/C for a stable
 * identity — the materializer maps them to the two rounds' board ranges).
 *
 * The comparisons are returned in A, B, C order; each comparison's `low`/`high`
 * are its two teams in ascending id order, and its `rows` are the two rooms
 * (home NS team at its own table, away EW team travelling in).
 */
export function expandTeamTriple(triple: TeamsTriple): TripleComparison[] {
  const { a: x, b: y, c: z } = triple;

  // Each comparison: the two teams, the two rooms, and its board set.
  // Room 1 is the "first half" row (half 1 / round R), room 2 the mirror.
  const comparison = (
    firstHomeNs: TeamId,
    firstAwayEw: TeamId,
    boardSet: TripleBoardSet,
  ): TripleComparison => {
    const rows: TeamsSeatPlacement[] = [
      {
        tableNumber: firstHomeNs,
        nsTeam: firstHomeNs,
        ewTeam: firstAwayEw,
      },
      {
        tableNumber: firstAwayEw,
        nsTeam: firstAwayEw,
        ewTeam: firstHomeNs,
      },
    ];
    const [low, high] =
      firstHomeNs < firstAwayEw
        ? [firstHomeNs, firstAwayEw]
        : [firstAwayEw, firstHomeNs];
    return { low, high, rows, boardSet };
  };

  return [
    comparison(x, y, "A"), // x-y on set A
    comparison(y, z, "B"), // y-z on set B
    comparison(z, x, "C"), // z-x on set C
  ];
}

/** Order a match's ids so the lower id is `a` (canonical form). */
function normalizeMatch(x: TeamId, y: TeamId): TeamsMatch {
  return x <= y ? { a: x, b: y } : { a: y, b: x };
}

/** Sort matches by their lower team id for a stable, readable order. */
function sortMatches(matches: TeamsMatch[]): TeamsMatch[] {
  return [...matches].sort((m, n) => m.a - n.a);
}

// --- Director editing of a drawn teams round ------------------------------
//
// The director can hand-adjust a drawn round before committing it. A teams
// round has no seats or directions to shuffle (home tables are fixed and only
// away pairs travel), so the single edit primitive is "swap two teams": wherever
// team X is placed this round — in a match, as the bye, or in the triple —
// team Y now sits, and vice versa. That one operation covers every case
// (swapping two match teams re-pairs both matches; swapping a match team with
// the bye changes who sits out; swapping into the triple changes the
// three-way), and each team still appears exactly once, so the result is always
// structurally valid. The edited round is re-evaluated with
// {@link evaluateSwissTeamsRound} so the repeat advisory reflects the change.

/**
 * A whole drawn round as plain, editable data: the matches plus the odd-field
 * resolution (a bye team or a triple, at most one of which is set). This is
 * what the director edits and what a commit persists verbatim.
 */
export interface SwissTeamsRound {
  matches: TeamsMatch[];
  byeTeamId: TeamId | null;
  triple: TeamsTriple | null;
}

/** Every team id placed in a round (matches + bye + triple), order-agnostic. */
export function roundTeamIds(round: SwissTeamsRound): TeamId[] {
  const ids: TeamId[] = [];
  for (const m of round.matches) ids.push(m.a, m.b);
  if (round.byeTeamId != null) ids.push(round.byeTeamId);
  if (round.triple != null) {
    ids.push(round.triple.a, round.triple.b, round.triple.c);
  }
  return ids;
}

/**
 * Swap the positions of two teams in a drawn round. Wherever `teamX` is placed
 * (a match slot, the bye, or a triple slot) `teamY` now sits, and vice versa;
 * every other placement is untouched. Matches and the triple are re-normalised
 * to canonical (ascending-id) order so the result is stable and comparable. A
 * triple's `kind`/`group`/`slot` are preserved (only the member ids change).
 *
 * If either team is not part of the round, or the two are the same team, the
 * round is returned unchanged (deep-copied). Each team still appears exactly
 * once, so a swap never breaks structural validity.
 */
export function swapTeams(
  round: SwissTeamsRound,
  teamX: TeamId,
  teamY: TeamId,
): SwissTeamsRound {
  const copy = (): SwissTeamsRound => ({
    matches: round.matches.map((m) => ({ ...m })),
    byeTeamId: round.byeTeamId,
    triple: round.triple ? { ...round.triple } : null,
  });

  if (teamX === teamY) return copy();

  const present = new Set(roundTeamIds(round));
  if (!present.has(teamX) || !present.has(teamY)) return copy();

  const swap = (id: TeamId): TeamId =>
    id === teamX ? teamY : id === teamY ? teamX : id;

  return {
    matches: sortMatches(
      round.matches.map((m) => normalizeMatch(swap(m.a), swap(m.b))),
    ),
    byeTeamId: round.byeTeamId == null ? null : swap(round.byeTeamId),
    triple: round.triple
      ? normalizeTriple(round.triple, swap)
      : null,
  };
}

/**
 * Re-normalise a triple after a member swap: its three (possibly changed) ids
 * are re-sorted ascending so the comparison cycle stays deterministic, while
 * its `kind`/`group`/`slot` are preserved.
 */
function normalizeTriple(
  triple: TeamsTriple,
  swap: (id: TeamId) => TeamId,
): TeamsTriple {
  const [a, b, c] = [swap(triple.a), swap(triple.b), swap(triple.c)].sort(
    (p, q) => p - q,
  );
  return { ...triple, a, b, c };
}

/** A per-round advisory for a teams draw, keyed so the UI can flag specifics. */
export interface SwissTeamsRoundAdvisories {
  /** True when the round is not a valid complete arrangement (see reasons). */
  structuralError: boolean;
  /** Human-readable structural problems (a team placed twice, wrong count, …). */
  structuralReasons: string[];
  /** Unordered team-pair keys of matches that repeat a previously-played opponent. */
  repeats: string[];
  /** True when any drawn match repeats a prior opponent. */
  hadUnavoidableRepeat: boolean;
}

/**
 * The advisory-relevant history for a teams round, in a JSON-serializable shape
 * (the Set flattened to an array). The server sends this with a draw preview so
 * the director's device can re-run {@link evaluateSwissTeamsRound} locally after
 * each edit — no round-trip, identical logic to the server's initial draw.
 */
export interface SerializableTeamsAdvisoryInputs {
  /** Number of teams in play (must be even overall; odd fields use bye/triple). */
  teams: number;
  /** Unordered team-pair opponent keys already played (see {@link teamOpponentKey}). */
  playedOpponents: string[];
}

/**
 * Evaluate ANY teams round (a fresh draw or a director-edited one) against the
 * event history, reporting structural validity plus the specific repeat matches.
 * Pure, so it runs identically on the server (initial draw) and the client
 * (after each edit) with no round-trip.
 *
 * A triple's three head-to-head comparisons (x-y, y-z, z-x) are each checked
 * against history too, so a repeat inside a triple is surfaced. It never
 * rejects — a director override may intentionally create a repeat; this only
 * *reports* so the UI can warn.
 */
export function evaluateSwissTeamsRound(
  round: SwissTeamsRound,
  inputs: SerializableTeamsAdvisoryInputs,
): SwissTeamsRoundAdvisories {
  const played = new Set(inputs.playedOpponents);

  // Structural checks: every team placed exactly once, covering the whole field.
  const structuralReasons: string[] = [];
  const placed = roundTeamIds(round);
  const counts = new Map<TeamId, number>();
  for (const id of placed) counts.set(id, (counts.get(id) ?? 0) + 1);

  for (const id of teamIds(inputs.teams)) {
    const c = counts.get(id) ?? 0;
    if (c === 0) structuralReasons.push(`Team ${id} is not placed`);
    if (c > 1) structuralReasons.push(`Team ${id} is placed more than once`);
  }
  for (const [id] of counts) {
    if (id < 1 || id > inputs.teams) {
      structuralReasons.push(`Unknown team ${id} is placed`);
    }
  }

  // Repeat matchups: each drawn match plus each of a triple's three edges.
  const repeats: string[] = [];
  const addIfRepeat = (a: TeamId, b: TeamId) => {
    const key = teamOpponentKey(a, b);
    if (played.has(key)) repeats.push(key);
  };
  for (const m of round.matches) addIfRepeat(m.a, m.b);
  if (round.triple) {
    addIfRepeat(round.triple.a, round.triple.b);
    addIfRepeat(round.triple.b, round.triple.c);
    addIfRepeat(round.triple.a, round.triple.c);
  }

  return {
    structuralError: structuralReasons.length > 0,
    structuralReasons,
    repeats,
    hadUnavoidableRepeat: repeats.length > 0,
  };
}
