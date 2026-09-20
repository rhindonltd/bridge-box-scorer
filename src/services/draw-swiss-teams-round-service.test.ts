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

import { drawNextSwissTeamsRound } from "./draw-swiss-teams-round-service";
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

describe("drawNextSwissTeamsRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(undefined as any);

    await expect(drawNextSwissTeamsRound("g1", "A")).rejects.toThrow(
      "Game db does not exist",
    );
  });

  it("rejects a non-Swiss-Teams section (no movement)", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as any);
    vi.mocked(getSectionMovement).mockResolvedValue(null as any);

    await expect(drawNextSwissTeamsRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "NOT_SWISS_TEAMS",
    });
  });

  it("rejects a section whose movement is not SWISS_TEAMS", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as any);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "MITCHELL",
    } as any);

    await expect(drawNextSwissTeamsRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "NOT_SWISS_TEAMS",
    });
  });

  it("rejects an odd team count that uses (unsupported) triangle handling", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as any);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: {
        teams: 5,
        rounds: 4,
        boardsPerRound: 3,
        oddHandling: "TRIANGLE",
      },
    } as any);

    await expect(drawNextSwissTeamsRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "ODD_TEAM_COUNT",
    });
  });

  it("rejects once every round has been drawn (event complete)", async () => {
    // History has a round-2 row so highestRound is 2 == totalRounds.
    vi.mocked(getDb).mockResolvedValue(
      stubDb([{ roundNumber: 2, ns: "A1NS", ew: "A2EW" }]) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 4, rounds: 2, boardsPerRound: 3 },
    } as any);

    await expect(drawNextSwissTeamsRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "EVENT_COMPLETE",
    });
  });

  it("skips a non-seat id in the history without throwing", async () => {
    // "junk" is not a seat so parseSeat throws and the row is skipped.
    vi.mocked(getDb).mockResolvedValue(
      stubDb(
        [{ roundNumber: 1, ns: "junk", ew: "also-junk" }],
        [{ status: "NOT_PLAYED" }],
      ) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 4, rounds: 4, boardsPerRound: 3 },
    } as any);

    // highestRound = 1, current round incomplete -> ROUND_INCOMPLETE.
    await expect(drawNextSwissTeamsRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "ROUND_INCOMPLETE",
    });
  });

  it("treats an empty round as incomplete", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb([{ roundNumber: 1, ns: "A1NS", ew: "A2EW" }], []) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 4, rounds: 4, boardsPerRound: 3 },
    } as any);

    await expect(drawNextSwissTeamsRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "ROUND_INCOMPLETE",
    });
  });

  it("draws the next round when the current round is complete, ranking from the leaderboard", async () => {
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
    // Leaderboard ranks teams 2 and 1 first; a junk teamId is skipped; teams 3
    // and 4 are appended by the unseen loop. Also repeats team "A2NS" (id 2) to
    // exercise the de-dup guard.
    vi.mocked(computeSectionLeaderboards).mockResolvedValue([
      {
        section: "A",
        overallScore: {
          lines: [
            { teamId: "A2NS" },
            { teamId: "A1NS" },
            { teamId: "A2NS" },
            { teamId: "junk" },
          ],
        },
      },
    ] as any);
    vi.mocked(materializeSwissTeamsRound).mockResolvedValue({ written: true });

    const result = await drawNextSwissTeamsRound("g1", "A");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.roundNumber).toBe(2);
    expect(materializeSwissTeamsRound).toHaveBeenCalledWith(
      "g1",
      "A",
      2,
      3,
      expect.any(Array),
      // Even field -> no bye team.
      null,
    );
  });

  it("draws an odd (BYE) round and passes the bye team to materialize", async () => {
    // Round 1 done for a 5-team BYE event; team 5 already byed in round 1
    // (a SIT_OUT row), so round 2's bye goes to the next lowest eligible team.
    vi.mocked(getDb).mockResolvedValue(
      stubDb(
        [
          { roundNumber: 1, ns: "A1NS", ew: "A2EW" },
          // The round-1 bye: team 5 sat out (SIT_OUT, phantom opponent).
          { roundNumber: 1, ns: "A5NS", ew: "PHANTOM", status: "SIT_OUT" },
        ] as any,
        [{ status: "CONFIRMED" }, { status: "SIT_OUT" }],
      ) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: {
        teams: 5,
        rounds: 4,
        boardsPerRound: 3,
        oddHandling: "BYE",
      },
    } as any);
    // Standings best-first: 1,2,3,4,5. Team 5 already byed, so round 2 byes 4.
    vi.mocked(computeSectionLeaderboards).mockResolvedValue([
      {
        section: "A",
        overallScore: {
          lines: [
            { teamId: "A1NS" },
            { teamId: "A2NS" },
            { teamId: "A3NS" },
            { teamId: "A4NS" },
            { teamId: "A5NS" },
          ],
        },
      },
    ] as any);
    vi.mocked(materializeSwissTeamsRound).mockResolvedValue({ written: true });

    const result = await drawNextSwissTeamsRound("g1", "A");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.roundNumber).toBe(2);
    // Materialized with the round-2 bye team (4 — lowest without a prior bye).
    expect(materializeSwissTeamsRound).toHaveBeenCalledWith(
      "g1",
      "A",
      2,
      3,
      expect.any(Array),
      4,
    );
  });

  it("ranks purely from the append loop when the leaderboard has no line for this section", async () => {
    // No history rows -> highestRound 0 -> no round-complete check.
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as any);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 4, rounds: 4, boardsPerRound: 3 },
    } as any);
    vi.mocked(computeSectionLeaderboards).mockResolvedValue([
      { section: "B", overallScore: { lines: [{ teamId: "A1NS" }] } },
    ] as any);
    vi.mocked(materializeSwissTeamsRound).mockResolvedValue({ written: true });

    const result = await drawNextSwissTeamsRound("g1", "A");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.roundNumber).toBe(1);
  });
});
