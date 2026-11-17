import { NextResponse } from "next/server";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { checkFinalise } from "@/services/finalise-game-service";
import {
  finaliseGame,
  reopenGame,
} from "@/db/game-index/actions/set-finalised";
import { broadcastGameUpdated } from "@/socket/broadcast/game-broadcast";
import { broadcastJoinableGames } from "@/socket/broadcast/joinable-broadcast";

/**
 * POST /api/games/[gameId]/finalise — finalise a game (director-only).
 *
 * Re-runs the finalise check server-side (never trusting the client) and only
 * marks the game finalised when every game problem is resolved. A finalised
 * game is read-only, leaves Manage Games / Join / Display and appears under
 * Export Game. Returns 409 with the blocking `problems` otherwise.
 */
export const POST = withDirectorRoute(async ({ gameId, db }) => {
  try {
    const check = await checkFinalise(gameId, db);
    if (!check.canFinalise) {
      return NextResponse.json(
        {
          success: false,
          error: "Game cannot be finalised",
          problems: check.problems,
        },
        { status: 409 },
      );
    }
    await finaliseGame(gameId);
    await broadcastGameUpdated(gameId);
    await broadcastJoinableGames();
    return success({});
  } catch (err) {
    return respondToActionError(err, `Failed to finalise game ${gameId}:`);
  }
});

/**
 * DELETE /api/games/[gameId]/finalise — reopen a finalised game (director-only).
 * Clears the finalised flag so the game is editable and listed again.
 * Idempotent: reopening an open game succeeds.
 */
export const DELETE = withDirectorRoute(async ({ gameId }) => {
  try {
    await reopenGame(gameId);
    await broadcastGameUpdated(gameId);
    await broadcastJoinableGames();
    return success({});
  } catch (err) {
    return respondToActionError(err, `Failed to reopen game ${gameId}:`);
  }
});
