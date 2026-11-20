import type { Server } from "socket.io";
import { randomUUID } from "node:crypto";
import { getIO } from "@/socket/websocket";
import { DirectorRooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import type { DirectorAlert } from "@/model/director-alert";

/** How long alerts are kept for a director device that was offline. */
export const ALERT_REPLAY_MS = 30 * 60 * 1000;

/** Distributive Omit, so each alert variant keeps its own fields. */
type WithoutIdAndTime<T> = T extends unknown ? Omit<T, "id" | "at"> : never;
export type NewDirectorAlert = WithoutIdAndTime<DirectorAlert>;

/**
 * Recent alerts, kept on `globalThis`: alerts are raised by HTTP routes (the
 * Next.js bundle) and replayed by the socket server (the custom-server bundle),
 * which each have their own copy of this module. In memory only.
 */
const KEY = "__bridgeBoxDirectorAlerts";
type GlobalWithAlerts = typeof globalThis & { [KEY]?: DirectorAlert[] };

function recent(now: number): DirectorAlert[] {
  const g = globalThis as GlobalWithAlerts;
  g[KEY] = (g[KEY] ?? []).filter(
    (a) => now - Date.parse(a.at) < ALERT_REPLAY_MS,
  );
  return g[KEY];
}

/** The director room an alert goes to. */
export function alertRoom(alert: Pick<DirectorAlert, "audience">): string {
  return alert.audience.kind === "game"
    ? DirectorRooms.game(alert.audience.gameId)
    : DirectorRooms.all;
}

/**
 * Raise an alert: keep it for replay and push it to the director devices
 * concerned (that game's directors, or every director for Settings). Returns
 * the alert, whose id the device that signed in uses to skip its own alert.
 */
export function raiseDirectorAlert(
  alert: NewDirectorAlert,
  io: Server | null = getIO(),
  now = Date.now(),
): DirectorAlert {
  const full = {
    ...alert,
    id: randomUUID(),
    at: new Date(now).toISOString(),
  } as DirectorAlert;
  recent(now).push(full);
  io?.to(alertRoom(full)).emit(SocketEvents.DIRECTOR_ALERT, full);
  return full;
}

/**
 * Re-send an alert that has changed (e.g. a player called again), keeping its
 * id so director devices update the one they are showing rather than adding a
 * second. Its time moves to now. Returns the updated alert, or null when it is
 * no longer kept.
 */
export function updateDirectorAlert(
  id: string,
  update: (alert: DirectorAlert) => DirectorAlert,
  io: Server | null = getIO(),
  now = Date.now(),
): DirectorAlert | null {
  const alerts = recent(now);
  const index = alerts.findIndex((a) => a.id === id);
  if (index === -1) return null;
  const updated = {
    ...update(alerts[index]),
    id,
    at: new Date(now).toISOString(),
  };
  alerts[index] = updated;
  io?.to(alertRoom(updated)).emit(SocketEvents.DIRECTOR_ALERT, updated);
  return updated;
}

/** A game a device directs, and since when (ms since epoch). */
export interface DirectorScope {
  gameId: string;
  since: number;
}

/**
 * The recent alerts a director device should see, oldest first: alerts about
 * the games it directs, and Settings alerts, raised since it became a director
 * of them. A device that has only just become a director gets no backlog.
 */
export function recentAlertsFor(
  scopes: DirectorScope[],
  now = Date.now(),
): DirectorAlert[] {
  if (scopes.length === 0) return [];
  const earliest = Math.min(...scopes.map((s) => s.since));
  return recent(now).filter((a) => {
    const at = Date.parse(a.at);
    if (a.audience.kind === "settings") return at >= earliest;
    const gameId = a.audience.gameId;
    return scopes.some((s) => s.gameId === gameId && at >= s.since);
  });
}

/** Forget all alerts (tests). */
export function clearDirectorAlerts(): void {
  (globalThis as GlobalWithAlerts)[KEY] = [];
}
