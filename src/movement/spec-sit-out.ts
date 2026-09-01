import { PairMovement } from "@/db/movements/queries/get-movement";
import { PairSeat, parseSeat } from "@/model/participants";
import { PairDirection } from "@/model/common";

/**
 * Sit-out handling for hard-coded (database) pair movements.
 *
 * The DB movement is an array of tables, each with rounds carrying numeric
 * position ids (`ns`, `ew`) and a board range (`boardStart`..`boardEnd`). A
 * sit-out is modelled as a phantom position id: any round in which a table's
 * NS or EW is the phantom plays no boards, which the schedule renders as a
 * sit-out for the real opponent.
 *
 * Two cases:
 * - A movement with NO built-in missing pair: we introduce a phantom at the
 *   actual empty seat.
 * - A movement WITH a built-in missing pair: the file already contains a
 *   phantom at a fixed seat; we rotate the movement's pair numbering (modular
 *   arithmetic over its tables) so the file phantom lines up with the actual
 *   empty seat, then blank its boards.
 */

/** A round plays no boards when its end precedes its start. */
function emptyBoardRange(boardStart: number): {
  boardStart: number;
  boardEnd: number;
} {
  return { boardStart, boardEnd: boardStart - 1 };
}

/**
 * Find the position id occupying `seat` in round 1, or null if that seat has
 * no round-1 position (e.g. it is already the phantom).
 */
function positionAtSeat(
  movement: PairMovement[],
  seat: PairSeat,
): string | null {
  const { tableNumber, direction } = parseSeat(seat);
  const table = movement.find((t) => t.tableNumber === tableNumber);
  const round1 = table?.rounds.find((r) => r.roundNumber === 1);
  if (!round1) {
    return null;
  }
  return direction === "NS" ? round1.ns : round1.ew;
}

/**
 * Blank the boards of every round in which the given phantom position id sits,
 * leaving the pairings intact so the real opponent sits out that round.
 */
export function blankPhantomBoards(
  movement: PairMovement[],
  phantomId: string,
): PairMovement[] {
  return movement.map((table) => ({
    ...table,
    rounds: table.rounds.map((round) =>
      round.ns === phantomId || round.ew === phantomId
        ? { ...round, ...emptyBoardRange(round.boardStart) }
        : round,
    ),
  }));
}

/**
 * Introduce a sit-out into a movement that has no built-in missing pair by
 * treating the position currently at `sitOutSeat` as the phantom.
 */
export function applySpecSitOutNoMissingPair(
  movement: PairMovement[],
  sitOutSeat: PairSeat,
): PairMovement[] {
  const phantomId = positionAtSeat(movement, sitOutSeat);
  if (phantomId === null) {
    return movement;
  }
  return blankPhantomBoards(movement, phantomId);
}

/**
 * The set of table numbers used by one direction across round 1. For a standard
 * two-winner movement this is 1..tables.
 */
function tableCount(movement: PairMovement[]): number {
  return movement.reduce((max, t) => Math.max(max, t.tableNumber), 0);
}

/**
 * Rotate a table number by `offset` within 1..tables (modular arithmetic).
 */
function rotateTable(table: number, offset: number, tables: number): number {
  return ((table - 1 + offset) % tables + tables) % tables + 1;
}

/**
 * Adjust a movement that has a built-in missing pair so its phantom lines up
 * with the actual empty seat.
 *
 * The phantom belongs to one direction (NS or EW). We rotate that direction's
 * pairing across tables by the offset between the phantom's current round-1
 * table and the requested sit-out table, so the phantom ends up at
 * `sitOutSeat`. The pair position ids themselves are not renumbered — only the
 * table each round's board range applies to matters for sit-out purposes — so
 * we rotate the per-table round data of the phantom's direction and then blank
 * the phantom's boards at its new seat.
 */
export function alignSpecMissingPair(
  movement: PairMovement[],
  missingPair: string,
  sitOutSeat: PairSeat,
): PairMovement[] {
  const { tableNumber: targetTable, direction: targetDirection } =
    parseSeat(sitOutSeat);

  const phantomSeat = findPhantomSeat(movement, missingPair);
  if (phantomSeat === null) {
    // Phantom not found in round 1; nothing to align, just blank its boards.
    return blankPhantomBoards(movement, missingPair);
  }

  // The phantom must be aligned within its own direction. If the requested
  // sit-out direction differs from the phantom's direction we cannot align by
  // rotation alone; fall back to blanking the phantom where it already sits.
  if (phantomSeat.direction !== targetDirection) {
    return blankPhantomBoards(movement, missingPair);
  }

  const tables = tableCount(movement);
  const offset = targetTable - phantomSeat.tableNumber;

  const rotated = rotateDirection(
    movement,
    phantomSeat.direction,
    offset,
    tables,
  );

  return blankPhantomBoards(rotated, missingPair);
}

interface PhantomSeat {
  tableNumber: number;
  direction: PairDirection;
}

function findPhantomSeat(
  movement: PairMovement[],
  missingPair: string,
): PhantomSeat | null {
  for (const table of movement) {
    const round1 = table.rounds.find((r) => r.roundNumber === 1);
    if (!round1) {
      continue;
    }
    if (round1.ns === missingPair) {
      return { tableNumber: table.tableNumber, direction: "NS" };
    }
    if (round1.ew === missingPair) {
      return { tableNumber: table.tableNumber, direction: "EW" };
    }
  }
  return null;
}

/**
 * Rotate the rounds of one direction across tables by `offset`. Each table's
 * rounds for the rotated direction are taken from the table `offset` positions
 * away, so the whole schedule for that direction shifts around the tables while
 * keeping the other direction fixed.
 */
function rotateDirection(
  movement: PairMovement[],
  direction: PairDirection,
  offset: number,
  tables: number,
): PairMovement[] {
  if (offset % tables === 0) {
    return movement;
  }

  const byTable = new Map(movement.map((t) => [t.tableNumber, t]));

  return movement.map((table) => {
    const sourceTable = rotateTable(table.tableNumber, -offset, tables);
    const source = byTable.get(sourceTable) ?? table;

    const rounds = table.rounds.map((round, idx) => {
      const sourceRound = source.rounds[idx] ?? round;
      return direction === "NS"
        ? { ...round, ns: sourceRound.ns }
        : { ...round, ew: sourceRound.ew };
    });

    return { ...table, rounds };
  });
}
