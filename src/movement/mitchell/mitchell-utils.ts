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

  if (!Number.isInteger(boardsPerRound) || boardsPerRound < 1) {
    throw new Error("boardsPerRound must be a positive integer");
  }
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
