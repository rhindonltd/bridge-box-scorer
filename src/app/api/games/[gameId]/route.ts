import { z } from "zod";

import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { withGameRoute } from "@/lib/api/gameRoute";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { updateCombinedRanking } from "@/db/game-index/actions/update-combined-ranking";
import { updateTournamentLevel } from "@/db/game-index/actions/update-tournament-level";
import { updateEventDetails } from "@/db/game-index/actions/update-event-details";
import { TournamentLevels } from "@/db/games/types/tournament-level";
import { GameTypes } from "@/db/games/types/game-type";
import { EventFormats } from "@/db/games/types/event-format";
import { ScoringTypes } from "@/db/games/types/scoring-type";
import { broadcastGameUpdated } from "@/socket/broadcast/game-broadcast";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { getIO } from "@/socket/websocket";

export const GET = withGameRoute(async ({ gameId }) => {
  return success({ game: await findGameById(gameId) });
});

// The event-detail fields the director can edit after creation (the create
// form's step-2 options plus the name/director from step 1).
const EVENT_DETAIL_KEYS = [
  "eventName",
  "director",
  "gameType",
  "eventFormat",
  "scoringType",
  "leadCardRequired",
  "handEntryEnabled",
] as const;

// A partial update: each field is optional, but at least one must be present so
// an empty PATCH is rejected rather than silently doing nothing.
const bodySchema = z
  .object({
    combinedRanking: z.boolean().optional(),
    tournamentLevel: z.enum(TournamentLevels).optional(),
    // Event details — editable from the "Edit Event Details" setup screen.
    eventName: z.string().min(1).optional(),
    director: z.string().nullish(),
    gameType: z.enum(GameTypes).optional(),
    eventFormat: z.enum(EventFormats).optional(),
    scoringType: z.enum(ScoringTypes).optional(),
    leadCardRequired: z.boolean().optional(),
    handEntryEnabled: z.boolean().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), {
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
 *  - Event details (`eventName`, `director`, `gameType`, `eventFormat`,
 *    `scoringType`, `leadCardRequired`, `handEntryEnabled`): the create-form
 *    options, editable from the setup screen's back arrow. A structural change
 *    (game type / format / scoring) clears the selected movement so the
 *    director re-picks one that fits.
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

      const hasEventDetails = EVENT_DETAIL_KEYS.some(
        (k) => body[k] !== undefined,
      );
      if (hasEventDetails) {
        await updateEventDetails(gameId, {
          eventName: body.eventName,
          director: body.director,
          gameType: body.gameType,
          eventFormat: body.eventFormat,
          scoringType: body.scoringType,
          leadCardRequired: body.leadCardRequired,
          handEntryEnabled: body.handEntryEnabled,
        });
      }

      await broadcastGameUpdated(gameId);

      // The combined-ranking change and any event-details change (scoring /
      // type can change how the field ranks) affect live standings; a
      // tournament-level-only change is export-only, so skip the recompute.
      if (body.combinedRanking !== undefined || hasEventDetails) {
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
