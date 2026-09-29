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
  // The real swissPairMovementId is pure; keep it so resolveSwissSeatingNames
  // (mocked below) isn't needed to import it. Not used directly here.
  swissPairMovementId: (_t: number, id: number) => `${id}NS`,
}));
// Preview resolves player names; stub it so the service test stays DB-free.
vi.mock("@/services/swiss-seating-names", () => ({
  resolveSwissSeatingNames: vi
    .fn()
    .mockResolvedValue({ tables: [], bye: null }),
}));
// buildPairStandings resolves pair names via this lookup; stub it empty so the
// standings fall back to "Pair {id}" labels (names aren't under test here).
vi.mock("@/db/games/queries/assignment-players", () => ({
  buildAssignmentPlayerLookup: vi.fn().mockResolvedValue(new Map()),
}));

import {
  previewNextSwissRound,
  commitNextSwissRound,
} from "./draw-swiss-round-service";
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

/** Seed a Swiss section + fully-scored round-1 history so a draw proceeds. */
function seedDrawable(over: { stationaryPairs?: number[] } = {}) {
  vi.mocked(getDb).mockResolvedValue(
    stubDb([{ status: "CONFIRMED" }, { status: "OVERRIDDEN" }]) as never,
  );
  vi.mocked(getSectionMovement).mockResolvedValue({
    source: "SWISS",
    swiss: { tables: 2, rounds: 4, boardsPerRound: 2, ...over },
  } as never);
  vi.mocked(getSwissBoardHistory).mockResolvedValue(emptyHistory(1) as never);
  vi.mocked(computeSectionLeaderboards).mockResolvedValue([
    {
      section: "A",
      overallScore: {
        lines: [
          { pairId: "1NS", totalVP: 30, rank: 1, tied: false },
          { pairId: "1EW", totalVP: 25, rank: 2, tied: false },
        ],
      },
    },
  ] as never);
  vi.mocked(swissPairIdFromParticipant).mockImplementation((pairId: string) =>
    pairId === "1NS" ? 1 : pairId === "1EW" ? 3 : null,
  );
}

describe("previewNextSwissRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(undefined as never);

    await expect(previewNextSwissRound("g1", "A")).rejects.toThrow(
      "Game db does not exist",
    );
  });

  it("rejects a non-Swiss section (no movement selected)", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as never);
    vi.mocked(getSectionMovement).mockResolvedValue(null as never);

    await expect(previewNextSwissRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "NOT_SWISS",
    });
  });

  it("rejects a section whose movement is not SWISS", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as never);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "MITCHELL",
    } as never);

    await expect(previewNextSwissRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "NOT_SWISS",
    });
  });

  it("rejects when every round has already been drawn (event complete)", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as never);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS",
      swiss: { tables: 2, rounds: 2, boardsPerRound: 2 },
    } as never);
    vi.mocked(getSwissBoardHistory).mockResolvedValue(emptyHistory(2) as never);

    await expect(previewNextSwissRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "EVENT_COMPLETE",
    });
  });

  it("rejects when the current round is not fully scored", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb([{ status: "NOT_PLAYED" }]) as never,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS",
      swiss: { tables: 2, rounds: 4, boardsPerRound: 2 },
    } as never);
    vi.mocked(getSwissBoardHistory).mockResolvedValue(emptyHistory(1) as never);

    await expect(previewNextSwissRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "ROUND_INCOMPLETE",
    });
  });

  it("treats a round with only sit-out boards as incomplete", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([{ status: "SIT_OUT" }]) as never);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS",
      swiss: { tables: 2, rounds: 4, boardsPerRound: 2 },
    } as never);
    vi.mocked(getSwissBoardHistory).mockResolvedValue(emptyHistory(1) as never);

    await expect(previewNextSwissRound("g1", "A")).resolves.toEqual({
      ok: false,
      reason: "ROUND_INCOMPLETE",
    });
  });

  it("computes the next round's seating WITHOUT writing anything", async () => {
    seedDrawable();

    const result = await previewNextSwissRound("g1", "A");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.roundNumber).toBe(2);
    expect(result.tables).toBe(2);
    expect(result.seating.length).toBeGreaterThan(0);
    // Standings are returned in draw order (best first) with running VP totals,
    // sourced from the same leaderboard lines the draw ranked on.
    expect(result.standings.map((s) => ({ id: s.id, total: s.total }))).toEqual([
      { id: 1, total: 30 },
      { id: 3, total: 25 },
      // Pairs 2 and 4 have no leaderboard line yet -> appended with a 0 total.
      { id: 2, total: 0 },
      { id: 4, total: 0 },
    ]);
    // A preview must never materialize.
    expect(materializeSwissRound).not.toHaveBeenCalled();
  });

  it("ranks purely from the append loop when the leaderboard has no line for this section", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as never);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS",
      swiss: { tables: 2, rounds: 4, boardsPerRound: 2 },
    } as never);
    vi.mocked(getSwissBoardHistory).mockResolvedValue(emptyHistory(0) as never);
    vi.mocked(computeSectionLeaderboards).mockResolvedValue([
      { section: "B", overallScore: { lines: [{ pairId: "1NS" }] } },
    ] as never);

    const result = await previewNextSwissRound("g1", "A");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.roundNumber).toBe(1);
    expect(swissPairIdFromParticipant).not.toHaveBeenCalled();
  });
});

describe("commitNextSwissRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("materializes the exact seating it is given", async () => {
    seedDrawable();
    vi.mocked(materializeSwissRound).mockResolvedValue({ written: true });

    // A structurally-valid arrangement for 2 tables (pairs 1..4).
    const seating = [
      { tableNumber: 1, ns: 1, ew: 3 },
      { tableNumber: 2, ns: 2, ew: 4 },
    ];

    const result = await commitNextSwissRound("g1", "A", seating, null);

    expect(result).toEqual({ ok: true, roundNumber: 2 });
    expect(materializeSwissRound).toHaveBeenCalledWith(
      "g1",
      "A",
      2,
      2,
      2,
      seating,
      null,
    );
  });

  it("commits a director-edited (swapped) seating verbatim", async () => {
    seedDrawable();
    vi.mocked(materializeSwissRound).mockResolvedValue({ written: true });

    // Pairs 3 and 4 swapped vs the natural draw — still structurally valid.
    const edited = [
      { tableNumber: 1, ns: 1, ew: 4 },
      { tableNumber: 2, ns: 2, ew: 3 },
    ];

    const result = await commitNextSwissRound("g1", "A", edited, null);

    expect(result.ok).toBe(true);
    expect(materializeSwissRound).toHaveBeenCalledWith(
      "g1",
      "A",
      2,
      2,
      2,
      edited,
      null,
    );
  });

  it("rejects a structurally-invalid seating without writing", async () => {
    seedDrawable();

    // Pair 1 seated twice, pair 2 missing.
    const invalid = [
      { tableNumber: 1, ns: 1, ew: 3 },
      { tableNumber: 2, ns: 1, ew: 4 },
    ];

    const result = await commitNextSwissRound("g1", "A", invalid, null);

    expect(result).toEqual({ ok: false, reason: "INVALID_SEATING" });
    expect(materializeSwissRound).not.toHaveBeenCalled();
  });

  it("propagates a precondition rejection (e.g. round incomplete)", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb([{ status: "NOT_PLAYED" }]) as never,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS",
      swiss: { tables: 2, rounds: 4, boardsPerRound: 2 },
    } as never);
    vi.mocked(getSwissBoardHistory).mockResolvedValue(emptyHistory(1) as never);

    const result = await commitNextSwissRound(
      "g1",
      "A",
      [{ tableNumber: 1, ns: 1, ew: 3 }],
      null,
    );

    expect(result).toEqual({ ok: false, reason: "ROUND_INCOMPLETE" });
    expect(materializeSwissRound).not.toHaveBeenCalled();
  });
});
