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

// Convenience aliases (optional)
export type IndividualMovement = Movement<"INDIVIDUAL">;
export type PairMovement = Movement<"PAIR">;

// Union for runtime usage
export type AnyMovement = IndividualMovement | PairMovement;

// Example usage
// const exampleIndividual: IndividualMovement = {
//     type: "INDIVIDUAL",
//     roundTables: [
//         {
//             round: 1,
//             roundTables: [
//                 {
//                     table: 1,
//                     boardParticipantsAndBoards: [
//                         {
//                             boards: [1, 2],
//                             participants: {
//                                 nId: "N1",
//                                 sId: "S1",
//                                 eId: "E1",
//                                 wId: "W1",
//                             },
//                         },
//                     ],
//                 },
//             ],
//         },
//     ],
// };

// Example narrowing
// function handleEvent(event: AnyEvent) {
//     if (event.type === "PAIR") {
//         // participants inferred as pair
//         const first = event.roundTables[0].roundTables[0]
//             .boardParticipantsAndBoards[0].participants;
//
//         // first.nsId and first.ewId available here
//     }
// }
