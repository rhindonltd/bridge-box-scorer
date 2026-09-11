import { NextResponse } from "next/server";

import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { startGame } from "@/services/start-game-service";
import { promoteTimerAtGameStart } from "@/timer/promote-timer";
import { broadcastGameStarted } from "@/socket/broadcast/game-broadcast";
import { getIO } from "@/socket/websocket";

/**
 * POST /api/games/[gameId]/start — start a game (director-only).
 *
 * Re-runs the start-check server-side (never trusting the client) and, only when
 * the seating validly matches the selected movement, materializes the boards and
 * assignments (with any single sit-out applied). On success, promotes any timer
 * configured during setup and broadcasts GAME_UPDATED so clients transition into
 * the running game.
 *
 * Returns 409 with the blocking `problems` when the game is not in a startable
 * state.
 */
export const POST = withDirectorRoute(async ({ gameId }) => {
  try {
    const validation = await startGame(gameId);

    if (!validation.canStart) {
      return NextResponse.json(
        {
          success: false,
          error: "Game cannot be started",
          problems: validation.problems,
        },
        { status: 409 },
      );
    }

    // If the director configured a timer during setup, start it running now.
    // Best-effort and only when a live server is available; never blocks start.
    const io = getIO();
    if (io) {
      await promoteTimerAtGameStart(gameId, io);
    }

    await broadcastGameStarted(gameId);

    return success({});
  } catch (err) {
    return respondToActionError(err, `Failed to start game ${gameId}:`);
  }
});
