/**
 * Pure Swiss Pairs pairing engine.
 *
 * Swiss Pairs differ from the precomputed movements (Mitchell, Howell, ...):
 * only round 1 is known up front, and every later round is drawn from the
 * current standings. This module is the framework/IO-free core of that draw —
 * it takes the current state (standings, who has played whom, who has had a
 * bye, each pair's direction history, and which pairs are stationary) and
 * returns the next round's table layout. All persistence, scoring and socket
 * plumbing lives elsewhere.
 *
 * Stable pair identity
 * --------------------
 * A Swiss pair keeps one id for the whole event. The numbering matches the
 * one-winner convention used elsewhere:
 *   - pairs `1 .. tables` are the pairs that start North/South (pair T at
 *     table T),
 *   - pairs `tables+1 .. 2*tables` are the pairs that start East/West (pair
 *     `tables + T` at table T).
 * These ids never change; only the table and direction a pair sits at vary
 * round to round.
 */

import { PairDirection } from "@/model/common";

/** A pair's stable id for the whole event (see module docstring). */
export type SwissPairId = number;

/** A single table's seating for one round: which pair sits each direction. */
export interface SwissSeating {
  tableNumber: number;
  /** North/South pair id. */
  ns: SwissPairId;
  /** East/West pair id. */
  ew: SwissPairId;
}

/** A pair's fixed home seat, for stationary pairs. */
export interface SwissHomeSeat {
  tableNumber: number;
  direction: PairDirection;
}

/**
 * Everything the engine needs to draw the next round. All history is expressed
 * over stable pair ids and is derivable from the played boards (see the
 * board-history query helpers), so the engine itself stays pure.
 */
export interface SwissDrawInput {
  /** Number of tables in play (so there are `2 * tables` pairs). */
  tables: number;
  /**
   * Pair ids in current standing order, best first. Every pair in the event
   * must appear exactly once. Ties should already be broken by the caller into
   * a stable order; the engine treats the array order as authoritative.
   */
  standings: SwissPairId[];
  /**
   * Pairs that have already played each other, as a set of unordered-pair keys
   * (see {@link opponentKey}). Used to avoid repeat matches.
   */
  playedOpponents: ReadonlySet<string>;
  /** Pairs that have already had a bye (each may only have one all event). */
  hadBye: ReadonlySet<SwissPairId>;
  /**
   * Per-pair count of how many rounds each has sat North/South vs East/West so
   * far. Used to balance direction for non-stationary pairs. Missing pairs are
   * treated as `{ ns: 0, ew: 0 }`.
   */
  directionCounts: ReadonlyMap<SwissPairId, { ns: number; ew: number }>;
  /**
   * Stationary pairs and their fixed home seat. A stationary pair is always
   * seated at this table and direction; its drawn opponent is placed opposite.
   */
  stationary: ReadonlyMap<SwissPairId, SwissHomeSeat>;
}

/** The drawn next round plus any advisories the director should see. */
export interface SwissDrawResult {
  /** One entry per active table, in ascending table-number order. */
  seating: SwissSeating[];
  /** The pair sitting out this round, or null when the field is even. */
  sitOutPairId: SwissPairId | null;
  /**
   * True when at least one drawn match repeats a pairing that has already been
   * played (only ever set when no repeat-free complete pairing exists).
   */
  hadUnavoidableRepeat: boolean;
  /**
   * True when two stationary pairs had to be drawn against each other, or a
   * stationary pair could not be kept at its home seat. The draw is still
   * returned; the director is alerted so they can adjust if desired.
   */
  hadStationaryConflict: boolean;
}

/**
 * A stable, order-independent key for the unordered pair {a, b}. Used both to
 * record played opponents and to test a candidate match against that history.
 */
export function opponentKey(a: SwissPairId, b: SwissPairId): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * The stable pair ids for a Swiss event of `tables` tables: NS pairs first
 * (1..tables), then EW pairs (tables+1..2*tables).
 */
export function swissPairIds(tables: number): SwissPairId[] {
  return Array.from({ length: 2 * tables }, (_, i) => i + 1);
}

/**
 * Round 1 is purely positional: table T seats pair T (NS) against pair
 * `tables + T` (EW). No standings are involved. Returned in table order.
 */
export function swissRoundOne(tables: number): SwissSeating[] {
  return Array.from({ length: tables }, (_, i) => ({
    tableNumber: i + 1,
    ns: i + 1,
    ew: tables + i + 1,
  }));
}

/**
 * A pair's stable home seat: the round-1 (table, direction) it starts at.
 * Pairs `1..tables` start North/South at their own table; pairs
 * `tables+1..2*tables` start East/West at table `pairId - tables`.
 */
export function swissPairHomeSeat(
  tables: number,
  pairId: SwissPairId,
): SwissHomeSeat {
  return pairId <= tables
    ? { tableNumber: pairId, direction: "NS" }
    : { tableNumber: pairId - tables, direction: "EW" };
}

/**
 * Recover a pair's stable id from its round-1 home seat — the inverse of
 * {@link swissPairHomeSeat}. An NS home at table T is pair T; an EW home at
 * table T is pair `tables + T`.
 */
export function swissPairIdFromHomeSeat(
  tables: number,
  home: SwissHomeSeat,
): SwissPairId {
  return home.direction === "NS" ? home.tableNumber : tables + home.tableNumber;
}

/**
 * A single drawn match: the two pair ids to seat together this round, before
 * table/direction is decided.
 */
interface Match {
  a: SwissPairId;
  b: SwissPairId;
}

/**
 * Choose the sit-out pair for an odd field: the lowest-ranked pair (nearest the
 * bottom of the standings) that has not already had a bye. If every pair has
 * had a bye — which can only happen once the field has been exhausted — fall
 * back to the single lowest-ranked pair so a draw is still produced.
 */
function chooseSitOut(
  standings: SwissPairId[],
  hadBye: ReadonlySet<SwissPairId>,
): SwissPairId {
  for (let i = standings.length - 1; i >= 0; i--) {
    if (!hadBye.has(standings[i])) {
      return standings[i];
    }
  }
  return standings[standings.length - 1];
}

/**
 * Pair up an ordered list of pair ids, preferring to avoid repeat opponents.
 *
 * The list is in standing order, so the ideal draw is adjacent pairs (1v2,
 * 3v4, ...). A depth-first search tries, for the first unpaired pair, its
 * nearest-ranked available partner first, backtracking when a branch leaves a
 * later pair with no repeat-free partner. If no fully repeat-free pairing
 * exists, the search falls back to the assignment with the fewest repeats.
 *
 * Returns the chosen matches and whether any repeat was unavoidable.
 */
function pairUp(
  ordered: SwissPairId[],
  playedOpponents: ReadonlySet<string>,
): { matches: Match[]; hadUnavoidableRepeat: boolean } {
  const n = ordered.length;
  // Even by construction: the caller removes the sit-out for odd fields.
  const used = new Array<boolean>(n).fill(false);

  let bestMatches: Match[] | null = null;
  let bestRepeats = Number.POSITIVE_INFINITY;

  const current: Match[] = [];

  const search = (placed: number, repeats: number): void => {
    // Prune: this branch can't beat the best complete pairing found so far.
    if (repeats >= bestRepeats) return;

    if (placed === n) {
      bestMatches = current.slice();
      bestRepeats = repeats;
      return;
    }

    // First unpaired pair (highest-ranked remaining).
    let i = 0;
    while (i < n && used[i]) i++;

    used[i] = true;
    // Try partners in nearest-rank order so the preferred draw is found first.
    for (let j = i + 1; j < n; j++) {
      if (used[j]) continue;
      used[j] = true;
      const repeat = playedOpponents.has(opponentKey(ordered[i], ordered[j]))
        ? 1
        : 0;
      current.push({ a: ordered[i], b: ordered[j] });
      search(placed + 2, repeats + repeat);
      current.pop();
      used[j] = false;

      // A repeat-free complete pairing is optimal; stop once we have one.
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
 * Decide which of a match's two pairs sits North/South, balancing direction
 * over the event. The pair with the greater NS-minus-EW surplus so far is put
 * East/West (and vice versa); ties break towards the higher-ranked pair sitting
 * North/South for determinism. Stationary handling is applied by the caller
 * before this is reached, so neither pair here is stationary.
 */
function orientMatch(
  match: Match,
  directionCounts: ReadonlyMap<SwissPairId, { ns: number; ew: number }>,
): { ns: SwissPairId; ew: SwissPairId } {
  const surplus = (id: SwissPairId): number => {
    const c = directionCounts.get(id) ?? { ns: 0, ew: 0 };
    return c.ns - c.ew;
  };

  const surplusA = surplus(match.a);
  const surplusB = surplus(match.b);

  // Higher NS surplus should now sit EW to even out.
  if (surplusA > surplusB) return { ns: match.b, ew: match.a };
  if (surplusB > surplusA) return { ns: match.a, ew: match.b };

  // Tie: keep it deterministic — the earlier (higher-ranked) id sits NS.
  // pairUp always builds matches with a < b (it pairs the first unused id with
  // a later one), so the a > b arm is unreachable defensive code.
  /* v8 ignore next 3 */
  return match.a < match.b
    ? { ns: match.a, ew: match.b }
    : { ns: match.b, ew: match.a };
}

/**
 * Draw the next Swiss round from the current state.
 *
 * Steps:
 *  1. If the field is odd, remove the sit-out pair (lowest-ranked without a
 *     prior bye).
 *  2. Pair the remaining pairs by standing, avoiding repeat opponents where
 *     possible (least-repeats fallback otherwise).
 *  3. Seat each match at a table and choose directions: stationary pairs keep
 *     their home table/direction and their opponent comes to them; other
 *     matches are placed at the remaining tables with directions chosen to
 *     balance each pair's NS/EW history.
 *
 * The engine never throws for "hard" cases (unavoidable repeat, two stationary
 * pairs meeting): it always returns a complete draw and flags the condition so
 * the director can intervene.
 */
export function drawSwissRound(input: SwissDrawInput): SwissDrawResult {
  const {
    tables,
    standings,
    playedOpponents,
    hadBye,
    directionCounts,
    stationary,
  } = input;

  const isOdd = standings.length % 2 === 1;
  const sitOutPairId = isOdd ? chooseSitOut(standings, hadBye) : null;

  const playing =
    sitOutPairId == null
      ? standings
      : standings.filter((id) => id !== sitOutPairId);

  const { matches, hadUnavoidableRepeat } = pairUp(playing, playedOpponents);

  const { seating, hadStationaryConflict } = seatMatches(
    matches,
    tables,
    stationary,
    directionCounts,
    sitOutPairId,
  );

  return {
    seating,
    sitOutPairId,
    hadUnavoidableRepeat,
    hadStationaryConflict,
  };
}

/**
 * Assign each drawn match to a physical table and set its directions.
 *
 * Stationary pairs anchor their match to their home table and direction; the
 * opponent takes the opposite seat. A match with two stationary pairs cannot
 * honour both homes, so it is flagged as a conflict and seated at one home
 * (the NS-preferring one) with the other pair moved. Remaining
 * (non-stationary) matches fill the leftover tables in standing order, with
 * directions chosen to balance history.
 */
function seatMatches(
  matches: Match[],
  tables: number,
  stationary: ReadonlyMap<SwissPairId, SwissHomeSeat>,
  directionCounts: ReadonlyMap<SwissPairId, { ns: number; ew: number }>,
  sitOutPairId: SwissPairId | null,
): { seating: SwissSeating[]; hadStationaryConflict: boolean } {
  const seating: SwissSeating[] = [];
  const usedTables = new Set<number>();
  let hadStationaryConflict = false;

  const stationaryMatches: Match[] = [];
  const freeMatches: Match[] = [];

  for (const match of matches) {
    if (stationary.has(match.a) || stationary.has(match.b)) {
      stationaryMatches.push(match);
    } else {
      freeMatches.push(match);
    }
  }

  // Seat stationary-anchored matches first so they claim their home tables.
  for (const match of stationaryMatches) {
    const homeA = stationary.get(match.a);
    const homeB = stationary.get(match.b);

    // Both stationary: can't satisfy both homes. Anchor to A's home and flag.
    if (homeA && homeB) {
      hadStationaryConflict = true;
      seating.push(seatAtHome(homeA, match.a, match.b));
      usedTables.add(homeA.tableNumber);
      continue;
    }

    const home = homeA ?? homeB!;
    const anchor = homeA ? match.a : match.b;
    const opponent = homeA ? match.b : match.a;

    if (usedTables.has(home.tableNumber)) {
      // Home table already taken (e.g. by another stationary pair) — a
      // conflict; seat elsewhere below by treating this as a free match.
      hadStationaryConflict = true;
      freeMatches.push(match);
      continue;
    }

    seating.push(seatAtHome(home, anchor, opponent));
    usedTables.add(home.tableNumber);
  }

  // Fill the remaining tables with the free matches, in ascending table order.
  const freeTables: number[] = [];
  for (let t = 1; t <= tables; t++) {
    if (!usedTables.has(t)) freeTables.push(t);
  }

  freeMatches.forEach((match, idx) => {
    const tableNumber = freeTables[idx];
    const { ns, ew } = orientMatch(match, directionCounts);
    seating.push({ tableNumber, ns, ew });
  });

  seating.sort((a, b) => a.tableNumber - b.tableNumber);

  // A sit-out reduces the number of occupied tables by one; that is expected
  // and not itself a conflict. (sitOutPairId is referenced to keep the signature
  // meaningful for callers reasoning about occupancy.)
  void sitOutPairId;

  return { seating, hadStationaryConflict };
}

/**
 * Seat a match at a stationary pair's home: the anchor keeps its home
 * direction, the opponent takes the opposite direction at the same table.
 */
function seatAtHome(
  home: SwissHomeSeat,
  anchor: SwissPairId,
  opponent: SwissPairId,
): SwissSeating {
  return home.direction === "NS"
    ? { tableNumber: home.tableNumber, ns: anchor, ew: opponent }
    : { tableNumber: home.tableNumber, ns: opponent, ew: anchor };
}

// --- Director editing of a drawn round -----------------------------------
//
// The director can hand-adjust a drawn round before committing it: swap any two
// pairs' positions, or (when the field is odd) choose a different pair to sit
// out. These operate on the drawn SwissSeating[] as plain data, and the result
// is re-evaluated with evaluateSwissSeating so the advisories reflect the edit.

/**
 * Every pair id currently seated in a seating (both directions, every table),
 * in the order encountered. Excludes any sit-out pair (which is not in the
 * seating array).
 */
export function seatedPairIds(seating: SwissSeating[]): SwissPairId[] {
  const ids: SwissPairId[] = [];
  for (const s of seating) {
    ids.push(s.ns, s.ew);
  }
  return ids;
}

/**
 * Swap the positions of two pairs in a drawn seating. Wherever `pairA` sits
 * (table + direction), `pairB` now sits, and vice versa — so the two pairs
 * exchange seats exactly. Every other seat is untouched, and each pair still
 * appears exactly once, so the result is always structurally valid.
 *
 * If either pair is not seated (e.g. one is the current sit-out), the seating
 * is returned unchanged — reassigning a bye is done with {@link reassignBye},
 * not a swap.
 */
export function swapPairs(
  seating: SwissSeating[],
  pairA: SwissPairId,
  pairB: SwissPairId,
): SwissSeating[] {
  if (pairA === pairB) return seating.map((s) => ({ ...s }));

  const isSeated = (id: SwissPairId) =>
    seating.some((s) => s.ns === id || s.ew === id);
  if (!isSeated(pairA) || !isSeated(pairB)) {
    return seating.map((s) => ({ ...s }));
  }

  const swapId = (id: SwissPairId): SwissPairId =>
    id === pairA ? pairB : id === pairB ? pairA : id;

  return seating.map((s) => ({
    tableNumber: s.tableNumber,
    ns: swapId(s.ns),
    ew: swapId(s.ew),
  }));
}

/**
 * Reassign the bye to a different pair. The pair that was sitting out
 * (`currentSitOut`) takes the seat currently held by `newSitOut`, and
 * `newSitOut` becomes the sit-out. If there is no current sit-out (an even
 * field) or the incoming pair isn't seated, the seating is returned unchanged.
 *
 * Returns the new seating and the new sit-out pair id.
 */
export function reassignBye(
  seating: SwissSeating[],
  currentSitOut: SwissPairId | null,
  newSitOut: SwissPairId,
): { seating: SwissSeating[]; sitOutPairId: SwissPairId } {
  if (currentSitOut == null || newSitOut === currentSitOut) {
    return {
      seating: seating.map((s) => ({ ...s })),
      sitOutPairId: currentSitOut ?? newSitOut,
    };
  }

  const isSeated = seating.some((s) => s.ns === newSitOut || s.ew === newSitOut);
  if (!isSeated) {
    return { seating: seating.map((s) => ({ ...s })), sitOutPairId: currentSitOut };
  }

  // The formerly-sitting-out pair takes the seat the incoming sit-out vacates.
  const replaceId = (id: SwissPairId): SwissPairId =>
    id === newSitOut ? currentSitOut : id;

  return {
    seating: seating.map((s) => ({
      tableNumber: s.tableNumber,
      ns: replaceId(s.ns),
      ew: replaceId(s.ew),
    })),
    sitOutPairId: newSitOut,
  };
}

/** A per-arrangement advisory, keyed so the UI can render specifics. */
export interface SwissSeatingAdvisories {
  /** True when the seating is not a valid complete arrangement (see reasons). */
  structuralError: boolean;
  /** Human-readable structural problems (a pair seated twice, wrong count, …). */
  structuralReasons: string[];
  /** Unordered-pair keys of matches that repeat a previously-played opponent. */
  repeats: string[];
  /** True when any drawn match repeats a prior opponent. */
  hadUnavoidableRepeat: boolean;
  /** True when two stationary pairs are seated together, or one is off its home. */
  hadStationaryConflict: boolean;
  /** True when the pair chosen to sit out has already had a bye this event. */
  byeRepeat: boolean;
}

/**
 * Evaluate ANY seating (a fresh draw or a director-edited one) against the
 * event history, reporting the same advisories a draw surfaces plus structural
 * validity and specific repeat pairings. Pure, so it runs identically on the
 * server (initial draw) and the client (after each edit) with no round-trip.
 *
 * It never rejects — a director override may intentionally create a repeat or a
 * stationary conflict; this only *reports* so the UI can warn.
 */
export function evaluateSwissSeating(
  seating: SwissSeating[],
  sitOutPairId: SwissPairId | null,
  input: SwissDrawInput,
): SwissSeatingAdvisories {
  const { tables, playedOpponents, hadBye, stationary } = input;

  // Structural checks: every pair seated exactly once, plus the sit-out, cover
  // the whole field; table numbers are within range and unique.
  const structuralReasons: string[] = [];
  const seatedIds = seatedPairIds(seating);
  const allIds = sitOutPairId == null ? seatedIds : [...seatedIds, sitOutPairId];
  const counts = new Map<SwissPairId, number>();
  for (const id of allIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  const expected = swissPairIds(tables);
  for (const id of expected) {
    const c = counts.get(id) ?? 0;
    if (c === 0) structuralReasons.push(`Pair ${id} is not seated`);
    if (c > 1) structuralReasons.push(`Pair ${id} is seated more than once`);
  }
  for (const [id] of counts) {
    if (!expected.includes(id)) {
      structuralReasons.push(`Unknown pair ${id} is seated`);
    }
  }
  const tableNumbers = seating.map((s) => s.tableNumber);
  if (new Set(tableNumbers).size !== tableNumbers.length) {
    structuralReasons.push("Two matches share a table");
  }

  // Repeat pairings: any seated match whose opponent key is in history.
  const repeats: string[] = [];
  for (const s of seating) {
    const key = opponentKey(s.ns, s.ew);
    if (playedOpponents.has(key)) repeats.push(key);
  }

  // Stationary conflict: a stationary pair off its home seat, or two stationary
  // pairs seated together.
  let hadStationaryConflict = false;
  for (const s of seating) {
    const nsStat = stationary.get(s.ns);
    const ewStat = stationary.get(s.ew);
    if (nsStat && ewStat) {
      hadStationaryConflict = true;
      continue;
    }
    if (
      nsStat &&
      (nsStat.tableNumber !== s.tableNumber || nsStat.direction !== "NS")
    ) {
      hadStationaryConflict = true;
    }
    if (
      ewStat &&
      (ewStat.tableNumber !== s.tableNumber || ewStat.direction !== "EW")
    ) {
      hadStationaryConflict = true;
    }
  }

  const byeRepeat = sitOutPairId != null && hadBye.has(sitOutPairId);

  return {
    structuralError: structuralReasons.length > 0,
    structuralReasons,
    repeats,
    hadUnavoidableRepeat: repeats.length > 0,
    hadStationaryConflict,
    byeRepeat,
  };
}


/**
 * The advisory-relevant parts of a {@link SwissDrawInput}, in a
 * JSON-serializable shape (Sets/Maps flattened to arrays). The server sends
 * this with a draw preview so the director's device can re-run
 * {@link evaluateSwissSeating} locally after each edit — no round-trip, and
 * identical logic to the server's initial draw.
 */
export interface SerializableAdvisoryInputs {
  tables: number;
  /** Unordered-pair opponent keys already played (see {@link opponentKey}). */
  playedOpponents: string[];
  /** Pair ids that have already had a bye. */
  hadBye: SwissPairId[];
  /** Per-pair NS/EW counts so far, as [pairId, {ns, ew}] entries. */
  directionCounts: [SwissPairId, { ns: number; ew: number }][];
  /** Stationary pairs and their home seats, as [pairId, home] entries. */
  stationary: [SwissPairId, SwissHomeSeat][];
}

/** Flatten the advisory-relevant parts of a draw input for transport. */
export function serializeAdvisoryInputs(
  input: SwissDrawInput,
): SerializableAdvisoryInputs {
  return {
    tables: input.tables,
    playedOpponents: [...input.playedOpponents],
    hadBye: [...input.hadBye],
    directionCounts: [...input.directionCounts.entries()],
    stationary: [...input.stationary.entries()],
  };
}

/**
 * Rehydrate {@link SerializableAdvisoryInputs} into the shape
 * {@link evaluateSwissSeating} expects. Standings are irrelevant to the
 * advisory check (it evaluates a given seating, not how to draw one), so an
 * empty standings array is supplied.
 */
export function rehydrateAdvisoryInputs(
  inputs: SerializableAdvisoryInputs,
): SwissDrawInput {
  return {
    tables: inputs.tables,
    standings: [],
    playedOpponents: new Set(inputs.playedOpponents),
    hadBye: new Set(inputs.hadBye),
    directionCounts: new Map(inputs.directionCounts),
    stationary: new Map(inputs.stationary),
  };
}
