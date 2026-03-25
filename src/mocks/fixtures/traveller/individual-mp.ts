import { ScoredIndividualMPTraveller } from "@/model/scored-traveller";

export const individualMpTraveller: ScoredIndividualMPTraveller = {
  type: "INDIVIDUAL_MP",
  board: 10,
  section: crypto.randomUUID(),
  lines: [
    {
      outcome: "4SS=",
      score: 620,
      nPlayerId: "1",
      sPlayerId: "2",
      ePlayerId: "3",
      wPlayerId: "4",
      maxMatchPoints: 4,
      nsMatchPoints: 3,
      ewMatchPoints: 1,
    },
    {
      outcome: "NP",
      score: null,
      nPlayerId: "5",
      sPlayerId: "6",
      ePlayerId: "7",
      wPlayerId: "8",
      maxMatchPoints: 4,
      nsMatchPoints: 0,
      ewMatchPoints: 0,
    },
    {
      outcome: "PO",
      score: 0,
      nPlayerId: "9",
      sPlayerId: "10",
      ePlayerId: "11",
      wPlayerId: "12",
      maxMatchPoints: 4,
      nsMatchPoints: 2,
      ewMatchPoints: 2,
    },
  ],
};
