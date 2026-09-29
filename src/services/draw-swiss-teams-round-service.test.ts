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
    .mockResolvedValue({ matches: [], bye: null, triangle: null }),
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

  it("rejects a triangle field too small to form a three-way (< 3 teams)", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as any);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: {
        teams: 1,
        rounds: 4,
        boardsPerRound: 3,
        oddHandling: "TRIANGLE",
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
    expect(result.triangle).toBeNull();
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
    expect(result.triangle).toBeNull();
  });

  it("previews an odd (TRIANGLE) round, reporting the triangle", async () => {
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
        oddHandling: "TRIANGLE",
      },
    } as any);
    rankTeams(5);

    const result = await previewNextSwissTeamsRound("g1", "A");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.byeTeamId).toBeNull();
    expect(result.triangle).toEqual({ a: 1, b: 2, c: 5 });
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
      matches,
      5,
      null,
    );
  });
});
