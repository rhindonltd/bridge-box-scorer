import "server-only";

import type { Server } from "socket.io";
import { getIO } from "@/socket/websocket";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { clearTimerState } from "@/db/games/actions/clear-timer-state";
import { clearEngine } from "@/services/timer/game-store";
import { broadcastTimerCleared } from "@/socket/handlers/timer/broadcast-timer";
import {
  SelectedMovement,
  selectedMovementsEqual,
} from "@/model/selected-movement";

/**
 * Live-broadcast helpers for section changes, decoupled from the transport that
 * triggered the mutation. HTTP routes (and, historically, socket handlers) call
 * these after writing to the DB; they resolve the running Socket.IO server via
 * `getIO()` and no-op when it isn't available (e.g. in a unit test).
 */

/**
 * Tell the game room that its sections changed. Section membership (add /
 * delete / rename / resize) affects the whole game view, so it goes to the game
 * room as `GAME_UPDATED`; the sections list revalidates on that event, and the
 * pushed game row carries the updated table count. No-op when the server is not
 * running.
 */
export async function broadcastSections(gameId: string): Promise<void> {
  const io = getIO();
  if (!io) return;
  await emitGameUpdated(io, gameId);
}

/**
 * Apply the live side-effects of a section's movement changing:
 * - Notify just that section's clients (`SECTION_UPDATED`).
 * - Nudge the game room so the director's manage view refreshes (`GAME_UPDATED`).
 * - When the movement actually changed vs `previous`, the timer's derived round
 *   structure is now stale: clear the persisted timer state + in-memory engine
 *   and tell that section's timer room to reset (`TIMER_CLEARED`).
 *
 * The caller passes the movement as it was BEFORE the write (`previous`) and
 * the movement just written (`next`).
 */
export async function broadcastSectionMovementChanged(
  gameId: string,
  section: string,
  previous: SelectedMovement | null,
  next: SelectedMovement | null,
): Promise<void> {
  const io = getIO();
  if (!io) return;

  if (!selectedMovementsEqual(previous, next)) {
    await clearTimerState(gameId, section);
    clearEngine(gameId, section);
    broadcastTimerCleared(io, gameId, section);
  }

  io.to(Rooms.section(gameId, section)).emit(SocketEvents.SECTION_UPDATED, {
    gameId,
    section,
  });
  await emitGameUpdated(io, gameId);
}

/**
 * Emit `GAME_UPDATED` to the game room carrying the fresh game row. Clients
 * write `payload.game` straight into their cached game, so this event must
 * always carry the game: an emit without it used to wipe the cache back to the
 * page's initial snapshot (e.g. undoing a game type change until a reload).
 * Listeners that only revalidate their own keys (sections, start check) are
 * nudged by the same event. Skipped when the game no longer exists.
 */
async function emitGameUpdated(io: Server, gameId: string): Promise<void> {
  const game = await findGameById(gameId);
  if (!game) return;
  io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, { game });
}
