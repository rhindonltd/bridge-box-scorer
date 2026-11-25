import { scoreIMP, ImpLine } from "@/modules/scoring/traveller/pair/imp";
import { Traveller } from "@/model/traveller";
import { PerBoardScoringPlugin } from "@/modules/scoring/plugins/types";

export type ImpScoredLines = ImpLine[];
export const impPerBoardPlugin: PerBoardScoringPlugin<ImpScoredLines> = {
  id: "IMP",
  score: (traveller: Traveller) => scoreIMP(traveller.board, traveller.lines),
};
