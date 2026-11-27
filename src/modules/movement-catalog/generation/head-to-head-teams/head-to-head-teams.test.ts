import { describe, it, expect } from "vitest";
import {
  HEAD_TO_HEAD_ROUNDS,
  HEAD_TO_HEAD_TEAMS,
  generateHeadToHeadTeams,
} from "./head-to-head-teams";

describe("generateHeadToHeadTeams", () => {
  const { tables } = generateHeadToHeadTeams({ boardsPerRound: 12 });
  const seating = tables.map((t) =>
    t.rounds.map((r) => [r.participants.nsId, r.participants.ewId]),
  );

  it("is two teams playing two stanzas", () => {
    expect(HEAD_TO_HEAD_TEAMS).toBe(2);
    expect(HEAD_TO_HEAD_ROUNDS).toBe(2);
    expect(tables.map((t) => t.rounds.map((r) => r.round))).toEqual([
      [1, 2],
      [1, 2],
    ]);
  });

  it("plays 1NS v 2EW and 2NS v 1EW, then 1NS v 2NS and 2EW v 1EW", () => {
    expect(seating).toEqual([
      [
        ["1NS", "2EW"],
        ["1NS", "2NS"],
      ],
      [
        ["2NS", "1EW"],
        ["2EW", "1EW"],
      ],
    ]);
  });

  it("keeps team 1 North/South at table 1 and East/West at table 2", () => {
    for (const stanza of [0, 1]) {
      expect(seating[0][stanza][0]).toMatch(/^1/);
      expect(seating[1][stanza][1]).toMatch(/^1/);
    }
  });

  it("starts table 2 on the second half of each stanza's boards", () => {
    expect(tables[0].rounds[0].boards).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(tables[1].rounds[0].boards).toEqual([
      7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6,
    ]);
    expect(tables[1].rounds[1].boards).toEqual([
      19, 20, 21, 22, 23, 24, 13, 14, 15, 16, 17, 18,
    ]);
  });

  it.each([0, 7, 2.5])("rejects %s boards per stanza", (boardsPerRound) => {
    expect(() => generateHeadToHeadTeams({ boardsPerRound })).toThrow(
      /even number of boards/,
    );
  });
});
