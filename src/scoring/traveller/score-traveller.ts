import { Traveller } from "@/model/traveller";
import { ScoringType } from "@/db/games/types/scoring-type";
import "@/scoring/plugins/register";
import { getCombination, getPerBoardPlugin } from "@/scoring/plugins/registry";
import { PerBoardPluginId } from "@/scoring/plugins/types";

/**
 * A per-board scoring result. Carries the id of the plugin that produced it so
 * the display layer can resolve the plugin (and its views) from the registry,
 * plus the scored lines (shape defined by that plugin).
 */
export interface ScoredBoard {
  pluginId: PerBoardPluginId;
  board: number;
  lines: unknown;
}

/**
 * Score a single board's traveller for the given stored scoring type. The
 * combination registry decides which per-board plugin to use; there is no
 * scoring-type branching here.
 */
export function scoreBoard(
  traveller: Traveller,
  scoringType: ScoringType,
): ScoredBoard {
  const pluginId = getCombination(scoringType).perBoard;
  const plugin = getPerBoardPlugin(pluginId);

  return {
    pluginId,
    board: traveller.board,
    lines: plugin.score(traveller),
  };
}
