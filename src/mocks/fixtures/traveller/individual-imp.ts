import { ScoredIndividualIMPTraveller } from "@/model/scored-traveller";

export const individualIMPTraveller: ScoredIndividualIMPTraveller = {
  type: "INDIVIDUAL_IMP",
  board: 10,
  section: crypto.randomUUID(),
  lines: [
    {
      outcome: "4SS=",
      score: 620,
      nPlayerId: "1",
      sPlayerId: "2",
      wPlayerId: "3",
      ePlayerId: "4",
      nsCrossImps: 6.23,
      ewCrossImps: 2.12,
    },
    {
      outcome: "NP",
      score: null,
      nPlayerId: "5",
      sPlayerId: "6",
      wPlayerId: "7",
      ePlayerId: "8",
      nsCrossImps: 0,
      ewCrossImps: 0,
    },
    {
      outcome: "PO",
      score: 0,
      nPlayerId: "9",
      sPlayerId: "10",
      wPlayerId: "11",
      ePlayerId: "12",
      nsCrossImps: 3.98,
      ewCrossImps: 3.98,
    },
  ],
};
