import { scoreXIMP } from "@/modules/scoring/traveller/pair/x-imp";
import { Traveller } from "@/model/traveller";
import { PerBoardScoringPlugin } from "@/modules/scoring/plugins/types";

export type XimpScoredLines = ReturnType<typeof scoreXIMP>;
export const ximpPerBoardPlugin: PerBoardScoringPlugin<XimpScoredLines> = {
  id: "XIMP",
  score: (traveller: Traveller) => scoreXIMP(traveller.board, traveller.lines),
};
