import { PairXIMPOverallScore } from "@/model/leaderboard";
import { ScoredTravellerOfType } from "@/scoring/overall/scored-traveller";
import { buildOverallScore } from "../common";

export function calculateOverallXIMPResults(
  travellers: ScoredTravellerOfType<"PAIR_XIMP">[],
): PairXIMPOverallScore {
  return {
    type: "PAIR_XIMP",
    mode: "PAIR",
    scoring: "XIMP",
    lines: buildOverallScore({
      travellers,
      project: (line) => [
        { id: line.nsId, value: line.nsCrossImps },
        { id: line.ewId, value: line.ewCrossImps },
      ],
      // EBU White Book §4.2.5: when pairs play different numbers of boards the
      // final score is scaled by the number of boards played, so all boards
      // count equally. We therefore rank and display the AVERAGE cross-IMP per
      // board (the cross-IMP analogue of the matchpoint percentage), not the
      // raw summed total — otherwise a pair that sat out (or had a board
      // removed) would be compared on a smaller total. With equal board counts
      // this only rescales every pair by the same divisor, leaving the order
      // unchanged.
      toResult: (pairId, data) => ({
        pairId,
        crossImps: data.boards > 0 ? data.value / data.boards : 0,
      }),
      sort: (x) => x.crossImps,
    }),
  };
}
