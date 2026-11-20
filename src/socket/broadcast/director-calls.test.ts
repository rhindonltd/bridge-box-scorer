import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/socket/websocket", () => ({ getIO: vi.fn(() => null) }));

import {
  ALERT_REPLAY_MS,
  clearDirectorAlerts,
  recentAlertsFor,
} from "./director-alerts";
import { answerCall, callDirector, clearDirectorCalls } from "./director-calls";

function makeIo() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { io: { to } as never, to, emit };
}

const details = {
  eventName: "Monday Pairs",
  table: { section: null, tableNumber: 3, roundNumber: 2, side: "NS" as const },
  players: "Mary Smith & John Jones",
};

describe("director calls", () => {
  beforeEach(() => {
    clearDirectorAlerts();
    clearDirectorCalls();
  });

  it("raises a call alert for the game's directors", () => {
    const { io, to, emit } = makeIo();
    const alert = callDirector("g1", "A3NS", details, io, 0);
    expect(alert).toMatchObject({
      kind: "callDirector",
      audience: { kind: "game", gameId: "g1", eventName: "Monday Pairs" },
      table: details.table,
      players: details.players,
      calls: 1,
    });
    expect(to).toHaveBeenCalledWith("directors:game:g1");
    expect(emit).toHaveBeenCalledWith("director:alert", alert);
  });

  it("bumps the open call, with a new time and table, instead of a second alert", () => {
    const { io, emit } = makeIo();
    const first = callDirector("g1", "A3NS", details, io, 0);
    const moved = { ...details.table, tableNumber: 4, roundNumber: 3 };
    const again = callDirector(
      "g1",
      "A3NS",
      { ...details, table: moved },
      io,
      5000,
    );
    expect(again.id).toBe(first.id);
    expect(again).toMatchObject({ calls: 2, table: moved });
    expect(again.at).toBe(new Date(5000).toISOString());
    expect(emit).toHaveBeenLastCalledWith("director:alert", again);
    expect(recentAlertsFor([{ gameId: "g1", since: 0 }], 6000)).toEqual([
      again,
    ]);
  });

  it("keeps calls from different seats and games apart", () => {
    const { io } = makeIo();
    const a = callDirector("g1", "A3NS", details, io, 0);
    const b = callDirector("g1", "A3EW", details, io, 0);
    const c = callDirector("g2", "A3NS", details, io, 0);
    expect(new Set([a.id, b.id, c.id]).size).toBe(3);
  });

  it("answering closes the call, so the next one is new", () => {
    const { io } = makeIo();
    const first = callDirector("g1", "A3NS", details, io, 0);
    expect(answerCall("g1", first.id)).toBe("A3NS");
    // A second director answering the same call: already closed.
    expect(answerCall("g1", first.id)).toBeNull();
    const next = callDirector("g1", "A3NS", details, io, 1000);
    expect(next.id).not.toBe(first.id);
    expect(next.calls).toBe(1);
  });

  it("won't answer a call for another game", () => {
    const { io } = makeIo();
    const call = callDirector("g1", "A3NS", details, io, 0);
    expect(answerCall("g2", call.id)).toBeNull();
    expect(answerCall("g1", call.id)).toBe("A3NS");
  });

  it("starts a new call once the old one has expired", () => {
    const { io } = makeIo();
    const old = callDirector("g1", "A3NS", details, io, 0);
    const fresh = callDirector("g1", "A3NS", details, io, ALERT_REPLAY_MS + 1);
    expect(fresh.id).not.toBe(old.id);
    expect(fresh.calls).toBe(1);
  });

  it("uses the shared server by default", () => {
    expect(callDirector("g1", "A3NS", details).calls).toBe(1);
    expect(callDirector("g1", "A3NS", details).calls).toBe(2);
  });

  it("keeps its open calls on globalThis", async () => {
    const { io } = makeIo();
    callDirector("g1", "A3NS", details, io, 0);
    delete (globalThis as Record<string, unknown>).__bridgeBoxDirectorCalls;
    // With the store gone, the next call is a fresh one.
    expect(callDirector("g1", "A3NS", details, io, 1).calls).toBe(1);
  });
});
