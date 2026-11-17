import { z } from "zod";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { updateTournamentLevel } from "@/db/game-index/actions/update-tournament-level";
import { TournamentLevels } from "@/db/games/types/tournament-level";
import { broadcastGameUpdated } from "@/socket/broadcast/game-broadcast";

const bodySchema = z.object({
  tournamentLevel: z.enum(TournamentLevels),
});

/**
 * PUT /api/games/[gameId]/tournament-level — set the EBU tournament level that
 * fixes the masterpoint/charge fields of the USEBIO file (director-only).
 *
 * Deliberately NOT blocked for a finalised game: the level is chosen on the
 * export page, after finalising, and does not change any result. Downloads and
 * uploads use the level saved here and never change it themselves.
 */
export const PUT = withDirectorRoute(
  async ({ gameId, body }) => {
    try {
      await updateTournamentLevel(gameId, body.tournamentLevel);
      await broadcastGameUpdated(gameId);
      return success({});
    } catch (err) {
      return respondToActionError(
        err,
        `Failed to set the tournament level for game ${gameId}:`,
      );
    }
  },
  { bodySchema },
);
