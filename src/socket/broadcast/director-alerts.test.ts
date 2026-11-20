import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/socket/websocket", () => ({ getIO: vi.fn(() => null) }));

import type { NewDirectorAlert } from "./director-alerts";
import {
  ALERT_REPLAY_MS,
  alertRoom,
  clearDirectorAlerts,
  raiseDirectorAlert,
  recentAlertsFor,
  updateDirectorAlert,
} from "./director-alerts";

function makeIo() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { io: { to } as never, to, emit };
}

const gameAlert = (gameId: string): NewDirectorAlert => ({
  kind: "signedIn",
  audience: { kind: "game", gameId, eventName: "Monday Pairs" },
  method: "adminKey",
  seatedAs: [],
});
const settingsAlert: NewDirectorAlert = {
  kind: "repeatedFailures",
  audience: { kind: "settings" },
  failures: 3,
  blockedMinutes: 5,
  seatedAs: [],
};

describe("director alerts broadcaster", () => {
  beforeEach(() => clearDirectorAlerts());

  it("sends a game alert to that game's directors, with an id and time", () => {
    const { io, to, emit } = makeIo();
    const alert = raiseDirectorAlert(gameAlert("g1"), io, 0);
    expect(alert.id).toEqual(expect.any(String));
    expect(alert.at).toBe(new Date(0).toISOString());
    expect(to).toHaveBeenCalledWith("directors:game:g1");
    expect(emit).toHaveBeenCalledWith("director:alert", alert);
  });

  it("sends a Settings alert to every director", () => {
    const { io, to } = makeIo();
    raiseDirectorAlert(settingsAlert, io, 0);
    expect(to).toHaveBeenCalledWith("directors:all");
    expect(alertRoom({ audience: { kind: "settings" } })).toBe("directors:all");
  });

  it("keeps alerts with no live server, using the shared server by default", () => {
    raiseDirectorAlert(gameAlert("g1"));
    expect(recentAlertsFor([{ gameId: "g1", since: 0 }])).toHaveLength(1);
  });

  it("replays Settings alerts and the device's own games' alerts", () => {
    const { io } = makeIo();
    const a = raiseDirectorAlert(gameAlert("g1"), io, 0);
    raiseDirectorAlert(gameAlert("g2"), io, 0);
    const s = raiseDirectorAlert(settingsAlert, io, 0);
    expect(recentAlertsFor([{ gameId: "g1", since: 0 }], 1)).toEqual([a, s]);
    // A device that directs nothing gets nothing.
    expect(recentAlertsFor([], 1)).toEqual([]);
  });

  it("only replays alerts raised since the device became a director", () => {
    const { io } = makeIo();
    const before = raiseDirectorAlert(settingsAlert, io, 1000);
    const g1Before = raiseDirectorAlert(gameAlert("g1"), io, 1000);
    const g1After = raiseDirectorAlert(gameAlert("g1"), io, 3000);
    const after = raiseDirectorAlert(settingsAlert, io, 3000);
    const g2 = raiseDirectorAlert(gameAlert("g2"), io, 1500);

    // Director of g1 since 2000: nothing older than that.
    expect(recentAlertsFor([{ gameId: "g1", since: 2000 }], 4000)).toEqual([
      g1After,
      after,
    ]);
    // Also a director of g2 since 1000: its Settings window starts then.
    expect(
      recentAlertsFor(
        [
          { gameId: "g1", since: 2000 },
          { gameId: "g2", since: 1000 },
        ],
        4000,
      ),
    ).toEqual([before, g1After, after, g2]);
    expect(g1Before.at).toBe(before.at);
  });

  it("drops alerts older than 30 minutes", () => {
    const { io } = makeIo();
    raiseDirectorAlert(gameAlert("g1"), io, 0);
    const scope = [{ gameId: "g1", since: 0 }];
    expect(recentAlertsFor(scope, ALERT_REPLAY_MS - 1)).toHaveLength(1);
    expect(recentAlertsFor(scope, ALERT_REPLAY_MS)).toHaveLength(0);
  });

  it("starts empty before any alert has been raised", () => {
    delete (globalThis as Record<string, unknown>).__bridgeBoxDirectorAlerts;
    expect(recentAlertsFor([{ gameId: "g1", since: 0 }])).toEqual([]);
  });

  it("updates a kept alert in place and re-sends it", () => {
    const { io, emit } = makeIo();
    const a = raiseDirectorAlert(gameAlert("g1"), io, 0);
    const updated = updateDirectorAlert(
      a.id,
      (x) => ({ ...x, seatedAs: [] }),
      io,
      1000,
    );
    expect(updated).toMatchObject({
      id: a.id,
      at: new Date(1000).toISOString(),
    });
    expect(emit).toHaveBeenLastCalledWith("director:alert", updated);
    expect(recentAlertsFor([{ gameId: "g1", since: 0 }], 2000)).toEqual([
      updated,
    ]);
  });

  it("can't update an alert it no longer keeps", () => {
    expect(updateDirectorAlert("gone", (x) => x)).toBeNull();
  });
});
