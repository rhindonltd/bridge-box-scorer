import { parseSeat, type SectionLetter } from "@/model/participants";
import {
  stationaryPairsForRound,
  type SwissMovementSpec,
} from "@/model/selected-movement";
import {
  swissPairHomeSeat,
  swissPairIdFromHomeSeat,
  swissPairIds,
  type SwissDrawInput,
  type SwissHalfMatchSeating,
  type SwissHomeSeat,
  type SwissPairId,
  type SwissSeating,
} from "@/modules/swiss/pairs/swiss-pairing";
import { swissPairIdFromParticipant } from "@/modules/swiss/pairs/pair-ids";
import type { SwissBoardHistory } from "@/modules/swiss/pairs/history";
import type { RankedStandings } from "@/modules/swiss/standings-decode";

/** A ranked standings line for a pair, before names are resolved. */
export interface RankedSwissPair {
  id: SwissPairId;
  total: number;
  rank: number;
  tied: boolean;
}

/**
 * The stable Swiss pair ids actually SEATED in a section — one per real pair,
 * from the `seat_occupancy` seats (each a pair's section-qualified round-1 home
 * seat). An odd field leaves one of the `2*tables` positions unseated; that
 * phantom position has no occupancy, so it is absent here. Used to keep an odd
 * field's `order` genuinely odd for the draw engine.
 */
export function seatedSwissPairIds(
  occupancySeats: readonly (string | null)[],
  section: SectionLetter,
  tables: number,
): Set<SwissPairId> {
  const ids = new Set<SwissPairId>();
  for (const seat of occupancySeats) {
    if (seat == null) continue;
    let parsed;
    try {
      parsed = parseSeat(seat);
    } catch {
      continue;
    }
    if (parsed.section !== section) continue;
    // The occupancy seat is a physical seat (e.g. "A1NS"): its table and
    // direction decode to the stable pair id (as `swissPairIdFromSeat` does).
    ids.add(
      swissPairIdFromHomeSeat(tables, {
        tableNumber: parsed.tableNumber,
        direction: parsed.direction,
      }),
    );
  }
  return ids;
}

/**
 * The field in draw order (best pair first) as stable Swiss pair ids, from the
 * section's ranked standings. The standings lines are keyed by the pair's board
 * id, already ranked; each maps back to its integer pair id. Any seated pair
 * not on the standings yet (e.g. only sat out so far) is appended at the end in
 * id order with a zero total.
 *
 * Only the pairs actually SEATED are included: an ODD field's unseated position
 * is a phantom, never a real pair, so the field stays odd and the draw engine's
 * odd-field handling (bye or 2-half-matches) fires.
 */
export function swissPairsField(
  standings: RankedStandings | undefined,
  seated: ReadonlySet<SwissPairId>,
  tables: number,
): { order: SwissPairId[]; ranked: RankedSwissPair[] } {
  const order: SwissPairId[] = [];
  const ranked: RankedSwissPair[] = [];
  const seen = new Set<SwissPairId>();

  if (standings) {
    // The lines are already ranked best-first, and (for Swiss) carry the
    // running VP total the field is ranked on plus its rank/tie flags.
    for (const line of standings.overallScore.lines as {
      pairId: string;
      totalVP?: number;
      rank?: number;
      tied?: boolean;
    }[]) {
      const id = swissPairIdFromParticipant(line.pairId, tables);
      if (id != null && seated.has(id) && !seen.has(id)) {
        order.push(id);
        ranked.push({
          id,
          total: line.totalVP ?? 0,
          rank: line.rank ?? order.length,
          tied: line.tied ?? false,
        });
        seen.add(id);
      }
    }
  }

  // Append any REAL pair not yet ranked (no scored boards), lowest priority.
  // They have no standings line yet, so show a zero total ranked last. The
  // phantom position of an odd field is not a real pair, so it is never added.
  const lastRank = ranked.length > 0 ? ranked[ranked.length - 1].rank : 0;
  for (const id of swissPairIds(tables)) {
    if (seated.has(id) && !seen.has(id)) {
      order.push(id);
      ranked.push({ id, total: 0, rank: lastRank + 1, tied: false });
      seen.add(id);
    }
  }

  return { order, ranked };
}

/** The parts of a Swiss Pairs movement spec the draw input reads. */
export type SwissPairsDrawSpec = Pick<
  SwissMovementSpec,
  | "tables"
  | "oddHandling"
  | "oddRoundPlan"
  | "stationaryPairs"
  | "stationaryEarlier"
>;

/**
 * The engine input for drawing `round`: the field in draw order, the history
 * of earlier rounds, the stationary pairs in force for that round, and how the
 * round resolves an odd field. Used both for the next draw and for replaying a
 * past round in §3.5 mismatch detection.
 */
export function pairsDrawInput(
  spec: SwissPairsDrawSpec,
  round: number,
  order: SwissPairId[],
  history: SwissBoardHistory,
): SwissDrawInput {
  const { tables, oddHandling = "BYE", oddRoundPlan } = spec;

  // The stationary list in force for THIS round: a change the director made
  // mid-event applies from then on, never to rounds already drawn (so a later
  // change can't make an earlier round look wrong in a replay).
  const stationary = new Map<SwissPairId, SwissHomeSeat>();
  for (const pairId of stationaryPairsForRound(spec, round)) {
    stationary.set(pairId, swissPairHomeSeat(tables, pairId));
  }

  // How THIS round resolves an odd field: the per-round plan entry when the
  // event uses half-matches (1-indexed round → 0-indexed plan), else a bye.
  /* v8 ignore next 4 -- the `?.`/`?? "BYE"` fallbacks are unreachable: the movement schema requires an oddRoundPlan with one entry per round whenever oddHandling is HALF_MATCHES */
  const roundOddHandling =
    oddHandling === "HALF_MATCHES" &&
    (oddRoundPlan?.[round - 1] ?? "BYE") === "HALF_MATCHES"
      ? "HALF_MATCHES"
      : "BYE";

  return {
    tables,
    standings: order,
    playedOpponents: history.playedOpponents,
    hadBye: history.hadBye,
    hadHalfMatch: history.hadHalfMatch,
    oddHandling: roundOddHandling,
    directionCounts: history.directionCounts,
    stationary,
  };
}

/**
 * Structural soundness of a 2-half-matches commit: the ordinary `seating` plus
 * the group's three pairs must cover every pair in the field exactly once, on
 * distinct tables (the anchor's table must not clash with an ordinary table).
 * Advisories are not checked here (the group isn't director-editable yet).
 */
export function isValidHalfMatchCommit(
  seating: SwissSeating[],
  halfMatch: SwissHalfMatchSeating,
  input: SwissDrawInput,
): boolean {
  const groupIds = [
    halfMatch.group.anchor,
    halfMatch.group.halfOneOpponent,
    halfMatch.group.halfTwoOpponent,
  ];

  const counts = new Map<SwissPairId, number>();
  for (const s of seating) {
    counts.set(s.ns, (counts.get(s.ns) ?? 0) + 1);
    counts.set(s.ew, (counts.get(s.ew) ?? 0) + 1);
  }
  for (const id of groupIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  // Every pair in the REAL field (the odd standings, 2*tables - 1) seated once.
  // Using the standings — not swissPairIds(tables) — so the phantom position of
  // the odd field isn't demanded.
  const expected = input.standings;
  if (counts.size !== expected.length) return false;
  for (const id of expected) {
    if (counts.get(id) !== 1) return false;
  }

  // Tables unique, and the anchor's table distinct from the ordinary tables.
  const tableNumbers = seating.map((s) => s.tableNumber);
  if (new Set(tableNumbers).size !== tableNumbers.length) return false;
  if (tableNumbers.includes(halfMatch.anchorTable)) return false;

  return true;
}
