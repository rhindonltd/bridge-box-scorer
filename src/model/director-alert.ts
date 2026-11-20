/**
 * A security alert shown on directors' devices: someone became a director, or
 * unlocked Settings, or a device keeps failing to.
 *
 * Pure data + wording (no I/O), shared by the server that raises alerts and
 * the popup that shows them.
 */

/** Who a device is seated as, at a game being played. */
export interface AlertSeat {
  eventName: string;
  seatLabel: string;
  players: string;
}

/** What the sign-in was for, and so which directors are told. */
export type AlertAudience =
  { kind: "game"; gameId: string; eventName: string } | { kind: "settings" };

/** Where a player calling the director is sitting. */
export interface CallingTable {
  /** Section name, given only in a multi-section game. */
  section: string | null;
  /** Null when the pair has no table this round (e.g. sitting out). */
  tableNumber: number | null;
  /** Null before the game starts, or once its rounds are over. */
  roundNumber: number | null;
  /** The side the pair sits this round, when known. */
  side: "NS" | "EW" | null;
}

export type DirectorAlert =
  | {
      id: string;
      at: string;
      /** A player at a table is asking for the director. */
      kind: "callDirector";
      audience: Extract<AlertAudience, { kind: "game" }>;
      table: CallingTable;
      /** "Mary Smith & John Jones". */
      players: string;
      /** How many times the pair has called since the call was answered. */
      calls: number;
    }
  | {
      id: string;
      /** ISO timestamp. */
      at: string;
      kind: "signedIn";
      audience: AlertAudience;
      method: "shareCode" | "adminKey";
      seatedAs: AlertSeat[];
      /**
       * A random id the signing-in device chose and remembered before sending,
       * so it can recognise (and not show) its own alert even when the alert
       * arrives before the sign-in reply does.
       */
      originId?: string;
    }
  | {
      id: string;
      at: string;
      kind: "repeatedFailures";
      audience: AlertAudience;
      failures: number;
      blockedMinutes: number;
      seatedAs: AlertSeat[];
    };

/** "Mary Smith & John Jones (Table 3 NS, Monday Pairs)", or a fallback. */
export function describeDevice(seatedAs: AlertSeat[]): string {
  if (seatedAs.length === 0) return "A device that isn't seated at a game";
  return seatedAs
    .map((s) => `${s.players} (${s.seatLabel}, ${s.eventName})`)
    .join(" / ");
}

/** "19:42" in the device's local time. */
export function alertTime(at: string): string {
  return new Date(at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Table 3, Round 2 (Section Blue)", or what is known of it. */
export function describeTable(table: CallingTable): string {
  const parts = [
    table.tableNumber !== null ? `Table ${table.tableNumber}` : "No table",
    ...(table.roundNumber !== null ? [`Round ${table.roundNumber}`] : []),
  ].join(", ");
  return table.section ? `${parts} (Section ${table.section})` : parts;
}

/** The alert's message, e.g. for the popup. */
export function describeAlert(alert: DirectorAlert): string {
  if (alert.kind === "callDirector") {
    const side = alert.table.side ? ` (${alert.table.side})` : "";
    const again =
      alert.calls > 1 ? ` They have called ${alert.calls} times.` : "";
    return `${describeTable(alert.table)}: ${alert.players}${side} ${
      alert.players.includes("&") ? "are" : "is"
    } calling the director at ${alert.audience.eventName}.${again}`;
  }

  const who = describeDevice(alert.seatedAs);
  const what =
    alert.audience.kind === "game"
      ? `become a director of ${alert.audience.eventName}`
      : "unlock this Bridge Box's Settings";

  if (alert.kind === "signedIn") {
    const how =
      alert.method === "adminKey" ? "the admin key" : "a director share code";
    const did =
      alert.audience.kind === "game"
        ? `became a director of ${alert.audience.eventName}`
        : "unlocked this Bridge Box's Settings";
    return `${who} ${did} using ${how}.`;
  }

  return `${who} made ${alert.failures} failed attempts to ${what} in the last 2 minutes. Further attempts from that device are blocked for ${alert.blockedMinutes} minutes.`;
}
