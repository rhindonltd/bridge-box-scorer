import { ScoredIndividualIMPTraveller } from "@/model/scored-traveller";

export const individualIMPTraveller: ScoredIndividualIMPTraveller = {
  type: "INDIVIDUAL_IMP",
  board: 10,
  section: crypto.randomUUID(),
  lines: [
    {
      outcome: "4SS=",
      score: 620,
      nId: "1",
      sId: "2",
      wId: "3",
      eId: "4",
      nsCrossImps: 6.23,
      ewCrossImps: 2.12,
    },
    {
      outcome: "NP",
      score: null,
      nId: "5",
      sId: "6",
      wId: "7",
      eId: "8",
      nsCrossImps: 0,
      ewCrossImps: 0,
    },
    {
      outcome: "PO",
      score: 0,
      nId: "9",
      sId: "10",
      wId: "11",
      eId: "12",
      nsCrossImps: 3.98,
      ewCrossImps: 3.98,
    },
  ],
};
