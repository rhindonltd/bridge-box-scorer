import { describe, it, expect } from "vitest";
import {
  alertTime,
  describeAlert,
  describeDevice,
  describeTable,
  type DirectorAlert,
} from "./director-alert";

const seat = {
  eventName: "Monday Pairs",
  seatLabel: "Table 3 NS",
  players: "Mary Smith & John Jones",
};
const game = { kind: "game", gameId: "g1", eventName: "Monday Pairs" } as const;
const settings = { kind: "settings" } as const;
const base = { id: "a1", at: "2026-11-20T19:42:00.000Z" };

describe("director alerts", () => {
  it("describes the device by its seats, or as not seated", () => {
    expect(describeDevice([seat])).toBe(
      "Mary Smith & John Jones (Table 3 NS, Monday Pairs)",
    );
    expect(describeDevice([seat, { ...seat, eventName: "Teams" }])).toBe(
      "Mary Smith & John Jones (Table 3 NS, Monday Pairs) / Mary Smith & John Jones (Table 3 NS, Teams)",
    );
    expect(describeDevice([])).toBe("A device that isn't seated at a game");
  });

  it("formats the time as hours and minutes", () => {
    expect(alertTime(base.at)).toMatch(/^\d{2}:\d{2}/);
  });

  it("describes a director sign-in by share code or admin key", () => {
    const a: DirectorAlert = {
      ...base,
      kind: "signedIn",
      audience: game,
      method: "adminKey",
      seatedAs: [seat],
    };
    expect(describeAlert(a)).toBe(
      "Mary Smith & John Jones (Table 3 NS, Monday Pairs) became a director of Monday Pairs using the admin key.",
    );
    expect(describeAlert({ ...a, method: "shareCode", seatedAs: [] })).toBe(
      "A device that isn't seated at a game became a director of Monday Pairs using a director share code.",
    );
  });

  it("describes a Settings unlock", () => {
    expect(
      describeAlert({
        ...base,
        kind: "signedIn",
        audience: settings,
        method: "adminKey",
        seatedAs: [],
      }),
    ).toBe(
      "A device that isn't seated at a game unlocked this Bridge Box's Settings using the admin key.",
    );
  });

  it("describes repeated failures for a game and for Settings", () => {
    const a: DirectorAlert = {
      ...base,
      kind: "repeatedFailures",
      audience: game,
      failures: 3,
      blockedMinutes: 5,
      seatedAs: [seat],
    };
    expect(describeAlert(a)).toBe(
      "Mary Smith & John Jones (Table 3 NS, Monday Pairs) made 3 failed attempts to become a director of Monday Pairs in the last 2 minutes. Further attempts from that device are blocked for 5 minutes.",
    );
    expect(describeAlert({ ...a, audience: settings, seatedAs: [] })).toBe(
      "A device that isn't seated at a game made 3 failed attempts to unlock this Bridge Box's Settings in the last 2 minutes. Further attempts from that device are blocked for 5 minutes.",
    );
  });

  it("describes where a calling table is", () => {
    const t = { section: null, tableNumber: 3, roundNumber: 2, side: null };
    expect(describeTable(t)).toBe("Table 3, Round 2");
    expect(describeTable({ ...t, section: "Blue" })).toBe(
      "Table 3, Round 2 (Section Blue)",
    );
    expect(describeTable({ ...t, tableNumber: null, roundNumber: null })).toBe(
      "No table",
    );
    expect(describeTable({ ...t, roundNumber: null })).toBe("Table 3");
  });

  it("describes a call for the director, and repeated calls", () => {
    const a: DirectorAlert = {
      ...base,
      kind: "callDirector",
      audience: game,
      table: { section: null, tableNumber: 3, roundNumber: 2, side: "NS" },
      players: "Mary Smith & John Jones",
      calls: 1,
    };
    expect(describeAlert(a)).toBe(
      "Table 3, Round 2: Mary Smith & John Jones (NS) are calling the director at Monday Pairs.",
    );
    expect(
      describeAlert({
        ...a,
        calls: 3,
        players: "Mary Smith",
        table: { ...a.table, side: null },
      }),
    ).toBe(
      "Table 3, Round 2: Mary Smith is calling the director at Monday Pairs. They have called 3 times.",
    );
  });
});
