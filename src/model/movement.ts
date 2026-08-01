import {
  TravellerParticipantMode,
  ParticipantsByMode,
} from "@/model/participants";

export type Round<M extends TravellerParticipantMode> = {
  round: number;
  tables: {
    table: number;
    boards: number[];
    participants: ParticipantsByMode[M];
  }[];
};

export type Table<M extends TravellerParticipantMode> = {
  table: number;
  rounds: {
    round: number;
    boards: number[];
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
