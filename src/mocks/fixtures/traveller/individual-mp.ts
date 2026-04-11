import { IndividualMatchpointScoredTraveller } from "@/model/scored-traveller";

export const individualMpTraveller: IndividualMatchpointScoredTraveller = {
  type: "INDIVIDUAL_MP",
  board: 10,
  lines: [
    {
      outcome: "4SS=",
      score: 620,
      nId: "1",
      sId: "2",
      eId: "3",
      wId: "4",
      maxMatchPoints: 4,
      nsMatchPoints: 3,
      ewMatchPoints: 1,
    },
    {
      outcome: "NP",
      score: null,
      nId: "5",
      sId: "6",
      eId: "7",
      wId: "8",
      maxMatchPoints: 4,
      nsMatchPoints: 0,
      ewMatchPoints: 0,
    },
    {
      outcome: "PO",
      score: 0,
      nId: "9",
      sId: "10",
      eId: "11",
      wId: "12",
      maxMatchPoints: 4,
      nsMatchPoints: 2,
      ewMatchPoints: 2,
    },
  ],
};
