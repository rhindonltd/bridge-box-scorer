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

/**
 * Decode a seat id (qualified "A1NS" or unqualified "1NS") to a stable pair id
 * for a 2-table event: 1NS→1, 2NS→2, 1EW→3, 2EW→4. Stands in for the real
 * swissPairIdFromParticipant across both the leaderboard ids and the seat ids.
 */
function decodeSeat(id: string): number | null {
  const m = /(\d+)(NS|EW)$/.exec(id);
  if (!m) return null;
  const table = Number(m[1]);
  return m[2] === "NS" ? table : 2 + table;
}

/** A minimal Swiss board history for 2 tables (4 pairs), nothing played yet. */
function emptyHistory(highestRound: number) {
  return {
    highestRound,
    playedOpponents: new Map(),
    hadBye: new Set<number>(),
    hadHalfMatch: new Set<number>(),
    directionCounts: new Map(),
  };
}

/**
 * A db stub for the draw service's two reads:
 *  - `isRoundComplete`: `select().from().where()` → `statusRows`.
 *  - `seatedPairIdsForSection`: `select().from()` (then awaited) → the seated
 *    assignment rows (`{ id }`). `from()` therefore returns a THENABLE that also
 *    exposes `.where()`, so both call shapes resolve correctly.
 */
function stubDb(
  statusRows: { status: string }[],
  assignmentRows: { id: string }[] = [],
) {
  const fromResult = {
    // `isRoundComplete` now joins boards→matches: select().from().innerJoin().where().
    innerJoin: () => fromResult,
    where: () => Promise.resolve(statusRows),
    then: (resolve: (rows: { id: string }[]) => unknown) =>
      resolve(assignmentRows),
  };
  return { select: () => ({ from: () => fromResult }) };
}

/** Section-qualified assignment-id rows for the given seats (e.g. "A1NS"). */
function assignmentsFor(seats: string[]): { id: string }[] {
  return seats.map((id) => ({ id }));
}

/** Seed a Swiss section + fully-scored round-1 history so a draw proceeds. */
function seedDrawable(over: { stationaryPairs?: number[] } = {}) {
  vi.mocked(getDb).mockResolvedValue(
    stubDb(
      [{ status: "CONFIRMED" }, { status: "OVERRIDDEN" }],
      // A full even field: all four positions are seated.
      assignmentsFor(["A1NS", "A2NS", "A1EW", "A2EW"]),
    ) as never,
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
  vi.mocked(swissPairIdFromParticipant).mockImplementation(decodeSeat);
}

/**
 * Seed an ODD (3-pair) Swiss section with a round-2 HALF_MATCHES plan, so the
 * draw resolves a 2-half-matches group rather than a bye. Round 1 is scored, so
 * the next round is 2.
 */
function seedHalfMatch() {
  vi.mocked(getDb).mockResolvedValue(
    stubDb(
      [{ status: "CONFIRMED" }],
      // An ODD field: only three positions seated (A2EW is the phantom).
      assignmentsFor(["A1NS", "A2NS", "A1EW"]),
    ) as never,
  );
  vi.mocked(getSectionMovement).mockResolvedValue({
    source: "SWISS",
    swiss: {
      tables: 2,
      rounds: 4,
      boardsPerRound: 4,
      oddHandling: "HALF_MATCHES",
      oddRoundPlan: ["BYE", "HALF_MATCHES", "BYE", "HALF_MATCHES"],
    },
  } as never);
  vi.mocked(getSwissBoardHistory).mockResolvedValue(emptyHistory(1) as never);
  // A 3-pair field: standings order 1, 2, 3 (pairs 2 and 3 are the lower two).
  vi.mocked(computeSectionLeaderboards).mockResolvedValue([
    {
      section: "A",
      overallScore: {
        lines: [
          { pairId: "1NS", totalVP: 30, rank: 1, tied: false },
          { pairId: "2NS", totalVP: 20, rank: 2, tied: false },
          { pairId: "1EW", totalVP: 10, rank: 3, tied: false },
        ],
      },
    },
  ] as never);
  vi.mocked(swissPairIdFromParticipant).mockImplementation(decodeSeat);
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
    // All four positions seated: the append loop builds the full even field
    // since this section has no leaderboard lines.
    vi.mocked(getDb).mockResolvedValue(
      stubDb([], assignmentsFor(["A1NS", "A2NS", "A1EW", "A2EW"])) as never,
    );
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS",
      swiss: { tables: 2, rounds: 4, boardsPerRound: 2 },
    } as never);
    vi.mocked(getSwissBoardHistory).mockResolvedValue(emptyHistory(0) as never);
    vi.mocked(computeSectionLeaderboards).mockResolvedValue([
      { section: "B", overallScore: { lines: [{ pairId: "1NS" }] } },
    ] as never);
    vi.mocked(swissPairIdFromParticipant).mockImplementation(decodeSeat);

    const result = await previewNextSwissRound("g1", "A");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.roundNumber).toBe(1);
    // The section-"B" leaderboard line is never decoded for section "A".
    expect(swissPairIdFromParticipant).not.toHaveBeenCalledWith(
      "1NS",
      expect.anything(),
    );
  });

  it("previews a 2-half-matches group for an odd field with a HALF_MATCHES round", async () => {
    seedHalfMatch();

    const result = await previewNextSwissRound("g1", "A");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.roundNumber).toBe(2);
    // The odd (3-pair) field resolves a half-match, not a bye.
    expect(result.sitOutPairId).toBeNull();
    expect(result.halfMatch).not.toBeNull();
    const hm = result.halfMatch!;
    // The three seated pairs (1, 2, 3) form the group; best-standing (1) anchors.
    expect(hm.group.anchor).toBe(1);
    expect(
      [hm.group.anchor, hm.group.halfOneOpponent, hm.group.halfTwoOpponent].sort(),
    ).toEqual([1, 2, 3]);
    // Nothing is materialized by a preview.
    expect(materializeSwissRound).not.toHaveBeenCalled();
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

  it("materializes a 2-half-matches group with its anchor seat", async () => {
    seedHalfMatch();
    vi.mocked(materializeSwissRound).mockResolvedValue({ written: true });

    // The group covers all three seated pairs; `seating` is empty (no ordinary
    // tables in this 3-pair field).
    const halfMatch = {
      group: { anchor: 1, halfOneOpponent: 2, halfTwoOpponent: 3 },
      anchorTable: 1,
      anchorDirection: "NS" as const,
    };

    const result = await commitNextSwissRound("g1", "A", [], null, halfMatch);

    expect(result).toEqual({ ok: true, roundNumber: 2 });
    expect(materializeSwissRound).toHaveBeenCalledWith(
      "g1",
      "A",
      2,
      2,
      4,
      [],
      null,
      {
        group: halfMatch.group,
        seat: { tableNumber: 1, anchorDirection: "NS" },
      },
    );
  });

  it("rejects a half-match commit whose group+seating doesn't cover the field", async () => {
    seedHalfMatch();

    // The group only names two of the three seated pairs → pair 3 is missing.
    const halfMatch = {
      group: { anchor: 1, halfOneOpponent: 2, halfTwoOpponent: 2 },
      anchorTable: 1,
      anchorDirection: "NS" as const,
    };

    const result = await commitNextSwissRound("g1", "A", [], null, halfMatch);

    expect(result).toEqual({ ok: false, reason: "INVALID_SEATING" });
    expect(materializeSwissRound).not.toHaveBeenCalled();
  });
});
