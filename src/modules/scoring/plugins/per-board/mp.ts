import { scoreMP, MatchpointLine } from "@/modules/scoring/traveller/pair/mp";
import { roundMpBoards } from "@/modules/scoring/traveller/pair/round-mp-boards";
import { Traveller } from "@/model/traveller";
import { PerBoardScoringPlugin } from "@/modules/scoring/plugins/types";

export type MpScoredLines = MatchpointLine[];
export const mpPerBoardPlugin: PerBoardScoringPlugin<MpScoredLines> = {
  id: "MP",
  // EBU White Book §4.2.6.1: a single board's matchpoint score is rounded to
  // the nearest whole matchpoint (exact halves away from the board average).
  // Done on the per-board display so the shown MP / % match the figures the
  // overall ranking sums (which rounds the same way). Cross-board equalisation
  // and the "better than average" uplift are standings-only and deliberately
  // NOT applied here — this is a single board in isolation.
  score: (traveller: Traveller) =>
    roundMpBoards([
      {
        board: traveller.board,
        lines: scoreMP(traveller.board, traveller.lines),
      },
    ])[0].lines,
};
