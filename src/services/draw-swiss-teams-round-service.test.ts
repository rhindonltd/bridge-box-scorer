import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/db/games/queries/get-section-movement", () => ({
  getSectionMovement: vi.fn(),
}));
vi.mock("@/services/leaderboard-service", () => ({
  computeSectionLeaderboards: vi.fn(),
}));
vi.mock("@/services/materialize-swiss-teams-round", () => ({
  materializeSwissTeamsRound: vi.fn(),
}));
// Preview resolves team names; stub it so the service test stays DB-free.
vi.mock("@/services/swiss-teams-seating-names", () => ({
  resolveSwissTeamsMatchNames: vi
    .fn()
    .mockResolvedValue({ matches: [], bye: null, triple: null }),
}));
// buildTeamStandings resolves team names via findTeams; stub it empty so the
// standings fall back to "Team {id}" labels (names aren't under test here).
vi.mock("@/db/games/queries/find-teams", () => ({
  findTeams: vi.fn().mockResolvedValue([]),
}));

import {
  previewNextSwissTeamsRound,
  commitNextSwissTeamsRound,
} from "./draw-swiss-teams-round-service";
import { getDb } from "@/db/games";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { computeSectionLeaderboards } from "@/services/leaderboard-service";
import { materializeSwissTeamsRound } from "@/services/materialize-swiss-teams-round";
import { findTeams } from "@/db/games/queries/find-teams";

/** A `matches`-row shape for the history read, with sensible teams defaults. */
interface StubMatch {
  roundNumber: number;
  kind: "TEAMS" | "TRIPLE" | "BYE";
  home: string;
  opponent: string | null;
  groupId?: string | null;
  vpPool?: number | null;
}

/** Build a full match row from the stub shorthand. */
function matchRow(m: StubMatch) {
  return {
    id: 0,
    section: "A",
    roundNumber: m.roundNumber,
    kind: m.kind,
    scoredAsUnit: true,
    home: m.home,
    opponent: m.opponent,
    groupId: m.groupId ?? null,
    slot: null,
    vpPool: m.vpPool ?? (m.kind === "BYE" ? null : 20),
    boardStart: 1,
    boardEnd: 1,
    ruling: null,
  };
}

/** An ordinary TEAMS head-to-head match row for round `r`, teams `a` v `b`. */
function teamsMatch(r: number, a: number, b: number): StubMatch {
  return { roundNumber: r, kind: "TEAMS", home: `A${a}NS`, opponent: `A${b}NS` };
}

/** A BYE match row for round `r`, team `t`. */
function byeMatch(r: number, t: number): StubMatch {
  return { roundNumber: r, kind: "BYE", home: `A${t}NS`, opponent: null };
}

/** The three TRIPLE comparison rows of a triple {a,b,c} in round `r`. */
function tripleMatches(
  r: number,
  a: number,
  b: number,
  c: number,
  kind: "SHORT" | "LONG" = "SHORT",
): StubMatch[] {
  const groupId = `triple|A|${[a, b, c].sort((x, y) => x - y).join("-")}`;
  const vpPool = kind === "LONG" ? 20 : 10;
  return [
    { roundNumber: r, kind: "TRIPLE", home: `A${a}NS`, opponent: `A${b}NS`, groupId, vpPool },
    { roundNumber: r, kind: "TRIPLE", home: `A${b}NS`, opponent: `A${c}NS`, groupId, vpPool },
    { roundNumber: r, kind: "TRIPLE", home: `A${a}NS`, opponent: `A${c}NS`, groupId, vpPool },
  ];
}

/**
 * A db stub whose two selects resolve in call order: first the section's
 * `matches` rows (the history read, now the authoritative structure), then the
 * round-status `boards` rows. `matchRows` are the stub shorthand expanded via
 * {@link matchRow}; status rows carry `status`.
 */
function stubDb(matchRows: StubMatch[], statusRows: { status: string }[] = []) {
  const matches = matchRows.map(matchRow);
  let call = 0;
  const select = () => {
    const which = call++;
    const chain: any = {
      from: () => chain,
      // isRoundComplete now joins boards→matches (select().from().innerJoin().where()).
      innerJoin: () => chain,
      where: () => Promise.resolve(which === 0 ? matches : statusRows),
    };
    return chain;
  };
  return { select };
}

/** A leaderboard mock ranking teams 1..n best-first for section A. */
function rankTeams(n: number) {
  vi.mocked(computeSectionLeaderboards).mockResolvedValue([
    {
      section: "A",
      overallScore: {
        lines: Array.from({ length: n }, (_, i) => ({
          teamId: `A${i + 1}NS`,
          totalVP: (n - i) * 10,
          rank: i + 1,
          tied: false,
        })),
      },
    },
  ] as any);
}

describe("previewNextSwissTeamsRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(undefined as any);

    await expect(previewNextSwissTeamsRound("g1", "A")).rejects.toThrow(
      "Game db does not exist",
    );
  });

  it("rejects a non-Swiss-Teams section (no movement)", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as any);
    vi.mocked(getSectionMovement).mockResolvedValue(null as any);

    await expect(previewNextSwissTeamsRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "NOT_SWISS_TEAMS",
    });
  });

  it("rejects a section whose movement is not SWISS_TEAMS", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as any);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "MITCHELL",
    } as any);

    await expect(previewNextSwissTeamsRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "NOT_SWISS_TEAMS",
    });
  });

  it("rejects a triple field too small to form a three-way (< 3 teams)", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as any);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: {
        teams: 1,
        rounds: 4,
        boardsPerRound: 3,
        oddHandling: "TRIPLE",
      },
    } as any);

    await expect(previewNextSwissTeamsRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "ODD_TEAM_COUNT",
    });
  });

  it("rejects once every round has been drawn (event complete)", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([teamsMatch(2, 1, 2)]) as any);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 4, rounds: 2, boardsPerRound: 3 },
    } as any);

    await expect(previewNextSwissTeamsRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "EVENT_COMPLETE",
    });
  });

  it("rejects while the current round is not fully scored", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb([teamsMatch(1, 1, 2)], [{ status: "NOT_PLAYED" }]) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 4, rounds: 4, boardsPerRound: 3 },
    } as any);

    await expect(previewNextSwissTeamsRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "ROUND_INCOMPLETE",
    });
  });

  it("computes the next round's matches WITHOUT writing anything", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb(
        [teamsMatch(1, 1, 2)],
        [{ status: "CONFIRMED" }, { status: "OVERRIDDEN" }],
      ) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 4, rounds: 4, boardsPerRound: 3 },
    } as any);
    rankTeams(4);

    const result = await previewNextSwissTeamsRound("g1", "A");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.roundNumber).toBe(2);
    expect(result.teams).toBe(4);
    expect(result.matches.length).toBe(2); // 4 teams -> 2 matches
    expect(result.byeTeamId).toBeNull();
    expect(result.triple).toBeNull();
    // Standings are returned in draw order (best first) with running VP totals,
    // from the same leaderboard lines the draw ranked on (team i -> (n-i)*10).
    expect(result.standings.map((s) => ({ id: s.id, total: s.total }))).toEqual([
      { id: 1, total: 40 },
      { id: 2, total: 30 },
      { id: 3, total: 20 },
      { id: 4, total: 10 },
    ]);
    // Advisory inputs carry the team count + played opponents so the client
    // can re-check repeats after an edit (round 1 played 1v2, recovered here).
    expect(result.advisoryInputs.teams).toBe(4);
    expect(result.advisoryInputs.playedOpponents).toContain("1-2");
    // A preview must never materialize.
    expect(materializeSwissTeamsRound).not.toHaveBeenCalled();
  });

  it("previews an odd (BYE) round, reporting the bye team", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb(
        [teamsMatch(1, 1, 2), byeMatch(1, 5)],
        [{ status: "CONFIRMED" }, { status: "SIT_OUT" }],
      ) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 5, rounds: 4, boardsPerRound: 3, oddHandling: "BYE" },
    } as any);
    rankTeams(5);

    const result = await previewNextSwissTeamsRound("g1", "A");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Team 5 already byed in round 1, so round 2 byes the next lowest (4).
    expect(result.byeTeamId).toBe(4);
    expect(result.triple).toBeNull();
  });

  it("previews an odd (TRIPLE) round, reporting the triple", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb(
        [teamsMatch(1, 1, 2), ...tripleMatches(1, 3, 4, 5)],
        [{ status: "CONFIRMED" }],
      ) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: {
        teams: 5,
        rounds: 4,
        boardsPerRound: 3,
        oddHandling: "TRIPLE",
        oddRoundPlan: ["SHORT", "SHORT", "SHORT", "SHORT"],
      },
    } as any);
    rankTeams(5);

    const result = await previewNextSwissTeamsRound("g1", "A");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.byeTeamId).toBeNull();
    // The round-1 fixture is a 3-cycle among 3,4,5 (detected as a triple), so
    // they count as having had a triple; the round-2 triple avoids re-tripling
    // all three and tops up with a fresh team (-> {1,2,5}).
    expect(result.triple).toMatchObject({ a: 1, b: 2, c: 5, kind: "SHORT" });
  });

  it("ranks purely from the append loop when the leaderboard has no line for this section", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as any);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 4, rounds: 4, boardsPerRound: 3 },
    } as any);
    vi.mocked(computeSectionLeaderboards).mockResolvedValue([
      { section: "B", overallScore: { lines: [{ teamId: "A1NS" }] } },
    ] as any);

    const result = await previewNextSwissTeamsRound("g1", "A");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.roundNumber).toBe(1);
  });

  it("marks a prior SHORT triple's teams as having had a triple", async () => {
    // Round 1 was a SHORT triple {3,4,5} (six head-to-head rows across sets
    // A/B/C) plus a normal 1 v 2. Drawing round 2 (another SHORT) must pick a
    // triple that AVOIDS repeating all three of 3,4,5 — so it includes team 1
    // or 2 rather than re-tripling {3,4,5}.
    vi.mocked(getDb).mockResolvedValue(
      stubDb(
        [teamsMatch(1, 1, 2), ...tripleMatches(1, 3, 4, 5)],
        [{ status: "CONFIRMED" }],
      ) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: {
        teams: 5,
        rounds: 4,
        boardsPerRound: 6,
        oddHandling: "TRIPLE",
        oddRoundPlan: ["SHORT", "SHORT", "SHORT", "SHORT"],
      },
    } as any);
    rankTeams(5);

    const result = await previewNextSwissTeamsRound("g1", "A");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.triple).not.toBeNull();
    // 3,4,5 already tripled, so the new triple can't be exactly {3,4,5}.
    const members = [result.triple!.a, result.triple!.b, result.triple!.c];
    expect(members).not.toEqual([3, 4, 5]);
    // It must include at least one of the fresh teams (1 or 2).
    expect(members.some((m) => m === 1 || m === 2)).toBe(true);
  });

  it("reuses the first slot's teams for a LONG triple's second slot (no fresh draw)", async () => {
    // Round 1 was a LONG triple slot 1 {3,4,5} (half-1 rooms: 3·NS v 4 on A,
    // 4·NS v 5 on B, 5·NS v 3 on C) + a normal 1 v 2. The plan makes rounds 1
    // and 2 a single long triple (group 1), so drawing round 2 must reuse
    // {3,4,5} as slot 2 rather than choosing a new three-way.
    vi.mocked(getDb).mockResolvedValue(
      stubDb(
        [teamsMatch(1, 1, 2), ...tripleMatches(1, 3, 4, 5, "LONG")],
        [{ status: "CONFIRMED" }],
      ) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: {
        teams: 5,
        rounds: 4,
        boardsPerRound: 6,
        oddHandling: "TRIPLE",
        oddRoundPlan: [
          { kind: "LONG", group: 1 },
          { kind: "LONG", group: 1 },
          "SHORT",
          "SHORT",
        ],
      },
    } as any);
    rankTeams(5);

    const result = await previewNextSwissTeamsRound("g1", "A");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.roundNumber).toBe(2);
    // The second slot reuses the first slot's three teams, advanced to slot 2.
    expect(result.triple).toMatchObject({
      a: 3,
      b: 4,
      c: 5,
      kind: "LONG",
      group: 1,
      slot: 2,
    });
  });
  it("ignores history rows whose seats cannot be parsed", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb(
        [
          teamsMatch(1, 1, 2),
          { roundNumber: 1, kind: "TEAMS", home: "garbage", opponent: "A3NS" },
          { roundNumber: 1, kind: "BYE", home: "garbage", opponent: null },
        ],
        [{ status: "CONFIRMED" }],
      ) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 4, rounds: 4, boardsPerRound: 3 },
    } as any);
    rankTeams(4);
    const result = await previewNextSwissTeamsRound("g1", "A");
    expect(result.ok).toBe(true);
  });
  it("defaults the total VP when a leaderboard line omits it", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb([teamsMatch(1, 1, 2)], [{ status: "CONFIRMED" }]) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 4, rounds: 4, boardsPerRound: 3 },
    } as any);
    vi.mocked(computeSectionLeaderboards).mockResolvedValue([
      {
        section: "A",
        overallScore: {
          lines: [{ teamId: "A1NS", rank: 1, tied: false }],
        },
      },
    ] as any);
    const result = await previewNextSwissTeamsRound("g1", "A");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.standings[0]).toMatchObject({ id: 1, total: 0, rank: 1 });
  });
  it("labels standings with the derived team names", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb([teamsMatch(1, 1, 2)], [{ status: "CONFIRMED" }]) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 4, rounds: 4, boardsPerRound: 3 },
    } as any);
    rankTeams(4);
    vi.mocked(findTeams).mockResolvedValueOnce([
      { id: "A1NS", name: "Alpha" },
    ] as any);
    const result = await previewNextSwissTeamsRound("g1", "A");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.standings.find((e) => e.id === 1)!.name).toBe("Alpha");
    expect(result.standings.find((e) => e.id === 2)!.name).toBe("Team 2");
  });
  it("skips duplicate leaderboard lines and unparseable triple seats", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb(
        [
          teamsMatch(1, 1, 2),
          ...tripleMatches(1, 3, 4, 5),
          {
            roundNumber: 1,
            kind: "TRIPLE",
            home: "garbage",
            opponent: "garbage",
            groupId: "triple|A|3-4-5",
            vpPool: 10,
          },
        ],
        [{ status: "CONFIRMED" }],
      ) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 5, rounds: 4, boardsPerRound: 6 },
    } as any);
    vi.mocked(computeSectionLeaderboards).mockResolvedValue([
      {
        section: "A",
        overallScore: {
          lines: [
            { teamId: "A1NS", totalVP: 10, rank: 1, tied: false },
            { teamId: "A1NS", totalVP: 10, rank: 1, tied: false },
          ],
        },
      },
    ] as any);
    const result = await previewNextSwissTeamsRound("g1", "A");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.standings.filter((e) => e.id === 1)).toHaveLength(1);
  });
  it("sorts the rounds of a LONG triple spanning two rounds", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb(
        [
          teamsMatch(1, 1, 2),
          // Out of order: round 2's rooms listed before round 1's.
          ...tripleMatches(2, 3, 4, 5, "LONG"),
          ...tripleMatches(1, 3, 4, 5, "LONG"),
        ],
        [{ status: "CONFIRMED" }],
      ) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: {
        teams: 5,
        rounds: 4,
        boardsPerRound: 6,
        oddHandling: "TRIPLE",
        oddRoundPlan: [
          { kind: "LONG", group: 1 },
          { kind: "LONG", group: 1 },
          "SHORT",
          "SHORT",
        ],
      },
    } as any);
    rankTeams(5);
    const result = await previewNextSwissTeamsRound("g1", "A");
    expect(result.ok).toBe(true);
  });
  describe("a LONG triple's first slot", () => {
    const longPlan = {
      source: "SWISS_TEAMS",
      swissTeams: {
        teams: 5,
        rounds: 4,
        boardsPerRound: 6,
        oddHandling: "TRIPLE",
        oddRoundPlan: [
          { kind: "LONG", group: 1 },
          { kind: "LONG", group: 1 },
          "SHORT",
          "SHORT",
        ],
      },
    };
    it("draws a fresh triple when there is no previous round", async () => {
      vi.mocked(getDb).mockResolvedValue(stubDb([]) as any);
      vi.mocked(getSectionMovement).mockResolvedValue(longPlan as any);
      rankTeams(5);
      const result = await previewNextSwissTeamsRound("g1", "A");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.triple).toMatchObject({ kind: "LONG", slot: 1 });
    });
    it("draws a fresh triple when the first slot cannot be recovered", async () => {
      vi.mocked(getDb).mockResolvedValue(
        stubDb(
          [teamsMatch(1, 1, 2), teamsMatch(1, 3, 4)],
          [{ status: "CONFIRMED" }],
        ) as any,
      );
      vi.mocked(getSectionMovement).mockResolvedValue(longPlan as any);
      rankTeams(5);
      const result = await previewNextSwissTeamsRound("g1", "A");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.triple).toMatchObject({ kind: "LONG", slot: 1 });
    });
  });
});

describe("commitNextSwissTeamsRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Seed a drawable 4-team round-1-complete section. */
  function seedDrawable() {
    vi.mocked(getDb).mockResolvedValue(
      stubDb([teamsMatch(1, 1, 2)], [{ status: "CONFIRMED" }]) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 4, rounds: 4, boardsPerRound: 3 },
    } as any);
    rankTeams(4);
  }

  it("materializes the exact matches it is given", async () => {
    seedDrawable();
    vi.mocked(materializeSwissTeamsRound).mockResolvedValue({ written: true });

    const matches = [
      { a: 1, b: 3 },
      { a: 2, b: 4 },
    ];

    const result = await commitNextSwissTeamsRound("g1", "A", matches, null, null);

    expect(result).toEqual({ ok: true, roundNumber: 2 });
    expect(materializeSwissTeamsRound).toHaveBeenCalledWith(
      "g1",
      "A",
      2,
      3,
      4,
      matches,
      null,
      null,
    );
  });

  it("rejects structurally-invalid matches (a team placed twice) without writing", async () => {
    seedDrawable();

    // Team 1 in two matches, team 4 missing.
    const invalid = [
      { a: 1, b: 3 },
      { a: 1, b: 2 },
    ];

    const result = await commitNextSwissTeamsRound("g1", "A", invalid, null, null);

    expect(result).toEqual({ ok: false, reason: "INVALID_MATCHES" });
    expect(materializeSwissTeamsRound).not.toHaveBeenCalled();
  });

  it("propagates a precondition rejection (e.g. round incomplete)", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb([teamsMatch(1, 1, 2)], [{ status: "NOT_PLAYED" }]) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 4, rounds: 4, boardsPerRound: 3 },
    } as any);

    const result = await commitNextSwissTeamsRound(
      "g1",
      "A",
      [{ a: 1, b: 2 }],
      null,
      null,
    );

    expect(result).toEqual({ ok: false, reason: "ROUND_INCOMPLETE" });
    expect(materializeSwissTeamsRound).not.toHaveBeenCalled();
  });

  it("accepts a valid bye round (odd field)", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb([teamsMatch(1, 1, 2)], [{ status: "CONFIRMED" }]) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 5, rounds: 4, boardsPerRound: 3, oddHandling: "BYE" },
    } as any);
    rankTeams(5);
    vi.mocked(materializeSwissTeamsRound).mockResolvedValue({ written: true });

    const matches = [
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ];
    const result = await commitNextSwissTeamsRound("g1", "A", matches, 5, null);

    expect(result).toEqual({ ok: true, roundNumber: 2 });
    expect(materializeSwissTeamsRound).toHaveBeenCalledWith(
      "g1",
      "A",
      2,
      3,
      4,
      matches,
      5,
      null,
    );
  });
  it("accepts a valid triple round (odd field)", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb([teamsMatch(1, 1, 2)], [{ status: "CONFIRMED" }]) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: {
        teams: 5,
        rounds: 4,
        boardsPerRound: 6,
        oddHandling: "TRIPLE",
        oddRoundPlan: ["SHORT", "SHORT", "SHORT", "SHORT"],
      },
    } as any);
    rankTeams(5);
    vi.mocked(materializeSwissTeamsRound).mockResolvedValue({ written: true });
    const triple = { a: 3, b: 4, c: 5, kind: "SHORT" as const };
    const result = await commitNextSwissTeamsRound(
      "g1",
      "A",
      [{ a: 1, b: 2 }],
      null,
      triple,
    );
    expect(result).toEqual({ ok: true, roundNumber: 2 });
  });
  it("rejects a round that leaves a team out", async () => {
    seedDrawable();
    const result = await commitNextSwissTeamsRound(
      "g1",
      "A",
      [{ a: 1, b: 3 }],
      null,
      null,
    );
    expect(result).toEqual({ ok: false, reason: "INVALID_MATCHES" });
    expect(materializeSwissTeamsRound).not.toHaveBeenCalled();
  });
});
