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
 *   - "TRIANGLE": three teams play a three-way this round (the bottom three
 *     tables in round 1, then the lowest-ranked three without a recent triangle);
 *     the remaining even field is paired normally. A triangle is scored
 *     cross-IMP/Butler across its three tables — see the scoring layer.
 * The three chosen teams meet as A-NS/B-EW, B-NS/C-EW, C-NS/A-EW so every team
 * plays every other over the round's boards (all three tables play all boards).
 *
 * This module is framework/IO-free: all persistence, scoring and socket
 * plumbing lives elsewhere.
 */

/** A team's stable id for the whole event: its home table number (1..teams). */
export type TeamId = number;

/** How an odd team field is resolved for a round. */
export type OddHandling = "BYE" | "TRIANGLE";

/** A single drawn match between two teams for one round. */
export interface TeamsMatch {
  /** The two team ids meeting this round (order is not significant). */
  a: TeamId;
  b: TeamId;
}

/**
 * A three-way "triangle" for one round: three teams that play each other over
 * the round's boards. Stored in ascending id order (`a < b < c`). The seating
 * cycle is fixed by that order: A-NS vs B-EW, B-NS vs C-EW, C-NS vs A-EW.
 */
export interface TeamsTriangle {
  a: TeamId;
  b: TeamId;
  c: TeamId;
}

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
   * How an odd field is resolved this round. Defaults to "BYE". Ignored when
   * the field is even.
   */
  oddHandling?: OddHandling;
  /**
   * Teams that have already had a bye (each may only sit out once until the
   * field is exhausted). Only consulted for an odd "BYE" field. Optional;
   * defaults to none.
   */
  hadBye?: ReadonlySet<TeamId>;
  /**
   * Teams that have already been in a triangle (each takes a triangle at most
   * once until the field is exhausted). Only consulted for an odd "TRIANGLE"
   * field. Optional; defaults to none.
   */
  hadTriangle?: ReadonlySet<TeamId>;
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
   * field is even or a triangle was used. The bye team plays no match and is
   * credited an average-plus result in the standings.
   */
  byeTeamId: TeamId | null;
  /**
   * The three-way triangle for this round (odd field, triangle handling), or
   * null when the field is even or a bye was used. The three teams play a
   * three-way and are scored cross-IMP across their tables.
   */
  triangle: TeamsTriangle | null;
}

/** Round 1 matches plus the odd-field resolution (bye team or triangle). */
export interface SwissTeamsRoundOneResult {
  matches: TeamsMatch[];
  byeTeamId: TeamId | null;
  triangle: TeamsTriangle | null;
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
 * Round 1 is a random pairing of the teams (there are no standings yet). The
 * teams are shuffled with a seeded PRNG and paired off two at a time, so the
 * result is deterministic for a given seed. Matches are returned in ascending
 * lower-team-id order.
 *
 * Odd field: there are no standings yet, so the odd resolution is deterministic
 * (bottom tables) rather than random. Under "BYE" the BOTTOM table (highest id)
 * sits out and the remaining `teams - 1` are shuffled and paired. Under
 * "TRIANGLE" the bottom THREE tables (`teams-2, teams-1, teams`) form the
 * triangle and the remaining `teams - 3` (an even count) are shuffled and
 * paired. The chosen resolution is reported on `byeTeamId` / `triangle`.
 */
export function swissTeamsRoundOne(
  teams: number,
  seed: number,
  oddHandling: OddHandling = "BYE",
): SwissTeamsRoundOneResult {
  const isOdd = teams % 2 !== 0;
  const useTriangle = isOdd && oddHandling === "TRIANGLE";

  // Odd field: the bottom table(s) take the round-1 bye/triangle; pair the rest.
  const byeTeamId = isOdd && !useTriangle ? teams : null;
  const triangle: TeamsTriangle | null = useTriangle
    ? { a: teams - 2, b: teams - 1, c: teams }
    : null;

  const removed = new Set<TeamId>();
  if (byeTeamId !== null) removed.add(byeTeamId);
  if (triangle !== null) {
    removed.add(triangle.a);
    removed.add(triangle.b);
    removed.add(triangle.c);
  }
  const playing = teamIds(teams).filter((id) => !removed.has(id));

  const rng = mulberry32(seed);
  const order = shuffle(playing, rng);

  const matches: TeamsMatch[] = [];
  for (let i = 0; i < order.length; i += 2) {
    matches.push(normalizeMatch(order[i], order[i + 1]));
  }

  return { matches: sortMatches(matches), byeTeamId, triangle };
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
 * Choose the three teams for an odd field's triangle: the lowest-ranked three
 * (nearest the bottom of the standings) that have not already been in a
 * triangle, scanning bottom-up. Once fewer than three such teams remain (the
 * field has been through a full cycle of triangles), the pool is topped up with
 * the remaining lowest-ranked teams so a triangle is always formed. Returned in
 * ascending id order so the seating cycle (A-NS/B-EW, B-NS/C-EW, C-NS/A-EW) is
 * deterministic. Analogous to {@link chooseTeamBye}.
 */
function chooseTeamTriangle(
  standings: TeamId[],
  hadTriangle: ReadonlySet<TeamId>,
): TeamsTriangle {
  const chosen: TeamId[] = [];

  // Prefer the lowest-ranked teams without a prior triangle (bottom-up).
  for (let i = standings.length - 1; i >= 0 && chosen.length < 3; i--) {
    if (!hadTriangle.has(standings[i])) {
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
  return { a, b, c };
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
 * Even field: every team is paired; `byeTeamId` and `triangle` are null. Odd
 * field: resolved per `oddHandling` (default "BYE"):
 *   - "BYE": the lowest-ranked team without a prior bye sits out (see
 *     {@link chooseTeamBye}) and the remaining even field is paired.
 *   - "TRIANGLE": the lowest-ranked three without a recent triangle (see
 *     {@link chooseTeamTriangle}) form a three-way and the remaining even field
 *     is paired.
 * The chosen resolution is reported on `byeTeamId` / `triangle`.
 */
export function drawSwissTeamsRound(
  input: SwissTeamsDrawInputWithBye,
): SwissTeamsDrawResult {
  const { standings, playedOpponents, hadBye, hadTriangle } = input;
  const oddHandling = input.oddHandling ?? "BYE";

  const isOdd = standings.length % 2 === 1;
  const useTriangle = isOdd && oddHandling === "TRIANGLE";

  const byeTeamId =
    isOdd && !useTriangle ? chooseTeamBye(standings, hadBye ?? new Set()) : null;
  const triangle = useTriangle
    ? chooseTeamTriangle(standings, hadTriangle ?? new Set())
    : null;

  const removed = new Set<TeamId>();
  if (byeTeamId !== null) removed.add(byeTeamId);
  if (triangle !== null) {
    removed.add(triangle.a);
    removed.add(triangle.b);
    removed.add(triangle.c);
  }
  const playing = standings.filter((id) => !removed.has(id));

  const { matches, hadUnavoidableRepeat } = pairUp(playing, playedOpponents);

  return {
    matches: sortMatches(matches),
    hadUnavoidableRepeat,
    byeTeamId,
    triangle,
  };
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
 * Expand a round's triangle into its three physical pair-seat placements — one
 * per home table — following the fixed cycle for teams A < B < C:
 *   - table A: A home pair (NS) vs B away pair (EW),
 *   - table B: B home pair (NS) vs C away pair (EW),
 *   - table C: C home pair (NS) vs A away pair (EW).
 * All three tables play the round's whole board set, so every team meets both
 * others; the cross-IMP scorer compares the three tables board by board.
 * Placements are returned in ascending table order.
 */
export function expandTeamTriangle(
  triangle: TeamsTriangle,
): TeamsSeatPlacement[] {
  const { a, b, c } = triangle;
  return [
    { tableNumber: a, nsTeam: a, ewTeam: b },
    { tableNumber: b, nsTeam: b, ewTeam: c },
    { tableNumber: c, nsTeam: c, ewTeam: a },
  ].sort((x, y) => x.tableNumber - y.tableNumber);
}

/** Order a match's ids so the lower id is `a` (canonical form). */
function normalizeMatch(x: TeamId, y: TeamId): TeamsMatch {
  return x <= y ? { a: x, b: y } : { a: y, b: x };
}

/** Sort matches by their lower team id for a stable, readable order. */
function sortMatches(matches: TeamsMatch[]): TeamsMatch[] {
  return [...matches].sort((m, n) => m.a - n.a);
}
