import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";

export const individualXimpTraveller: ScoredTravellerOfType<"INDIVIDUAL_XIMP"> =
  {
    type: "INDIVIDUAL_XIMP",
    board: 3,
    lines: [
      {
        outcome: "3NTN=",
        nId: "1",
        sId: "2",
        eId: "3",
        wId: "4",
        score: 400,
        nsCrossImps: 2.5,
        ewCrossImps: -2.5,
      },
      {
        outcome: "3NTN+1",
        nId: "5",
        sId: "6",
        eId: "7",
        wId: "8",
        score: 430,
        nsCrossImps: 4.17,
        ewCrossImps: -4.17,
      },
      {
        outcome: "2NTS-1",
        nId: "9",
        sId: "10",
        eId: "11",
        wId: "12",
        score: -50,
        nsCrossImps: -6.67,
        ewCrossImps: 6.67,
      },
    ],
  };
