import type { Absences } from "@/model/absence";
import type { EventClassification } from "@/model/event-format";
import type { MatchRow, ResultRow } from "@/model/result-row";
import type { RuledEvent } from "@/model/ruled-event";
import type { OccupancyRecord } from "@/model/standings";
import { buildOccupantScoredIdResolver } from "./occupants";
import { applySeatSwaps } from "./seat-swap";
import { applyAbsences, pairsStandingsForRanking } from "./apply-absences";
import { participantStandings, resolveStandings } from "./standings";

/** The director's decisions, read by the core adapter. */
export interface DirectorDecisions {
  /** Every seat occupancy in the game (`readSeatOccupancies`). */
  occupancies: readonly OccupancyRecord[];
  /**
   * PAIRS absences by board id (`readAbsences`). Only read when
   * {@link appliesPairsAbsences} is true; ignored otherwise.
   */
  absences: Absences;
  /** Seats the director marked expected late (`readExpectedLateSeats`). */
  expectedLateSeats: Iterable<string>;
  /** Seats that already have a pair, so a late mark on them is ignored. */
  seatedSeats: ReadonlySet<string>;
}

export interface RulingsInput<R extends ResultRow, M extends MatchRow> {
  /** From `classifyEvent` (kernel). Chooses which rewrites apply. */
  classification: EventClassification;
  rows: readonly R[];
  matches: readonly M[];
  decisions: DirectorDecisions;
  /**
   * The §3.5 replay: keep only rounds before this one, and drop withdrawal
   * credits and ranking exclusions, so the field is the one the past draw saw.
   */
  asOfRoundExclusive?: number;
}

/** Whether the event is scored as teams (rows keep their table-encoded ids). */
function isTeamsFormat(classification: EventClassification): boolean {
  return (
    classification.format === "TEAMS_VP" ||
    classification.format === "TEAMS_IMP_AGG" ||
    classification.format === "TEAMS_BAM" ||
    classification.format === "TEAMS_PAB"
  );
}

/**
 * Whether the design §11 PAIRS absence rules apply: a pairs event that is not
 * ranked on Swiss VP. Teams and Swiss-VP events keep the §2.4 withdrawal
 * handling instead. The adapter uses this to skip reading absences it would not
 * need.
 */
export function appliesPairsAbsences(
  classification: EventClassification,
): boolean {
  return !isTeamsFormat(classification) && classification.swissVpMode === null;
}

/**
 * Apply every pre-scoring ruling to an event's rows, in the fixed order the
 * leaderboard has always used:
 *
 * 1. §2.4.7 handover: rewrite each row's ns/ew to its occupant's scored-field
 *    id (the identity for every ordinary seat).
 * 2. "Played the wrong way round": exchange ns/ew on flagged rows. Pairs only;
 *    the teams scorers apply the flag to the room's score instead.
 * 3. PAIRS absences (§11): score a missed board AVE± or remove it.
 * 4. Standings: §2.4.9 exclusions and §2.4.3–§2.4.7 withdrawal credits. For
 *    PAIRS absences the absent pair stays in the ranking.
 * 5. An empty expected-late seat (PAIRS) is not a contestant: excluded.
 * 6. Teams / Swiss VP: an empty expected-late seat credits its opponents AVE+
 *    while the pair is still expected, and is excluded from the ranking.
 *
 * With `asOfRoundExclusive`, later rounds are then dropped and the withdrawal
 * credits and exclusions emptied (the §3.5 replay). Withdrawn teams' unplayed
 * matches are voided later, by scoring, from the returned withdrawals.
 */
export function applyRulings<R extends ResultRow, M extends MatchRow>(
  input: RulingsInput<R, M>,
): RuledEvent<R, M> {
  const { classification, decisions, asOfRoundExclusive } = input;
  const needsTeams = isTeamsFormat(classification);

  // 1. Handover scored-id rewrite.
  const resolveScoredId = buildOccupantScoredIdResolver(decisions.occupancies);
  const occupantRows: R[] = input.rows.map((b) => ({
    ...b,
    ns: resolveScoredId(b.ns, b.boardNumber),
    ew: resolveScoredId(b.ew, b.boardNumber),
  }));

  // 2. Seat swap (pairs only).
  const scoredRows = needsTeams ? occupantRows : applySeatSwaps(occupantRows);

  // 3. PAIRS absences.
  const pairsAbsences = appliesPairsAbsences(classification);
  const absences: Absences = pairsAbsences ? decisions.absences : new Map();
  const rows = pairsAbsences ? applyAbsences(scoredRows, absences) : scoredRows;

  // 4. Standings, measured against the ruled rows (the §2.4.7 LATE
  // retain-standing test counts boards actually played).
  const standings = participantStandings(decisions.occupancies);
  const { excludedFromRanking, withdrawals } = resolveStandings(
    pairsAbsences ? pairsStandingsForRanking(standings) : standings,
    rows,
  );

  // 5. An empty expected-late seat's AVE− side must not surface as a ranked line.
  for (const [boardId, absence] of absences) {
    if (absence.kind === "EMPTY") excludedFromRanking.add(boardId);
  }

  // 6. §2.4.7 "half-table at the start": one synthetic withdrawal record per
  // still-empty expected-late seat. REMOVE ⇒ no self-credit (no contestant to
  // score); `alwaysIndemnifyOpponent` forces the AVE+ branch regardless of the
  // half split. The seat is excluded: unlike a sit-out phantom it is a real
  // seat id, so its 0-credit line would otherwise rank at 0%.
  if (!pairsAbsences) {
    for (const seat of decisions.expectedLateSeats) {
      if (decisions.seatedSeats.has(seat)) continue; // already arrived
      withdrawals.push({
        seat,
        treatment: "REMOVE",
        finePercent: 0,
        alwaysIndemnifyOpponent: true,
      });
      excludedFromRanking.add(seat);
    }
  }

  if (asOfRoundExclusive === undefined) {
    return {
      rows,
      matches: [...input.matches],
      excludedFromRanking,
      withdrawals,
    };
  }

  // The §3.5 replay. The draw at the time ranked EVERY seated contestant on
  // their REAL results — withdrawal is a scoring-time concern, not a draw-time
  // one — so neither the exclusions nor the withdrawal credits apply.
  return {
    rows: rows.filter((r) => r.roundNumber < asOfRoundExclusive),
    matches: input.matches.filter((m) => m.roundNumber < asOfRoundExclusive),
    excludedFromRanking: new Set<string>(),
    withdrawals: [],
  };
}
