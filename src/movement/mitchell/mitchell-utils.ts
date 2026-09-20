import { Table, Tables } from "@/model/movement";

export interface MitchellMovementSpec {
  tables: number;
  rounds: number;
  boardsPerRound: number;
  arrowSwitchRounds?: number;
  // Two-winner Mitchell variants.
  skip?: boolean;
  shareAndRelay?: boolean;
  // Additional pair movements dispatched by generateMitchell. Each is an
  // optional discriminant flag; at most one should be set.
  blackpool?: boolean;
  hesitation?: boolean;
  doubleHesitation?: boolean;
  web?: boolean;
  americanWhist?: boolean;
  /** Revenge rounds for Blackpool (see BlackpoolMovementSpec). */
  revengeRounds?: number;
  /** Modified variant flag for the Double Hesitation Mitchell. */
  modified?: boolean;
}

export interface SkipMitchellMovementSpec extends MitchellMovementSpec {
  skip: true;
}

export interface ShareAndRelayMovementSpec extends MitchellMovementSpec {
  shareAndRelay: true;
}

export function wrapValue(value: number, modulus: number): number {
  return ((((value - 1) % modulus) + modulus) % modulus) + 1;
}

export function boardsForSet(set: number, perRound: number): number[] {
  const start = (set - 1) * perRound + 1;

  return Array.from({ length: perRound }, (_, i) => start + i);
}

/**
 * Shared guard used by every Mitchell-family validator: boards-per-round must
 * be a positive integer. Kept here so the identical check isn't copy-pasted
 * into each variant's own validator.
 */
export function assertPositiveBoardsPerRound(boardsPerRound: number): void {
  if (!Number.isInteger(boardsPerRound) || boardsPerRound < 1) {
    throw new Error("boardsPerRound must be a positive integer");
  }
}

export function validateMitchellSpec(spec: MitchellMovementSpec): void {
  const { tables, rounds, boardsPerRound } = spec;

  if (!Number.isInteger(tables) || tables < 1) {
    throw new Error("tables must be a positive integer");
  }

  if (!Number.isInteger(rounds) || rounds < 2) {
    throw new Error("A Mitchell must have at least 2 rounds");
  }

  if (rounds > tables) {
    throw new Error("A Mitchell cannot have more rounds than tables");
  }

  assertPositiveBoardsPerRound(boardsPerRound);
}

/**
 * The per-variant assignment functions that distinguish one table-based
 * Mitchell from another. Everything else (the table×round double loop, board
 * lookup, pair numbering, arrow switching) is identical across variants and
 * lives in {@link buildMitchell}.
 */
export interface MitchellAssignments {
  /** Physical table the EW pair sits at in this (table, round). */
  ewTable: (tableNumber: number, roundNumber: number) => number;
  /** 1-based board-set number played at this (table, round). */
  boardSet: (tableNumber: number, roundNumber: number) => number;
  /** Optional physical copy label (Web only); omitted → no boardCopy emitted. */
  boardCopy?: (tableNumber: number, roundNumber: number) => string;
}

/**
 * Template for the table-based Mitchell generators (standard, skip, share &
 * relay, blackpool, web). It owns the shared scaffold — the table×round double
 * loop, board-set → board-number lookup, pair numbering and arrow switching —
 * so each variant only supplies the two (occasionally three) functions in
 * {@link MitchellAssignments} that actually make it distinct.
 *
 * `rounds` and `tables` govern loop extents. Most variants use `spec.rounds`,
 * but some (e.g. Blackpool with revenge rounds) run a different number of
 * rounds than the spec's, so it is passed explicitly.
 */
export function buildMitchell(
  spec: MitchellMovementSpec,
  loop: { tables: number; rounds: number },
  assignments: MitchellAssignments,
): Tables {
  const { boardsPerRound, arrowSwitchRounds = 0 } = spec;
  const { tables, rounds } = loop;

  const result: Table[] = [];

  for (let tableNumber = 1; tableNumber <= tables; tableNumber++) {
    const roundsList = [];

    for (let roundNumber = 1; roundNumber <= rounds; roundNumber++) {
      const ewTable = assignments.ewTable(tableNumber, roundNumber);
      const boardSet = assignments.boardSet(tableNumber, roundNumber);
      const boards = boardsForSet(boardSet, boardsPerRound);

      const { nsId, ewId } = getPairIds(
        tableNumber,
        ewTable,
        tables,
        arrowSwitchRounds,
        roundNumber,
        rounds,
      );

      roundsList.push({
        round: roundNumber,
        boards,
        ...(assignments.boardCopy
          ? { boardCopy: assignments.boardCopy(tableNumber, roundNumber) }
          : {}),
        participants: { nsId, ewId },
      });
    }

    result.push({ table: tableNumber, rounds: roundsList });
  }

  return { tables: result };
}

export function getPairIds(
  nsTable: number,
  ewTable: number,
  tables: number,
  arrowSwitchRounds: number,
  roundNumber: number,
  totalRounds: number,
): {
  nsId: string;
  ewId: string;
} {
  // Standard two-winner movement.
  if (arrowSwitchRounds === 0) {
    return {
      nsId: `${nsTable}NS`,
      ewId: `${ewTable}EW`,
    };
  }

  // 1-winner movement.
  // EW pairs are numbered immediately after the NS pairs.
  const ewPair = ewTable + tables;

  const arrowSwitchFrom = totalRounds - arrowSwitchRounds + 1;

  if (roundNumber < arrowSwitchFrom) {
    return {
      nsId: `${nsTable}`,
      ewId: `${ewPair}`,
    };
  }

  // After the arrow switch, the pairs swap direction.
  return {
    nsId: `${ewPair}`,
    ewId: `${nsTable}`,
  };
}
