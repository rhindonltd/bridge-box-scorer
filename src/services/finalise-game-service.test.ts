// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindGame = vi.fn();
const mockStarted = vi.fn();
const mockSummary = vi.fn();
const mockOutstanding = vi.fn();
const mockSections = vi.fn();

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: (...a: unknown[]) => mockFindGame(...a),
}));
vi.mock("@/db/games/queries/is-game-started", () => ({
  isGameStarted: (...a: unknown[]) => mockStarted(...a),
}));
vi.mock("@/db/games/queries/get-results-summary", () => ({
  getResultsSummary: (...a: unknown[]) => mockSummary(...a),
}));
vi.mock("@/db/games/queries/get-outstanding-boards", () => ({
  OUTSTANDING_DETAIL_LIMIT: 5,
  getOutstandingBoards: (...a: unknown[]) => mockOutstanding(...a),
}));
vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: (...a: unknown[]) => mockSections(...a),
}));

import { checkFinalise } from "./finalise-game-service";

const db = {} as never;

function board(n: number, section = "A") {
  return {
    section,
    tableNumber: n,
    boardNumber: n,
    roundNumber: 1,
    nsPair: "Ann & Bob",
    ewPair: null,
  };
}

describe("checkFinalise", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindGame.mockResolvedValue({ finalisedAt: null });
    mockStarted.mockResolvedValue(true);
    mockSections.mockResolvedValue([{ section: "A", label: "A" }]);
    mockOutstanding.mockResolvedValue([]);
  });

  it("reports an already finalised game", async () => {
    mockFindGame.mockResolvedValue({ finalisedAt: "2026-01-01T00:00:00Z" });
    const r = await checkFinalise("g", db);
    expect(r.canFinalise).toBe(false);
    expect(r.problems[0].code).toBe("ALREADY_FINALISED");
  });

  it("reports a game that has not started", async () => {
    mockStarted.mockResolvedValue(false);
    const r = await checkFinalise("g", db);
    expect(r.canFinalise).toBe(false);
    expect(r.problems[0].code).toBe("NOT_STARTED");
  });

  it("can finalise when every result is in", async () => {
    mockSummary.mockResolvedValue({ totalPlayable: 6, finalized: 6 });
    expect(await checkFinalise("g", db)).toEqual({
      canFinalise: true,
      problems: [],
    });
  });

  it("names the outstanding boards when only a few remain", async () => {
    mockSummary.mockResolvedValue({ totalPlayable: 6, finalized: 4 });
    mockOutstanding.mockResolvedValue([board(1), board(2)]);
    const r = await checkFinalise("g", db);
    expect(r.canFinalise).toBe(false);
    expect(r.problems).toHaveLength(2);
    expect(r.problems[0].message).toBe(
      "No result yet: Round 1 · Table 1 · Board 1 (Ann & Bob vs —).",
    );
  });

  it("shows section names only for a multi-section event", async () => {
    mockSummary.mockResolvedValue({ totalPlayable: 6, finalized: 5 });
    mockOutstanding.mockResolvedValue([board(3, "B")]);
    mockSections.mockResolvedValue([
      { section: "A", label: "Red" },
      { section: "B", label: "Blue" },
    ]);
    const r = await checkFinalise("g", db);
    expect(r.problems[0].message).toContain("Blue · Table 3");
    expect(r.problems[0].section).toBe("B");
  });

  it("gives just a count when many results are outstanding", async () => {
    mockSummary.mockResolvedValue({ totalPlayable: 20, finalized: 10 });
    const r = await checkFinalise("g", db);
    expect(r.problems).toEqual([
      {
        code: "RESULTS_OUTSTANDING",
        message: "10 of 20 results are still outstanding.",
      },
    ]);
    expect(mockOutstanding).not.toHaveBeenCalled();
  });

  it("uses singular wording for one outstanding result with no detail", async () => {
    mockSummary.mockResolvedValue({ totalPlayable: 6, finalized: 5 });
    const r = await checkFinalise("g", db);
    expect(r.problems[0].message).toBe("1 of 6 results is still outstanding.");
  });
});
