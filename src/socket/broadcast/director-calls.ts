import type { Server } from "socket.io";
import { getIO } from "@/socket/websocket";
import {
  raiseDirectorAlert,
  updateDirectorAlert,
} from "@/socket/broadcast/director-alerts";
import type { CallingTable, DirectorAlert } from "@/model/director-alert";

export type CallAlert = Extract<DirectorAlert, { kind: "callDirector" }>;

/**
 * Open "Call Director" calls: one per seat until a director answers it (by
 * dismissing the popup). Calling again while a call is open bumps that call
 * instead of raising another, so the director sees one popup saying how many
 * times the pair has called.
 *
 * Kept on `globalThis` beside the alert buffer (see director-alerts.ts), in
 * memory only.
 */
interface OpenCall {
  alertId: string;
  gameId: string;
  seat: string;
}

const KEY = "__bridgeBoxDirectorCalls";
type GlobalWithCalls = typeof globalThis & { [KEY]?: Map<string, OpenCall> };

function calls(): Map<string, OpenCall> {
  const g = globalThis as GlobalWithCalls;
  if (!g[KEY]) g[KEY] = new Map();
  return g[KEY];
}

const seatKey = (gameId: string, seat: string) => `${gameId}:${seat}`;

export interface CallDetails {
  eventName: string;
  table: CallingTable;
  players: string;
}

/**
 * A pair at `seat` is calling the director. Raises a popup for the game's
 * directors, or bumps the pair's open call. Returns the alert.
 */
export function callDirector(
  gameId: string,
  seat: string,
  details: CallDetails,
  io: Server | null = getIO(),
  now = Date.now(),
): CallAlert {
  const key = seatKey(gameId, seat);
  const open = calls().get(key);
  if (open) {
    // An open call always points at a call alert.
    const bumped = updateDirectorAlert(
      open.alertId,
      (alert) => ({
        ...(alert as CallAlert),
        table: details.table,
        players: details.players,
        calls: (alert as CallAlert).calls + 1,
      }),
      io,
      now,
    );
    if (bumped) return bumped as CallAlert;
  }

  const alert = raiseDirectorAlert(
    {
      kind: "callDirector",
      audience: { kind: "game", gameId, eventName: details.eventName },
      table: details.table,
      players: details.players,
      calls: 1,
    },
    io,
    now,
  );
  calls().set(key, { alertId: alert.id, gameId, seat });
  return alert as CallAlert;
}

/**
 * A director answered (dismissed) a call. Closes it so the pair's next call is
 * a fresh one, and returns the calling seat so it can be told the director is
 * on the way. Null when the call isn't open (another director already
 * answered it, or it's for another game).
 */
export function answerCall(gameId: string, alertId: string): string | null {
  for (const [key, call] of calls()) {
    if (call.alertId === alertId && call.gameId === gameId) {
      calls().delete(key);
      return call.seat;
    }
  }
  return null;
}

/** Forget all open calls (tests). */
export function clearDirectorCalls(): void {
  calls().clear();
}
