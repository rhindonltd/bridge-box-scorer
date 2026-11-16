import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findTeamsRoster } from "@/db/games/queries/find-teams-roster";

/**
 * GET /api/games/[gameId]/teams — the director's Teams roster: every team with
 * its standing and the pairs that have played for it. Covers Teams and Swiss
 * Teams; empty for a Pairs game (which has the Pairs roster instead).
 *
 * Read-only: a standing change goes over the `game:setParticipantStanding`
 * socket event (sent to the team's home NS seat), and a substitution is made by
 * the players themselves.
 */
export const GET = withGameRoute(async ({ db, gameId }) => {
  const game = await findGameById(gameId);
  if (game?.gameType !== "TEAMS") return success({ roster: [] });
  return success({ roster: await findTeamsRoster(db) });
});
