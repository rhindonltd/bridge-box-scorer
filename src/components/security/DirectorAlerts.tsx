"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket, emitWithAck } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import {
  DIRECTOR_TOKENS_CHANGED,
  getDirectorToken,
  heldDirectorTokens,
} from "@/lib/director-token";
import { playChime, primeChime } from "@/lib/chime";
import { isAlertHidden, markAlertSeen } from "@/lib/director-alerts-seen";
import type { DirectorAlert } from "@/model/director-alert";
import { DirectorAlertsView } from "./DirectorAlertsView";

/**
 * Shows director alerts on a director device, on every screen: security
 * alerts, and players calling the director to their table (with a chime).
 *
 * While the device holds any director token it proves them to the server
 * (`director:watch`) on mount, on every socket (re)connect, and whenever it
 * gains or loses one. That joins the director-alert rooms and returns recent
 * alerts it may have missed while asleep. Live alerts then arrive as
 * `director:alert`. Alerts this device has dismissed, or raised itself by
 * signing in, are never shown. A call that is called again updates in place.
 * Dismissing a call answers it, telling the player the director is coming.
 *
 * A device that isn't a director doesn't open a socket for this.
 */
export function DirectorAlerts() {
  const [alerts, setAlerts] = useState<DirectorAlert[]>([]);

  const add = useCallback((incoming: DirectorAlert[]) => {
    const fresh = incoming.filter((a) => !isAlertHidden(a));
    if (fresh.length === 0) return;
    setAlerts((current) => {
      const byId = new Map(fresh.map((a) => [a.id, a]));
      // An alert already showing is replaced by its newer copy (a player
      // calling again); anything else is added at the end.
      const updated = current.map((a) => byId.get(a.id) ?? a);
      const known = new Set(current.map((a) => a.id));
      return [...updated, ...fresh.filter((a) => !known.has(a.id))];
    });
    if (fresh.some((a) => a.kind === "callDirector")) playChime();
  }, []);

  useEffect(() => {
    let listening = false;
    const onAlert = (alert: DirectorAlert) => add([alert]);

    const watch = () => {
      const directors = heldDirectorTokens();
      if (directors.length === 0 && !listening) return;
      const socket = getSocket();
      if (!listening) {
        socket.on(SocketEvents.DIRECTOR_ALERT, onAlert);
        socket.on(SocketEvents.CONNECT, watch);
        listening = true;
      }
      emitWithAck<{ alerts: DirectorAlert[] }>(SocketEvents.DIRECTOR_WATCH, {
        directors,
      })
        .then((data) => add(data.alerts))
        // A failed or timed-out watch is retried on the next reconnect.
        .catch(() => {});
    };

    watch();
    // Sound needs a tap first; unlock it on the first one.
    primeChime();
    window.addEventListener(DIRECTOR_TOKENS_CHANGED, watch);
    return () => {
      window.removeEventListener(DIRECTOR_TOKENS_CHANGED, watch);
      if (listening) {
        const socket = getSocket();
        socket.off(SocketEvents.DIRECTOR_ALERT, onAlert);
        socket.off(SocketEvents.CONNECT, watch);
      }
    };
  }, [add]);

  const dismiss = (id: string) => {
    const alert = alerts.find((a) => a.id === id);
    markAlertSeen(id);
    setAlerts((current) => current.filter((a) => a.id !== id));
    if (alert?.kind === "callDirector") {
      const gameId = alert.audience.gameId;
      // The first director to dismiss a call answers it.
      emitWithAck(SocketEvents.DIRECTOR_ANSWER_CALL, {
        gameId,
        directorToken: getDirectorToken(gameId),
        alertId: id,
      }).catch(() => {});
    }
  };

  return <DirectorAlertsView alerts={alerts} onDismiss={dismiss} />;
}
