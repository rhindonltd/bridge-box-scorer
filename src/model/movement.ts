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

/**
 * The two seats of a table in a given round, named by the participant id that
 * sits there. For a pairs movement these are the NS and EW pair ids; for a
 * teams movement they are the home pair (NS) and the travelling away pair (EW),
 * which is why a single `{ nsId, ewId }` shape covers every movement the
 * generators produce (teams are laid out as pair seats — see the
 * `${table}NS` / `${table}EW` convention in the teams materializers).
 *
 * This used to be `ParticipantsByMode[M]` behind a `TravellerParticipantMode`
 * type parameter, but every movement the generators build is a pair-seat
 * layout, so the parameter was always `"PAIR"` and carried no information. The
 * traveller/leaderboard layers keep their own mode system (which does have a
 * real `"TEAM"` mode); this is only the movement-generation shape.
 */
export type PairParticipants = {
  nsId: string;
  ewId: string;
};

export type Round = {
  round: number;
  tables: {
    table: number;
    boards: number[];
    boardCopy?: BoardCopy;
    participants: PairParticipants;
  }[];
};

export type Table = {
  table: number;
  rounds: {
    round: number;
    boards: number[];
    boardCopy?: BoardCopy;
    participants: PairParticipants;
  }[];
};

export interface Rounds {
  rounds: Round[];
}

export interface Tables {
  tables: Table[];
}

// Top-level movement. The `type` discriminant is retained (always "PAIR") so
// existing consumers that narrow on it keep working; there is only one movement
// shape now that the mode parameter is gone.
export type Movement = {
  type: "PAIR";
} & Rounds;

// Convenience alias, kept for readability at call sites.
export type PairMovement = Movement;

// Union for runtime usage.
export type AnyMovement = PairMovement;
