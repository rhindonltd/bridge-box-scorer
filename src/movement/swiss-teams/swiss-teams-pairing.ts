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
 * from the current standings, avoiding repeat opponents. Unlike Swiss Pairs
 * there are no byes and no stationary/direction handling: the team count is
 * required to be even (odd counts need three-way "triangle" handling, which is
 * out of scope), home pairs never move, and only away pairs travel.
 *
 * This module is framework/IO-free: all persistence, scoring and socket
 * plumbing lives elsewhere.
 */

/** A team's stable id for the whole event: its home table number (1..teams). */
export type TeamId = number;

/** A single drawn match between two teams for one round. */
export interface TeamsMatch {
  /** The two team ids meeting this round (order is not significant). */
  a: TeamId;
  b: TeamId;
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

/** The drawn next round plus any advisories the director should see. */
export interface SwissTeamsDrawResult {
  /** The matches for the round, in ascending lower-team-id order. */
  matches: TeamsMatch[];
  /**
   * True when at least one drawn match repeats a pairing already played (only
   * ever set when no repeat-free complete pairing exists).
   */
  hadUnavoidableRepeat: boolean;
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
 * @throws if the team count is odd (see module docstring: odd counts are out
 *   of scope). Callers validate this earlier and surface a director message.
 */
export function swissTeamsRoundOne(
  teams: number,
  seed: number,
): TeamsMatch[] {
  if (teams % 2 !== 0) {
    throw new Error(`Swiss Teams requires an even team count, got ${teams}`);
  }

  const rng = mulberry32(seed);
  const order = shuffle(teamIds(teams), rng);

  const matches: TeamsMatch[] = [];
  for (let i = 0; i < order.length; i += 2) {
    matches.push(normalizeMatch(order[i], order[i + 1]));
  }

  return sortMatches(matches);
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
    matches: bestMatches ?? [],
    hadUnavoidableRepeat: bestRepeats > 0,
  };
}

/**
 * Draw the next Swiss Teams round from the current standings, avoiding repeat
 * opponents where possible (least-repeats fallback otherwise). The field is
 * assumed even; there are no byes.
 *
 * @throws if the standings length is odd.
 */
export function drawSwissTeamsRound(
  input: SwissTeamsDrawInput,
): SwissTeamsDrawResult {
  const { standings, playedOpponents } = input;

  if (standings.length % 2 !== 0) {
    throw new Error(
      `Swiss Teams requires an even team count, got ${standings.length}`,
    );
  }

  const { matches, hadUnavoidableRepeat } = pairUp(standings, playedOpponents);

  return { matches: sortMatches(matches), hadUnavoidableRepeat };
}

/**
 * Expand a round's team matches into physical pair-seat placements: two tables
 * per match (each team's home table), with the home team's home pair NS and the
 * opponent's away pair EW. Placements are returned in ascending table order.
 *
 * The home table for a team is its stable id (team T is at table T), so the
 * home pair never moves; only away pairs travel to the opponent's home table.
 */
export function expandTeamMatches(
  matches: TeamsMatch[],
): TeamsSeatPlacement[] {
  const placements: TeamsSeatPlacement[] = [];

  for (const match of matches) {
    // Open room at A's home: A home pair (NS) vs B away pair (EW).
    placements.push({ tableNumber: match.a, nsTeam: match.a, ewTeam: match.b });
    // Closed room at B's home: B home pair (NS) vs A away pair (EW).
    placements.push({ tableNumber: match.b, nsTeam: match.b, ewTeam: match.a });
  }

  return placements.sort((x, y) => x.tableNumber - y.tableNumber);
}

/** Order a match's ids so the lower id is `a` (canonical form). */
function normalizeMatch(x: TeamId, y: TeamId): TeamsMatch {
  return x <= y ? { a: x, b: y } : { a: y, b: x };
}

/** Sort matches by their lower team id for a stable, readable order. */
function sortMatches(matches: TeamsMatch[]): TeamsMatch[] {
  return [...matches].sort((m, n) => m.a - n.a);
}
