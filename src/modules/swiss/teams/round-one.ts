import type { MovementPlan } from "@/model/movement-plan";
import type { SwissTeamsMovementSpec } from "@/model/selected-movement";
import { roundOddResolution, swissTeamsRoundOne } from "./swiss-teams-pairing";
import {
  swissTeamsRoundOneSeed,
  swissTeamsRoundToMaterializable,
} from "./plan-round";

/**
 * The round-1 plan of a Swiss Teams section: a random team pairing, seeded per
 * game and section so a retried start draws the same round, expanded into the
 * two-table (open/closed room) board rows. An odd field resolves per the
 * round-1 plan entry: "BYE" byes the bottom table, SHORT/LONG triples the
 * bottom three (see `swissTeamsRoundOne`).
 */
export function swissTeamsRoundOnePlan(
  spec: SwissTeamsMovementSpec,
  gameId: string,
  section: string,
): MovementPlan {
  const {
    teams,
    rounds,
    boardsPerRound,
    oddHandling = "BYE",
    oddRoundPlan,
  } = spec;
  const { matches, byeTeamId, triple } = swissTeamsRoundOne(
    teams,
    swissTeamsRoundOneSeed(gameId, section),
    roundOddResolution(oddHandling, oddRoundPlan, 1),
  );
  return swissTeamsRoundToMaterializable(
    1,
    boardsPerRound,
    rounds,
    matches,
    byeTeamId,
    triple,
  );
}
