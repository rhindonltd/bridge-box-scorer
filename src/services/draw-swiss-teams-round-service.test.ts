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

/**
 * A db stub whose two selects (history rows, then round-status rows) resolve to
 * `historyRows` and `statusRows` in call order. History rows carry ns/ew/round;
 * status rows carry `status`.
 */
function stubDb(
  historyRows: { roundNumber: number; ns: string; ew: string }[],
  statusRows: { status: string }[] = [],
) {
  let call = 0;
  const select = () => {
    const which = call++;
    const chain: any = {
      from: () => chain,
      where: () => Promise.resolve(which === 0 ? historyRows : statusRows),
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
    vi.mocked(getDb).mockResolvedValue(
      stubDb([{ roundNumber: 2, ns: "A1NS", ew: "A2EW" }]) as any,
    );
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
      stubDb(
        [{ roundNumber: 1, ns: "A1NS", ew: "A2EW" }],
        [{ status: "NOT_PLAYED" }],
      ) as any,
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
        [{ roundNumber: 1, ns: "A1NS", ew: "A2EW" }],
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
        [
          { roundNumber: 1, ns: "A1NS", ew: "A2EW" },
          { roundNumber: 1, ns: "A5NS", ew: "PHANTOM", status: "SIT_OUT" },
        ] as any,
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
        [
          { roundNumber: 1, ns: "A1NS", ew: "A2EW" },
          { roundNumber: 1, ns: "A2NS", ew: "A1EW" },
          { roundNumber: 1, ns: "A3NS", ew: "A4EW" },
          { roundNumber: 1, ns: "A4NS", ew: "A5EW" },
          { roundNumber: 1, ns: "A5NS", ew: "A3EW" },
        ] as any,
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
        [
          { roundNumber: 1, ns: "A1NS", ew: "A2EW" },
          { roundNumber: 1, ns: "A2NS", ew: "A1EW" },
          // SHORT triple {3,4,5}: A (3 v 4), B (4 v 5), C (5 v 3), both rooms.
          { roundNumber: 1, ns: "A3NS", ew: "A4EW" },
          { roundNumber: 1, ns: "A4NS", ew: "A3EW" },
          { roundNumber: 1, ns: "A4NS", ew: "A5EW" },
          { roundNumber: 1, ns: "A5NS", ew: "A4EW" },
          { roundNumber: 1, ns: "A5NS", ew: "A3EW" },
          { roundNumber: 1, ns: "A3NS", ew: "A5EW" },
        ] as any,
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
        [
          { roundNumber: 1, ns: "A1NS", ew: "A2EW" },
          { roundNumber: 1, ns: "A2NS", ew: "A1EW" },
          { roundNumber: 1, ns: "A3NS", ew: "A4EW" }, // A half-1
          { roundNumber: 1, ns: "A4NS", ew: "A5EW" }, // B half-1
          { roundNumber: 1, ns: "A5NS", ew: "A3EW" }, // C half-1
        ] as any,
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
});

describe("commitNextSwissTeamsRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Seed a drawable 4-team round-1-complete section. */
  function seedDrawable() {
    vi.mocked(getDb).mockResolvedValue(
      stubDb(
        [{ roundNumber: 1, ns: "A1NS", ew: "A2EW" }],
        [{ status: "CONFIRMED" }],
      ) as any,
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
      stubDb(
        [{ roundNumber: 1, ns: "A1NS", ew: "A2EW" }],
        [{ status: "NOT_PLAYED" }],
      ) as any,
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
      stubDb(
        [{ roundNumber: 1, ns: "A1NS", ew: "A2EW" }],
        [{ status: "CONFIRMED" }],
      ) as any,
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
});
