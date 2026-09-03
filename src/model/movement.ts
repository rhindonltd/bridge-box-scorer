import {
  TravellerParticipantMode,
  ParticipantsByMode,
} from "@/model/participants";

/**
 * The physical duplicate copy of a board set a table plays in a given round.
 *
 * Only Web Mitchell movements use more than one copy: many tables play the
 * same board-set number simultaneously, so the copy label (A/B/C/D) is what
 * distinguishes those otherwise-identical instances. Every other movement plays
 * a single copy, so this is optional here and defaults to "A" at
 * materialization (see materialize-movement.ts / the boards.copy column).
 */
export type BoardCopy = string;

export type Round<M extends TravellerParticipantMode> = {
  round: number;
  tables: {
    table: number;
    boards: number[];
    boardCopy?: BoardCopy;
    participants: ParticipantsByMode[M];
  }[];
};

export type Table<M extends TravellerParticipantMode> = {
  table: number;
  rounds: {
    round: number;
    boards: number[];
    boardCopy?: BoardCopy;
    participants: ParticipantsByMode[M];
  }[];
};

export interface Rounds<M extends TravellerParticipantMode> {
  rounds: Round<M>[];
}

export interface Tables<M extends TravellerParticipantMode> {
  tables: Table<M>[];
}

// Top-level discriminated type
export type Movement<M extends TravellerParticipantMode> = {
  type: M;
} & Rounds<M>;

// Convenience alias
export type PairMovement = Movement<"PAIR">;

// Union for runtime usage
export type AnyMovement = PairMovement;
