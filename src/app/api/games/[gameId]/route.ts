import { z } from "zod";

import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { withGameRoute } from "@/lib/api/gameRoute";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { updateCombinedRanking } from "@/db/game-index/actions/update-combined-ranking";
import { updateTournamentLevel } from "@/db/game-index/actions/update-tournament-level";
import { TournamentLevels } from "@/db/games/types/tournament-level";
import { broadcastGameUpdated } from "@/socket/broadcast/game-broadcast";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { getIO } from "@/socket/websocket";

export const GET = withGameRoute(async ({ gameId }) => {
  return success({ game: await findGameById(gameId) });
});

// A partial update: each field is optional, but at least one must be present so
// an empty PATCH is rejected rather than silently doing nothing.
const bodySchema = z
  .object({
    combinedRanking: z.boolean().optional(),
    tournamentLevel: z.enum(TournamentLevels).optional(),
  })
  .refine((b) => b.combinedRanking !== undefined || b.tournamentLevel !== undefined, {
    message: "No settings to update",
  });

/**
 * PATCH /api/games/[gameId] — update one or more game-level settings:
 *  - `combinedRanking`: whether a multi-section event also shows a combined
 *    overall ranking. Changing it pushes a fresh leaderboard snapshot so any
 *    open display gains/drops the combined view live.
 *  - `tournamentLevel`: the EBU tournament level, letting a director correct a
 *    level set wrongly at creation (it only affects the USEBIO export, so it
 *    needs no leaderboard refresh).
 *
 * Director-only. Whichever fields are present are applied, then the fresh game
 * row is broadcast so every device's cached game updates.
 */
export const PATCH = withDirectorRoute(
  async ({ gameId, body }) => {
    try {
      if (body.combinedRanking !== undefined) {
        await updateCombinedRanking(gameId, body.combinedRanking);
      }
      if (body.tournamentLevel !== undefined) {
        await updateTournamentLevel(gameId, body.tournamentLevel);
      }

      await broadcastGameUpdated(gameId);

      // Only the combined-ranking change affects live standings; a tournament
      // level change is export-only, so skip the leaderboard recompute for it.
      if (body.combinedRanking !== undefined) {
        const io = getIO();
        if (io) await broadcastLeaderboardChanged(io, gameId);
      }

      return success({});
    } catch (err) {
      return respondToActionError(
        err,
        `Failed to update settings for game ${gameId}:`,
      );
    }
  },
  { bodySchema },
);
