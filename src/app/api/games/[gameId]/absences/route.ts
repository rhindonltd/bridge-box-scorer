import { z } from "zod";
import { NextResponse } from "next/server";
import { withGameRoute } from "@/lib/api/gameRoute";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findAbsentPairs } from "@/db/games/queries/find-absent-pairs";
import { setAbsenceTreatment } from "@/db/games/actions/set-absence-treatment";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { getIO } from "@/socket/websocket";

/** Late arrivals / withdrawals apply to board-pooled PAIRS events (design §11). */
async function isPairsAbsenceGame(gameId: string): Promise<boolean> {
  const game = await findGameById(gameId);
  return game?.gameType === "PAIRS" && game.eventFormat !== "SWISS";
}

/**
 * GET /api/games/[gameId]/absences — the late, withdrawn and still-missing
 * pairs with the director's choice for their missed boards. Drives the
 * combined "Late Arrivals / Withdrawals / Substitutions" screen and its menu
 * label. Empty for any game the rules don't apply to.
 */
export const GET = withGameRoute(async ({ db, gameId }) => {
  if (!(await isPairsAbsenceGame(gameId))) return success({ absences: [] });
  return success({ absences: await findAbsentPairs(db) });
});

const patchSchema = z.object({
  seat: z.string().min(1),
  treatment: z.enum(["AVERAGE", "REMOVED"]),
});

/**
 * PATCH /api/games/[gameId]/absences — set how a late / withdrawn pair's
 * missed boards score: AVERAGE (AVE−/AVE+) or REMOVED. Director-only. Pushes a
 * fresh leaderboard (the choice changes the standings).
 */
export const PATCH = withDirectorRoute(
  async ({ gameId, body }) => {
    try {
      if (!(await isPairsAbsenceGame(gameId))) {
        return NextResponse.json(
          { success: false, error: "This doesn't apply to this event." },
          { status: 400 },
        );
      }
      const updated = await setAbsenceTreatment(
        gameId,
        body.seat,
        body.treatment,
      );
      if (!updated) {
        return NextResponse.json(
          {
            success: false,
            error: "That seat has no late arrival or withdrawal.",
          },
          { status: 404 },
        );
      }
      const io = getIO();
      if (io) await broadcastLeaderboardChanged(io, gameId);
      return success({});
    } catch (err) {
      return respondToActionError(
        err,
        `Failed to set the absence treatment for game ${gameId}:`,
      );
    }
  },
  { bodySchema: patchSchema },
);
