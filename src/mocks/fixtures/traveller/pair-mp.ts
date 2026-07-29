import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";

export const pairMpTraveller: ScoredTravellerOfType<"PAIR_MP"> = {
  type: "PAIR_MP",
  board: 5,
  lines: [
    {
      outcome: "4HN=",
      nsId: "1",
      ewId: "2",
      score: 420,
      maxMatchPoints: 4,
      nsMatchPoints: 4,
      ewMatchPoints: 0,
    },
    {
      outcome: "3NTW+1",
      nsId: "3",
      ewId: "4",
      score: -430,
      maxMatchPoints: 4,
      nsMatchPoints: 0,
      ewMatchPoints: 4,
    },
    {
      outcome: "4HN+1",
      nsId: "5",
      ewId: "6",
      score: 450,
      maxMatchPoints: 4,
      nsMatchPoints: 2,
      ewMatchPoints: 2,
    },
  ],
};
