import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/db/games/queries/get-section-movement", () => ({
  getSectionMovement: vi.fn(),
}));
vi.mock("@/services/leaderboard-service", () => ({
  computeSectionLeaderboards: vi.fn(),
}));
vi.mock("@/db/games/queries/swiss-board-history", () => ({
  getSwissBoardHistory: vi.fn(),
  swissPairIdFromParticipant: vi.fn(),
}));
vi.mock("@/services/materialize-swiss-round", () => ({
  materializeSwissRound: vi.fn(),
}));

import { drawNextSwissRound } from "./draw-swiss-round-service";
import { getDb } from "@/db/games";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { computeSectionLeaderboards } from "@/services/leaderboard-service";
import {
  getSwissBoardHistory,
  swissPairIdFromParticipant,
} from "@/db/games/queries/swiss-board-history";
import { materializeSwissRound } from "@/services/materialize-swiss-round";

/** A minimal Swiss board history for 2 tables (4 pairs), nothing played yet. */
function emptyHistory(highestRound: number) {
  return {
    highestRound,
    playedOpponents: new Map(),
    hadBye: new Set<number>(),
    directionCounts: new Map(),
  };
}

/** A db stub whose isRoundComplete select resolves to `statusRows`. */
function stubDb(statusRows: { status: string }[]) {
  const chain = {
    from: () => chain,
    where: () => Promise.resolve(statusRows),
  };
  return { select: () => chain };
}

describe("drawNextSwissRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(undefined as any);

    await expect(drawNextSwissRound("g1", "A")).rejects.toThrow(
      "Game db does not exist",
    );
  });

  it("rejects a non-Swiss section (no movement selected)", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as any);
    vi.mocked(getSectionMovement).mockResolvedValue(null as any);

    await expect(drawNextSwissRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "NOT_SWISS",
    });
  });

  it("rejects a section whose movement is not SWISS", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as any);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "MITCHELL",
    } as any);

    await expect(drawNextSwissRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "NOT_SWISS",
    });
  });

  it("rejects when every round has already been drawn (event complete)", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as any);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS",
      swiss: { tables: 2, rounds: 2, boardsPerRound: 2 },
    } as any);
    vi.mocked(getSwissBoardHistory).mockResolvedValue(emptyHistory(2) as any);

    await expect(drawNextSwissRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "EVENT_COMPLETE",
    });
  });

  it("rejects when the current round is not fully scored", async () => {
    // A playable board that is still NOT_PLAYED -> round incomplete.
    vi.mocked(getDb).mockResolvedValue(
      stubDb([{ status: "NOT_PLAYED" }]) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS",
      swiss: { tables: 2, rounds: 4, boardsPerRound: 2 },
    } as any);
    vi.mocked(getSwissBoardHistory).mockResolvedValue(emptyHistory(1) as any);

    await expect(drawNextSwissRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "ROUND_INCOMPLETE",
    });
  });

  it("draws the next round when the current round is complete, ranking from the leaderboard and appending unseen pairs", async () => {
    // Round 1 is fully scored (all CONFIRMED/OVERRIDDEN).
    vi.mocked(getDb).mockResolvedValue(
      stubDb([
        { status: "CONFIRMED" },
        { status: "OVERRIDDEN" },
        { status: "SIT_OUT" },
      ]) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS",
      // stationaryPairs deliberately undefined -> exercises the `?? []` fallback.
      swiss: { tables: 2, rounds: 4, boardsPerRound: 2 },
    } as any);
    vi.mocked(getSwissBoardHistory).mockResolvedValue(emptyHistory(1) as any);

    // The leaderboard ranks only pairs 1 and 3; pairs 2 and 4 are appended by
    // the "not yet ranked" loop.
    vi.mocked(computeSectionLeaderboards).mockResolvedValue([
      {
        section: "A",
        overallScore: { lines: [{ pairId: "1NS" }, { pairId: "1EW" }] },
      },
    ] as any);
    vi.mocked(swissPairIdFromParticipant).mockImplementation(
      (pairId: string) => (pairId === "1NS" ? 1 : pairId === "1EW" ? 3 : null),
    );
    vi.mocked(materializeSwissRound).mockResolvedValue({ written: true });

    const result = await drawNextSwissRound("g1", "A");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.roundNumber).toBe(2);
    expect(materializeSwissRound).toHaveBeenCalledTimes(1);
    // The draw fed round 2 (currentRound 1 + 1).
    expect(materializeSwissRound).toHaveBeenCalledWith(
      "g1",
      "A",
      2,
      2,
      2,
      expect.any(Array),
      null,
    );
  });

  it("treats a round with only sit-out boards as incomplete (nothing to score from)", async () => {
    // Every board is SIT_OUT -> playable is empty -> isRoundComplete false.
    vi.mocked(getDb).mockResolvedValue(stubDb([{ status: "SIT_OUT" }]) as any);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS",
      swiss: { tables: 2, rounds: 4, boardsPerRound: 2 },
    } as any);
    vi.mocked(getSwissBoardHistory).mockResolvedValue(emptyHistory(1) as any);

    await expect(drawNextSwissRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "ROUND_INCOMPLETE",
    });
  });

  it("ranks purely from the append loop when the leaderboard has no line for this section", async () => {
    // currentRound 0 -> no round-complete check; leaderboard lists a different
    // section so `sectionBoard` is undefined and all pairs come from the loop.
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as any);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS",
      swiss: { tables: 2, rounds: 4, boardsPerRound: 2 },
    } as any);
    vi.mocked(getSwissBoardHistory).mockResolvedValue(emptyHistory(0) as any);
    vi.mocked(computeSectionLeaderboards).mockResolvedValue([
      { section: "B", overallScore: { lines: [{ pairId: "1NS" }] } },
    ] as any);
    vi.mocked(materializeSwissRound).mockResolvedValue({ written: true });

    const result = await drawNextSwissRound("g1", "A");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.roundNumber).toBe(1);
    expect(swissPairIdFromParticipant).not.toHaveBeenCalled();
  });

  it("skips a duplicate pair id already seen on the leaderboard", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb([{ status: "CONFIRMED" }]) as any,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS",
      swiss: {
        tables: 2,
        rounds: 4,
        boardsPerRound: 2,
        stationaryPairs: [1],
      },
    } as any);
    vi.mocked(getSwissBoardHistory).mockResolvedValue(emptyHistory(1) as any);
    // pairId "1NS" appears twice; the second is de-duplicated.
    vi.mocked(computeSectionLeaderboards).mockResolvedValue([
      {
        section: "A",
        overallScore: { lines: [{ pairId: "1NS" }, { pairId: "1NS" }] },
      },
    ] as any);
    vi.mocked(swissPairIdFromParticipant).mockReturnValue(1);
    vi.mocked(materializeSwissRound).mockResolvedValue({ written: true });

    const result = await drawNextSwissRound("g1", "A");
    expect(result.ok).toBe(true);
  });
});
