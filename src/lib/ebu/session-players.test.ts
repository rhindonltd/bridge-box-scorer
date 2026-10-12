import { describe, it, expect } from "vitest";
import {
  collectSessionPlayers,
  toPlayerChecks,
  applyCheckKeys,
} from "@/lib/ebu/session-players";

describe("collectSessionPlayers", () => {
  it("finds player-like objects (ebu + surname) at any depth", () => {
    const session = {
      event: {
        sections: [
          {
            pairs: [
              {
                players: [
                  { ebu: "1", surname: "Shears", forename: "Bob" },
                  { ebu: "2", surname: "Cook" },
                ],
              },
            ],
          },
        ],
      },
    };
    const found = collectSessionPlayers(session);
    expect(found.map((p) => p.ebu)).toEqual(["1", "2"]);
    expect(found.map((p) => p.surname)).toEqual(["Shears", "Cook"]);
  });

  it("ignores objects missing ebu or surname, and non-string values", () => {
    const session = {
      a: { ebu: "1" },
      b: { surname: "Nope" },
      c: { ebu: 5, surname: "NumberEbu" },
      d: { ebu: "9", surname: "Yes" },
    };
    const found = collectSessionPlayers(session);
    expect(found).toHaveLength(1);
    expect(found[0].ebu).toBe("9");
  });

  it("returns live references that mutate the original object", () => {
    const player: Record<string, unknown> = { ebu: "1", surname: "X" };
    const session = { player };
    const [ref] = collectSessionPlayers(session);
    ref.ref.check = "KEY";
    expect(player.check).toBe("KEY");
  });
});

describe("toPlayerChecks", () => {
  it("de-duplicates by ebu+surname", () => {
    const players = collectSessionPlayers({
      a: { ebu: "1", surname: "X" },
      b: { ebu: "1", surname: "X" },
      c: { ebu: "1", surname: "Y" },
    });
    expect(toPlayerChecks(players)).toEqual([
      { ebu: "1", surname: "X" },
      { ebu: "1", surname: "Y" },
    ]);
  });
});

describe("applyCheckKeys", () => {
  it("writes check keys onto matching players and leaves others alone", () => {
    const p1: Record<string, unknown> = { ebu: "1", surname: "X" };
    const p2: Record<string, unknown> = { ebu: "2", surname: "Y" };
    const players = collectSessionPlayers({ p1, p2 });

    applyCheckKeys(players, [
      { ebu: "1", surname: "X", check: "KEY1" },
      { ebu: "2", surname: "Y", bad_ebu: 1 }, // no check -> untouched
    ]);

    expect(p1.check).toBe("KEY1");
    expect(p2.check).toBeUndefined();
  });
});
