import { PairSeat, parseSeat, seatFor } from "@/model/participants";
import { ExpectedSeats } from "@/model/expected-seats";

/**
 * Stable problem codes explaining why a game cannot be started. The UI maps
 * these (or their messages) into director-facing guidance.
 */
export type StartProblemCode =
  | "NO_MOVEMENT_SELECTED"
  | "NO_PAIRS_SEATED"
  | "TOO_MANY_TABLES"
  | "HALF_FILLED_TABLE"
  | "MULTIPLE_EMPTY_POSITIONS"
  | "UNKNOWN_SEAT"
  // Swiss Teams needs an even number of complete teams: no pair may sit out
  // (that would be half a team) and the team count must be even (odd counts
  // need three-way handling, which is not yet supported).
  | "TEAMS_SIT_OUT_NOT_ALLOWED"
  | "ODD_TEAM_COUNT"
  // A Swiss Pairs "2 half matches" round needs three pairs to form the group
  // (an anchor plus the two it faces across the two halves), i.e. at least two
  // tables of an odd field. A one-table odd field (a single pair) is too small.
  | "HALF_MATCH_FIELD_TOO_SMALL";

export interface StartProblem {
  code: StartProblemCode;
  message: string;
  /** Seats implicated in the problem, when relevant. */
  seats?: PairSeat[];
  /**
   * The section this problem belongs to, for grouping in the UI. Set by the
   * aggregate flattening; absent for problems produced before section context
   * is known (e.g. "no sections at all").
   */
  section?: string;
}

export interface StartValidationResult {
  canStart: boolean;
  problems: StartProblem[];
  /**
   * The single empty expected seat that will become a sit-out, when the seating
   * is valid but one UNMARKED pair short. Null when the movement is exactly
   * filled or the only empty seats are expected-late (which are NOT sit-outs).
   */
  sitOutSeat: PairSeat | null;
  /**
   * The expected seats the director has marked "expected late" (§2.4.7) that
   * are genuinely empty — i.e. in `expected`, not seated. These start UNFILLED
   * but PLAYABLE (a real seat id awaiting a latecomer), distinct from the single
   * `sitOutSeat`. Absent/empty when none are marked — only the generic pairs
   * path produces them (teams reject sit-outs; Swiss resolves its own round-1
   * bye), so the other result constructors omit it.
   */
  lateSeats?: PairSeat[];
}

function tableOf(seat: PairSeat): number {
  return parseSeat(seat).tableNumber;
}

/**
 * Validate that the currently seated pairs form a startable movement.
 *
 * Rules (per product decision):
 * - A movement must be selected and at least one pair seated.
 * - Seated seats must all be seats the movement defines (no seats beyond the
 *   movement's tables, no otherwise-unknown seats).
 * - The seated seats must equal the movement's expected seats, or the expected
 *   seats minus exactly one pair position (a single sit-out). Two or more
 *   missing positions — including a half-filled table combined with another
 *   gap — is invalid.
 *
 * @param expected  Expected seats derived from the selected movement, or null
 *   when no movement has been selected.
 * @param seatedSeats  The seats currently occupied by real pairs.
 */
export function validateStart(
  expected: ExpectedSeats | null,
  seatedSeats: Iterable<PairSeat>,
  expectedLateSeats: Iterable<PairSeat> = [],
): StartValidationResult {
  const seated = new Set<PairSeat>(seatedSeats);

  if (expected === null) {
    return {
      canStart: false,
      sitOutSeat: null,
      lateSeats: [],
      problems: [
        {
          code: "NO_MOVEMENT_SELECTED",
          message: "Select a movement before starting the game.",
        },
      ],
    };
  }

  if (seated.size === 0) {
    return {
      canStart: false,
      sitOutSeat: null,
      lateSeats: [],
      problems: [
        {
          code: "NO_PAIRS_SEATED",
          message: "No pairs are seated yet.",
        },
      ],
    };
  }

  const problems: StartProblem[] = [];

  // Seats occupied that the movement does not define.
  const maxTable = maxExpectedTable(expected);
  const tooManyTables: PairSeat[] = [];
  const unknownSeats: PairSeat[] = [];

  for (const seat of seated) {
    if (expected.seats.has(seat)) {
      continue;
    }
    if (maxTable !== null && tableOf(seat) > maxTable) {
      tooManyTables.push(seat);
    } else {
      unknownSeats.push(seat);
    }
  }

  if (tooManyTables.length > 0) {
    problems.push({
      code: "TOO_MANY_TABLES",
      message: `The movement has ${maxTable} table${
        maxTable === 1 ? "" : "s"
      }, but pairs are seated beyond that. Remove them or choose a larger movement.`,
      seats: tooManyTables.sort(seatSort),
    });
  }

  if (unknownSeats.length > 0) {
    problems.push({
      code: "UNKNOWN_SEAT",
      message:
        "Some seated positions are not part of the selected movement. Evict them or choose a different movement.",
      seats: unknownSeats.sort(seatSort),
    });
  }

  // Expected seats that are not filled.
  const missing: PairSeat[] = [];
  for (const seat of expected.seats) {
    if (!seated.has(seat)) {
      missing.push(seat);
    }
  }

  // §2.4.7: a seat the director marked "expected late" is ACCOUNTED FOR — it
  // starts empty-but-playable (a latecomer will fill it), not a sit-out. Only
  // seats that are neither seated nor marked-late count toward the
  // "at most one sit-out" rule. A late mark on an expected seat that IS seated
  // is moot (the pair already arrived); a mark on a non-expected seat is
  // ignored. So the effective late set is the marked seats intersected with the
  // genuinely-missing expected seats.
  const lateMarks = new Set<PairSeat>(expectedLateSeats);
  const lateSeats = missing.filter((seat) => lateMarks.has(seat));
  const unaccounted = missing.filter((seat) => !lateMarks.has(seat));

  if (unaccounted.length >= 2) {
    // A half-filled table is still invalid only when its empty side is
    // UNACCOUNTED (an expected-late empty side is the allowed half-table).
    const halfFilled = halfFilledTables(unaccounted, seated);
    if (halfFilled.length > 0) {
      problems.push({
        code: "HALF_FILLED_TABLE",
        message:
          "One or more tables have only one pair seated. Seat both pairs, mark the empty seat as expected late, or leave the whole table empty.",
        seats: halfFilled.sort(seatSort),
      });
    }
    problems.push({
      code: "MULTIPLE_EMPTY_POSITIONS",
      message:
        "More than one pair is missing. A session allows at most one sit-out — mark the other empty seats as expected late to start without them.",
      seats: unaccounted.sort(seatSort),
    });
  }

  const canStart = problems.length === 0;
  const sitOutSeat =
    canStart && unaccounted.length === 1 ? unaccounted[0] : null;

  return {
    canStart,
    problems,
    sitOutSeat,
    lateSeats: canStart ? lateSeats.sort(seatSort) : [],
  };
}

function maxExpectedTable(expected: ExpectedSeats): number | null {
  let max: number | null = null;
  const consider = (seat: PairSeat) => {
    const t = tableOf(seat);
    if (max === null || t > max) {
      max = t;
    }
  };
  for (const seat of expected.seats) {
    consider(seat);
  }
  if (expected.phantomSeat) {
    consider(expected.phantomSeat);
  }
  return max;
}

/**
 * Among the missing expected seats, return the ones whose table has its other
 * direction seated (i.e. a genuinely half-filled table).
 */
function halfFilledTables(
  missing: PairSeat[],
  seated: Set<PairSeat>,
): PairSeat[] {
  return missing.filter((seat) => {
    const { section, tableNumber, direction } = parseSeat(seat);
    const other = seatFor(
      section,
      tableNumber,
      direction === "NS" ? "EW" : "NS",
    );
    return seated.has(other);
  });
}

function seatSort(a: PairSeat, b: PairSeat): number {
  const ta = tableOf(a);
  const tb = tableOf(b);
  if (ta !== tb) {
    return ta - tb;
  }
  /* v8 ignore next -- equal-seat branch (`: 0`) is unreachable: seats come from a Set, so two entries can never share the same section+table+direction */
  return a < b ? -1 : a > b ? 1 : 0;
}
