import { describe, it, expect } from "vitest";
import { teamMatchStructureFromRows } from "./team-match-test-structure";
import type { TeamMatchRow } from "./team-match";

function row(over: Partial<TeamMatchRow> & { matchRuling?: string | null }): TeamMatchRow {
  return {
    section: "A",
    roundNumber: 1,
    boardNumber: 1,
    ns: "A1NS",
    ew: "A2EW",
    confirmedResult: null,
    directorOverrideResult: null,
    status: "CONFIRMED",
    ...over,
  };
}

/** A two-room match: team 1 (table 1) v team 2 (table 2), one board. */
function twoRooms(
  homeOver: Partial<TeamMatchRow> = {},
  oppOver: Partial<TeamMatchRow> = {},
): TeamMatchRow[] {
  return [
    row({ ns: "A1NS", ew: "A2EW", ...homeOver }),
    row({ ns: "A2NS", ew: "A1EW", ...oppOver }),
  ];
}

describe("teamMatchStructureFromRows — ordinary matches", () => {
  it("emits one TEAMS match per mutual pairing with its board span", () => {
    const out = teamMatchStructureFromRows(twoRooms());
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: "TEAMS",
      home: "A1NS",
      opponent: "A2NS",
      vpPool: 20,
      boardStart: 1,
      boardEnd: 1,
      ruling: null,
    });
  });

  it("emits a BYE for a sit-out row", () => {
    const out = teamMatchStructureFromRows([
      row({ ns: "A3NS", ew: "PHANTOM", status: "SIT_OUT", boardNumber: 2 }),
      row({ ns: "A3NS", ew: "PHANTOM", status: "SIT_OUT", boardNumber: 1 }),
    ]);
    expect(out).toEqual([
      expect.objectContaining({
        kind: "BYE",
        home: "A3NS",
        opponent: null,
        boardStart: 1,
        boardEnd: 2,
      }),
    ]);
  });

  it("skips rows whose seats cannot be parsed", () => {
    const out = teamMatchStructureFromRows([
      row({ ns: "BAD", ew: "PHANTOM", status: "SIT_OUT" }),
      row({ ns: "A1NS", ew: "BAD" }),
      ...twoRooms({ boardNumber: 5 }, { boardNumber: 5 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("TEAMS");
  });

  it("ignores HALF_AVERAGE rows", () => {
    const out = teamMatchStructureFromRows([
      row({ ns: "A1NS", ew: "PHANTOM", status: "HALF_AVERAGE" }),
    ]);
    expect(out).toEqual([]);
  });
});

describe("teamMatchStructureFromRows — ordinary-match rulings", () => {
  it("uses a home-room ruling as-is, preferring it to the opponent room's", () => {
    const out = teamMatchStructureFromRows(
      twoRooms(
        { status: "VOID_MATCH", directorOverrideResult: "VOID:SHORT_OFFENDER_NS" as never },
        { status: "VOID_MATCH", directorOverrideResult: "VOID:SHORT_BOTH" as never },
      ),
    );
    expect(out[0].ruling).toBe("VOID:SHORT_OFFENDER_NS");
  });

  it.each([
    ["VOID:SHORT_OFFENDER_NS", "VOID:SHORT_OFFENDER_EW"],
    ["VOID:SHORT_OFFENDER_EW", "VOID:SHORT_OFFENDER_NS"],
    ["VOID:SHORT_BOTH", "VOID:SHORT_BOTH"],
  ])("inverts the opponent room's %s to home-relative", (token, expected) => {
    const out = teamMatchStructureFromRows(
      twoRooms({}, { status: "VOID_MATCH", directorOverrideResult: token as never }),
    );
    expect(out[0].ruling).toBe(expected);
  });

  it("inverts the side of an opponent-room mismatch ruling", () => {
    const out = teamMatchStructureFromRows(
      twoRooms({}, { status: "MISMATCH", matchRuling: "MM:NS:HIGHER:OWN" }),
    );
    expect(out[0].ruling).toBe("MM:EW:HIGHER:OWN");
    const flipped = teamMatchStructureFromRows(
      twoRooms({}, { status: "MISMATCH", matchRuling: "MM:EW:LOWER:NOT" }),
    );
    expect(flipped[0].ruling).toBe("MM:NS:LOWER:NOT");
  });

  it("lifts a home-room mismatch ruling untouched", () => {
    const out = teamMatchStructureFromRows(
      twoRooms({ status: "MISMATCH", matchRuling: "MM:NS:HIGHER:OWN" }),
    );
    expect(out[0].ruling).toBe("MM:NS:HIGHER:OWN");
  });

  it("ignores unparseable seats and non-ruling statuses when looking for a ruling", () => {
    const out = teamMatchStructureFromRows([
      row({ ns: "BAD", ew: "A2EW", status: "VOID_MATCH", directorOverrideResult: "VOID:SHORT_BOTH" as never }),
      row({ ns: "A1NS", ew: "A2EW", status: "MISMATCH", matchRuling: null }),
      row({ ns: "A1NS", ew: "A2EW", boardNumber: 2, status: "VOID_MATCH", directorOverrideResult: null }),
      row({ ns: "A2NS", ew: "A1EW" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].ruling).toBeNull();
  });
});

describe("teamMatchStructureFromRows — short triples", () => {
  // Table 1 hosts two comparisons (v 2 on board 1, v 3 on board 3); table 2 v 3
  // on board 2, mirrored in the other rooms.
  function tripleRows(extra: (r: TeamMatchRow[]) => void = () => {}): TeamMatchRow[] {
    const rows = [
      row({ boardNumber: 1, ns: "A1NS", ew: "A2EW" }),
      row({ boardNumber: 1, ns: "A2NS", ew: "A1EW" }),
      row({ boardNumber: 2, ns: "A2NS", ew: "A3EW" }),
      row({ boardNumber: 2, ns: "A3NS", ew: "A2EW" }),
      row({ boardNumber: 3, ns: "A3NS", ew: "A1EW" }),
      row({ boardNumber: 3, ns: "A1NS", ew: "A3EW" }),
    ];
    extra(rows);
    return rows;
  }

  it("emits three TRIPLE comparisons on the 10-VP pool, each with its own span", () => {
    const out = teamMatchStructureFromRows(tripleRows());
    expect(out).toHaveLength(3);
    expect(out.every((m) => m.kind === "TRIPLE" && m.vpPool === 10)).toBe(true);
    expect(out.map((m) => [m.home, m.opponent, m.boardStart])).toEqual([
      ["A1NS", "A2NS", 1],
      ["A1NS", "A3NS", 3],
      ["A2NS", "A3NS", 2],
    ]);
  });

  it("lifts a ruling from the lower room as-is and inverts the higher room's", () => {
    const out = teamMatchStructureFromRows(
      tripleRows((rows) => {
        // Comparison 1-2 (board 1): ruled in table 1's room (home).
        rows[0] = { ...rows[0], status: "VOID_MATCH", directorOverrideResult: "VOID:SHORT_BOTH" as never };
        // Comparison 2-3 (board 2): ruled in table 3's (the higher) room.
        rows[3] = { ...rows[3], status: "MISMATCH", matchRuling: "MM:NS:HIGHER:OWN" } as TeamMatchRow;
      }),
    );
    const byPair = new Map(out.map((m) => [`${m.home}-${m.opponent}`, m.ruling]));
    expect(byPair.get("A1NS-A2NS")).toBe("VOID:SHORT_BOTH");
    expect(byPair.get("A2NS-A3NS")).toBe("MM:EW:HIGHER:OWN");
    expect(byPair.get("A1NS-A3NS")).toBeNull();
  });

  it("skips unparseable rooms and other statuses when lifting a triple ruling", () => {
    const out = teamMatchStructureFromRows(
      tripleRows((rows) => {
        rows.push(row({ boardNumber: 1, ns: "BAD", ew: "A2EW", status: "MISMATCH", matchRuling: "MM:NS:LOWER:OWN" } as never));
        rows.push(row({ boardNumber: 1, ns: "A1NS", ew: "A2EW", status: "VOID_MATCH", directorOverrideResult: null }));
        rows.push(row({ boardNumber: 1, ns: "A1NS", ew: "A2EW", status: "MISMATCH", matchRuling: null } as never));
      }),
    );
    expect(out.find((m) => m.home === "A1NS" && m.opponent === "A2NS")!.ruling).toBeNull();
  });

  it("ignores a row from another section when lifting a triple ruling", () => {
    const rows = tripleRows((r) => {
      r.push(
        row({
          section: "B",
          boardNumber: 1,
          ns: "B1NS",
          ew: "B2EW",
          status: "MISMATCH",
          matchRuling: "MM:NS:LOWER:OWN",
        }),
      );
    });
    const out = teamMatchStructureFromRows(rows).filter((m) => m.section === "A");
    expect(out.every((m) => m.ruling === null)).toBe(true);
  });

  it("leaves a table that faces three opponents out of any triple", () => {
    const out = teamMatchStructureFromRows([
      row({ boardNumber: 1, ns: "A1NS", ew: "A2EW" }),
      row({ boardNumber: 2, ns: "A1NS", ew: "A3EW" }),
      row({ boardNumber: 3, ns: "A1NS", ew: "A4EW" }),
    ]);
    expect(out.every((m) => m.kind === "TEAMS")).toBe(true);
  });

  it("gives a zero span to a comparison between hosts that never meet", () => {
    // Only table 1 hosts: it faces 2 (board 1) and 3 (board 2), so the 2-3
    // comparison has no rows of its own.
    const out = teamMatchStructureFromRows([
      row({ boardNumber: 1, ns: "A1NS", ew: "A2EW" }),
      row({ boardNumber: 2, ns: "A1NS", ew: "A3EW" }),
    ]);
    const c23 = out.find((m) => m.home === "A2NS" && m.opponent === "A3NS");
    expect(c23).toMatchObject({ boardStart: 0, boardEnd: 0 });
  });

  it("ignores a table that faces two opponents without forming a trio", () => {
    // Table 1 faces 2 and 2... only distinct opponents count; here table 1
    // faces tables 2 and 3 but table 2/3 are not both present as hosts.
    const out = teamMatchStructureFromRows([
      row({ boardNumber: 1, ns: "A1NS", ew: "A2EW" }),
      row({ boardNumber: 2, ns: "A1NS", ew: "A2EW" }),
    ]);
    expect(out.every((m) => m.kind === "TEAMS")).toBe(true);
  });
});

describe("teamMatchStructureFromRows — non-triple cycles", () => {
  it("does not treat a 4-cycle of single opponents as a long triple", () => {
    const out = teamMatchStructureFromRows([
      row({ ns: "A1NS", ew: "A2EW" }),
      row({ ns: "A2NS", ew: "A3EW" }),
      row({ ns: "A3NS", ew: "A4EW" }),
      row({ ns: "A4NS", ew: "A1EW" }),
    ]);
    expect(out.every((m) => m.kind === "TEAMS")).toBe(true);
  });
});

describe("teamMatchStructureFromRows — long triples", () => {
  // Round 1: 1 plays 2, 2 plays 3, 3 plays 1 (a non-mutual 3-cycle); round 2
  // the same cycle on different boards. Together they are one LONG triple.
  function longRows(): TeamMatchRow[] {
    const rows: TeamMatchRow[] = [];
    for (const [round, board] of [[1, 1], [2, 2]] as const) {
      rows.push(row({ roundNumber: round, boardNumber: board, ns: "A1NS", ew: "A2EW" }));
      rows.push(row({ roundNumber: round, boardNumber: board, ns: "A2NS", ew: "A3EW" }));
      rows.push(row({ roundNumber: round, boardNumber: board, ns: "A3NS", ew: "A1EW" }));
    }
    return rows;
  }

  it("emits three TRIPLE comparisons on the 20-VP pool spanning both rounds", () => {
    const out = teamMatchStructureFromRows(longRows());
    expect(out).toHaveLength(3);
    expect(out.every((m) => m.kind === "TRIPLE" && m.vpPool === 20)).toBe(true);
    expect(out.every((m) => m.roundNumber === 1)).toBe(true);
    expect(out.every((m) => m.groupId!.endsWith("|long"))).toBe(true);
  });
});
