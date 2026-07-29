import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";

export const pairXimpTraveller: ScoredTravellerOfType<"PAIR_XIMP"> = {
  type: "PAIR_XIMP",
  board: 7,
  lines: [
    {
      outcome: "4SN=",
      nsId: "1",
      ewId: "2",
      score: 420,
      nsCrossImps: 3.67,
      ewCrossImps: -3.67,
    },
    {
      outcome: "3NTN+1",
      nsId: "3",
      ewId: "4",
      score: 430,
      nsCrossImps: 4.33,
      ewCrossImps: -4.33,
    },
    {
      outcome: "4SN-1",
      nsId: "5",
      ewId: "6",
      score: -50,
      nsCrossImps: -8.0,
      ewCrossImps: 8.0,
    },
  ],
};
