import type { MovementByTable } from "./movementData";

/**
 * The physical setup facts for a single table at the start of a movement
 * (round 1): which boards to place there, on which physical copy, and whether
 * that table shares boards with — or relays boards to — another table.
 *
 * This is the "how to lay out the room" view of a movement, derived purely from
 * the round-1 board assignments. It is framework-free and unit-testable.
 */
export interface TablePlacement {
  /** First board number placed at this table in round 1. */
  boardStart: number;
  /** Last board number placed at this table in round 1. */
  boardEnd: number;
  /**
   * Physical duplicate copy of the board set (e.g. "A"/"B"), when the movement
   * uses more than one copy (Web Mitchell). Undefined for single-copy
   * movements.
   */
  boardCopy?: string;
  /**
   * Other table numbers this table shares its round-1 board set with (i.e. play
   * the identical boards at the same time). Empty/omitted when the table does
   * not share.
   */
  sharesWith?: number[];
  /**
   * The table this table relays boards to/from, when the movement's structure
   * makes a relay unambiguous (Share-and-Relay only). Omitted otherwise — we
   * never guess a relay from a mere board-set gap.
   */
  relayWith?: number;
}

/** Round-1 entry for a single table, extracted from a MovementByTable. */
interface Round1Cell {
  tableNumber: number;
  boardStart: number;
  boardEnd: number;
  boardCopy?: string;
}

/**
 * Pull each table's round-1 cell (the first round it plays). Tables with no
 * rounds are skipped. Rounds are matched by `roundNumber === 1` when present,
 * otherwise the first listed round is used.
 */
function round1Cells(tables: MovementByTable[]): Round1Cell[] {
  const cells: Round1Cell[] = [];

  for (const table of tables) {
    if (table.rounds.length === 0) continue;

    const round1 =
      table.rounds.find((r) => r.roundNumber === 1) ?? table.rounds[0];

    cells.push({
      tableNumber: table.tableNumber,
      boardStart: round1.boardStart,
      boardEnd: round1.boardEnd,
      boardCopy: round1.boardCopy,
    });
  }

  return cells;
}

/**
 * Build the per-table round-1 placement map: which boards (and copy) each table
 * starts with, plus which tables share those boards.
 *
 * Sharing is detected movement-agnostically: two tables share when they play
 * the identical round-1 board set. A board set is identified by its
 * `(boardStart, boardCopy)` — the copy matters because Web movements deliberately
 * run the same set number on separate physical copies, and those are NOT a
 * share.
 *
 * Relay is NOT added here; it requires movement-structure knowledge and is
 * layered on by {@link withRelay} for the movements that prove it.
 */
export function buildTablePlacement(
  tables: MovementByTable[],
): Map<number, TablePlacement> {
  const cells = round1Cells(tables);

  // Group tables by their physical round-1 board set. Same board numbers on the
  // same copy => the same physical set => a share.
  const bySet = new Map<string, number[]>();
  for (const cell of cells) {
    const key = `${cell.boardStart}-${cell.boardEnd}-${cell.boardCopy ?? ""}`;
    const group = bySet.get(key);
    if (group) {
      group.push(cell.tableNumber);
    } else {
      bySet.set(key, [cell.tableNumber]);
    }
  }

  const placement = new Map<number, TablePlacement>();

  for (const cell of cells) {
    const key = `${cell.boardStart}-${cell.boardEnd}-${cell.boardCopy ?? ""}`;
    const group = bySet.get(key) ?? [cell.tableNumber];
    const sharesWith = group
      .filter((t) => t !== cell.tableNumber)
      .sort((a, b) => a - b);

    placement.set(cell.tableNumber, {
      boardStart: cell.boardStart,
      boardEnd: cell.boardEnd,
      ...(cell.boardCopy !== undefined ? { boardCopy: cell.boardCopy } : {}),
      ...(sharesWith.length > 0 ? { sharesWith } : {}),
    });
  }

  return placement;
}

/**
 * Describes a movement whose structure makes a board relay unambiguous, so a
 * relay note can be shown honestly. Only Share-and-Relay qualifies today: we
 * never infer a relay from a bare board-set gap in an arbitrary (e.g. seeded)
 * movement.
 */
export interface RelayContext {
  /** True only for a generated Share-and-Relay Mitchell. */
  shareAndRelay: boolean;
  /** The movement's table count (equals its round count for Share-and-Relay). */
  tables: number;
}

/**
 * Layer relay annotations onto an existing placement map for movements whose
 * structure proves a relay.
 *
 * Share-and-Relay Mitchell (even table count N) parks one board set between the
 * two halves of the room in round 1: tables 1..N/2 play the first-half sets,
 * the relay set sits idle between table N/2 and table N/2+1, and tables
 * N/2+1..N play the second-half sets. That idle set is passed (relayed) between
 * those two middle tables, so both are annotated with each other as their relay
 * partner.
 *
 * For any other movement (`shareAndRelay` false) the map is returned unchanged:
 * we do not guess a relay we cannot prove.
 */
export function withRelay(
  placement: Map<number, TablePlacement>,
  context: RelayContext,
): Map<number, TablePlacement> {
  if (!context.shareAndRelay) return placement;

  const { tables } = context;

  // Defensive: Share-and-Relay is only defined for an even table count of at
  // least 2. Anything else has no well-defined relay position, so leave it.
  if (tables < 2 || tables % 2 !== 0) return placement;

  const lowerMiddle = tables / 2; // last table of the first half
  const upperMiddle = lowerMiddle + 1; // first table of the second half

  const lower = placement.get(lowerMiddle);
  const upper = placement.get(upperMiddle);

  // Defensive: both tables must be present to describe the relay between them.
  if (!lower || !upper) return placement;

  const result = new Map(placement);
  result.set(lowerMiddle, { ...lower, relayWith: upperMiddle });
  result.set(upperMiddle, { ...upper, relayWith: lowerMiddle });

  return result;
}
