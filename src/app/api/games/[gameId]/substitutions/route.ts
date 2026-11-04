import { z } from "zod";
import { NextResponse } from "next/server";

import { withGameRoute } from "@/lib/api/gameRoute";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { findSubstitutionSeats } from "@/db/games/queries/find-substitution-seats";
import { setSubstitutionOptions } from "@/db/games/actions/set-substitution-options";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { getIO } from "@/socket/websocket";
import { isTeamsGame } from "@/db/game-index/queries/is-teams-game";

/**
 * GET /api/games/[gameId]/substitutions — the substituted seats (§2.4.7 mid-game
 * substitutions), each with both occupants and its current split/eligibility
 * choices. Drives the "Substitutions" screen and gates its menu item (empty
 * list ⇒ no substitutions ⇒ item hidden). Not director-gated (the names are
 * already on the leaderboard / traveller); the WRITE (PATCH) is director-only.
 */
export const GET = withGameRoute(async ({ db }) => {
  return success({ substitutions: await findSubstitutionSeats(db) });
});

const patchSchema = z.object({
  seat: z.string().min(1),
  /** Whether the seat scores as two separate lines (true) or one merged line. */
  split: z.boolean(),
  /** Per-occupant eligibility for the local ranking. */
  eligibility: z
    .array(z.object({ id: z.number().int(), eligible: z.boolean() }))
    .min(1),
  /**
   * The main pair's occupancy id — whose name + EBU record represents the one
   * merged line (split = false only; ignored when split = true). Optional.
   */
  mainOccupancyId: z.number().int().optional(),
});

/**
 * PATCH /api/games/[gameId]/substitutions — set a substituted seat's options:
 * "Split by board?" (per seat) and "Eligible for local ranking?" (per
 * occupant). Director-only. Writes `split` on both occupancies + each
 * occupant's `standing`, then re-broadcasts the participant list + a fresh
 * leaderboard snapshot (the choices change the ranking and the stitched names).
 * Rejected (400) for a teams event.
 */
export const PATCH = withDirectorRoute(
  async ({ db: _db, gameId, body }) => {
    try {
      // Split / eligibility are pairs-only concepts: a team's score is never
      // affected by which pair sat a seat, so there is nothing to configure.
      if (await isTeamsGame(gameId)) {
        return NextResponse.json(
          {
            success: false,
            error: "Substitution options do not apply to a teams event.",
          },
          { status: 400 },
        );
      }

      const updated = await setSubstitutionOptions(gameId, body.seat, {
        split: body.split,
        eligibility: body.eligibility,
        mainOccupancyId: body.mainOccupancyId,
      });

      if (!updated) {
        return NextResponse.json(
          { success: false, error: "No pair is seated there." },
          { status: 404 },
        );
      }

      const io = getIO();
      if (io) {
        await broadcastParticipants(gameId, io);
        await broadcastLeaderboardChanged(io, gameId);
      }

      return success({});
    } catch (err) {
      return respondToActionError(
        err,
        `Failed to set substitution options for game ${gameId}:`,
      );
    }
  },
  { bodySchema: patchSchema },
);
