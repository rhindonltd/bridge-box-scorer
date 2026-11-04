import { NextResponse } from "next/server";
import { z } from "zod";

import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { splitSection } from "@/db/games/actions/split-section";
import { isGameStarted } from "@/db/games/queries/is-game-started";
import { broadcastSections } from "@/socket/broadcast/section-broadcast";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { clearTimerState } from "@/db/games/actions/clear-timer-state";
import { clearEngine } from "@/timer/game-store";
import { broadcastTimerCleared } from "@/socket/handlers/timer/broadcast-timer";
import { getIO } from "@/socket/websocket";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";

const bodySchema = z.object({
  from: z.string().min(1),
  newSection: z.string().min(1),
  tablesToNewSection: z.number().int().min(1),
  newLabel: z.string().min(1).optional(),
  fromLabel: z.string().min(1).optional(),
});

/**
 * POST /api/games/[gameId]/sections/split — split an existing section into two,
 * moving its highest-numbered tables (and the pairs seated at them) into a new
 * section (director-only). Pre-start only: renumbering seats after the movement
 * is materialised would orphan board rows, so a started game is rejected.
 *
 * On success it broadcasts the updated section list (`broadcastSections`), the
 * updated participant list (`broadcastParticipants`, since seated pairs moved
 * sections), and a `SEAT_RENUMBERED` event to the game room carrying every
 * old→new seat move, so the player devices whose seat moved can re-route
 * themselves to the new seat.
 *
 * The split clears both sections' movements (their table counts changed), so it
 * also drops each affected section's timer — the persisted config, the
 * in-memory engine, and a `TIMER_CLEARED` push — exactly as a direct movement
 * change does (`broadcastSectionMovementChanged`). Otherwise the shrunk source
 * would keep a timer sized for its old round structure and promote it at start.
 */
export const POST = withDirectorRoute(
  async ({ gameId, body }) => {
    if (await isGameStarted(gameId)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The game has already started; sections can no longer be split.",
        },
        { status: 400 },
      );
    }

    try {
      const moves = await splitSection(gameId, body);
      await broadcastSections(gameId);
      // Seated pairs changed section, so refresh the participant list too.
      await broadcastParticipants(gameId);

      const io = getIO();

      // Both sections' movements were cleared, so their timers are now stale.
      // Drop the persisted state + in-memory engine and notify each section's
      // timer room — the new section never had a timer (a no-op), the source
      // sheds its old-size one.
      for (const section of [body.from, body.newSection]) {
        await clearTimerState(gameId, section);
        clearEngine(gameId, section);
        if (io) broadcastTimerCleared(io, gameId, section);
      }

      // Tell the affected player devices their seat moved. Broadcast to the
      // whole game room (every device is in it); each device self-selects by
      // checking whether its own seat is among the moves. Skip when nothing
      // moved (an empty split).
      if (moves.length > 0) {
        io?.to(Rooms.game(gameId)).emit(SocketEvents.SEAT_RENUMBERED, {
          gameId,
          moves,
        });
      }
      return success({});
    } catch (err) {
      return respondToActionError(
        err,
        `Failed to split section ${body.from} in game ${gameId}:`,
      );
    }
  },
  { bodySchema },
);
