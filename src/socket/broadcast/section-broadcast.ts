import "server-only";

import { getIO } from "@/socket/websocket";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { getDb } from "@/db/games";
import { findSections } from "@/db/games/queries/find-sections";
import { clearTimerState } from "@/db/games/actions/clear-timer-state";
import { clearEngine } from "@/timer/game-store";
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
 * Broadcast the full section list game-wide. Section membership (add / delete /
 * rename / resize) affects the whole game view, so it goes to the game room.
 * No-op when the server or the game db is unavailable.
 */
export async function broadcastSections(gameId: string): Promise<void> {
  const io = getIO();
  if (!io) return;

  const db = await getDb(gameId);
  if (!db) return;

  const sections = await findSections(db);
  io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, {
    gameId,
    sections,
  });
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
  io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, { gameId });
}
