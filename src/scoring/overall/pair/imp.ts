import { PairIMPOverallScore } from "@/model/leaderboard";
import { ScoredTravellerOfType } from "@/scoring/overall/scored-traveller";
import { buildOverallScore } from "../common";

export function calculateOverallIMPResults(
  travellers: ScoredTravellerOfType<"PAIR_IMP">[],
): PairIMPOverallScore {
  return {
    type: "PAIR_IMP",
    mode: "PAIR",
    scoring: "IMP",
    lines: buildOverallScore({
      travellers,
      project: (line) => [
        { id: line.nsId, value: line.nsImps },
        { id: line.ewId, value: line.ewImps },
      ],
      // EBU White Book §4.2.5: scale by the number of boards played so all
      // boards count equally. Rank and display the AVERAGE IMP per board rather
      // than the raw summed total, so a pair that played fewer boards (sit-out
      // or removed board) is compared fairly. Equal board counts leave the
      // order unchanged (every pair divided by the same count).
      toResult: (pairId, data) => ({
        pairId,
        imps: data.boards > 0 ? data.value / data.boards : 0,
      }),
      sort: (x) => x.imps,
    }),
  };
}
