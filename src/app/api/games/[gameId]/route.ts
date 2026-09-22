import { z } from "zod";

import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { withGameRoute } from "@/lib/api/gameRoute";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { updateCombinedRanking } from "@/db/game-index/actions/update-combined-ranking";
import { broadcastGameUpdated } from "@/socket/broadcast/game-broadcast";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { getIO } from "@/socket/websocket";

export const GET = withGameRoute(async ({ gameId }) => {
  return success({ game: await findGameById(gameId) });
});

const bodySchema = z.object({ combinedRanking: z.boolean() });

/**
 * PATCH /api/games/[gameId] — update a game-level setting. Currently just the
 * `combinedRanking` flag (whether a multi-section event also shows a combined
 * overall ranking). Director-only. Broadcasts the fresh game row so every
 * device updates, and pushes a fresh leaderboard snapshot so any open display
 * gains/drops the combined view live.
 */
export const PATCH = withDirectorRoute(
  async ({ gameId, body }) => {
    try {
      await updateCombinedRanking(gameId, body.combinedRanking);
      await broadcastGameUpdated(gameId);
      const io = getIO();
      if (io) await broadcastLeaderboardChanged(io, gameId);
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
