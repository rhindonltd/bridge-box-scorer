import { describe, it, expect, vi, beforeEach } from "vitest";

const mockResolve = vi.fn();
vi.mock("@/services/resolve-play-state", () => ({
  resolvePlayState: (...a: unknown[]) => mockResolve(...a),
}));
const mockPairs = vi.fn();
vi.mock("@/db/games/queries/find-pairs", () => ({
  findPairs: () => mockPairs(),
}));
const mockSections = vi.fn();
vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: () => mockSections(),
}));

import { locateCaller } from "./locate-caller";

const db = {} as never;
const round = (n: number, table: number, extra = {}) => ({
  roundNumber: n,
  tableNumber: table,
  side: "EW",
  sitOut: false,
  ...extra,
});

describe("locateCaller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSections.mockResolvedValue([{ section: "A", label: "A" }]);
    mockPairs.mockResolvedValue([
      {
        initialSeat: "A1NS",
        player1: { firstName: "Mary", lastName: "Smith" },
        player2: { firstName: "John", lastName: "Jones" },
      },
    ]);
  });

  it("uses the pair's table in its current round", async () => {
    mockResolve.mockResolvedValue({
      rounds: [round(1, 1), round(2, 4)],
      phase: { kind: "round", roundIndex: 1 },
    });
    expect(await locateCaller(db, "g1", "A1NS")).toEqual({
      table: { section: null, tableNumber: 4, roundNumber: 2, side: "EW" },
      players: "Mary Smith & John Jones",
    });
  });

  it("before the start, uses the table the pair sat down at", async () => {
    mockResolve.mockResolvedValue(null);
    const { table } = await locateCaller(db, "g1", "A1NS");
    expect(table).toEqual({
      section: null,
      tableNumber: 1,
      roundNumber: null,
      side: "NS",
    });
  });

  it("has no table while the pair sits out", async () => {
    mockResolve.mockResolvedValue({
      rounds: [
        round(1, 1, { sitOut: true, tableNumber: null, side: undefined }),
      ],
      phase: { kind: "sitOut", roundIndex: 0 },
    });
    const { table } = await locateCaller(db, "g1", "A1NS");
    expect(table).toMatchObject({
      tableNumber: null,
      roundNumber: 1,
      side: null,
    });
  });

  it("has no table or round once the rounds are over", async () => {
    mockResolve.mockResolvedValue({
      rounds: [round(1, 1)],
      phase: { kind: "complete" },
    });
    const { table } = await locateCaller(db, "g1", "A1NS");
    expect(table).toMatchObject({ tableNumber: null, roundNumber: null });
  });

  it("copes with a round that doesn't say which side the pair sits", async () => {
    mockResolve.mockResolvedValue({
      rounds: [round(1, 2, { side: undefined })],
      phase: { kind: "round", roundIndex: 0 },
    });
    const { table } = await locateCaller(db, "g1", "A1NS");
    expect(table.side).toBeNull();
  });

  it("names the section in a multi-section game", async () => {
    mockResolve.mockResolvedValue(null);
    mockSections.mockResolvedValue([
      { section: "A", label: "Red" },
      { section: "B", label: "Blue" },
    ]);
    expect((await locateCaller(db, "g1", "A1NS")).table.section).toBe("Red");
    mockPairs.mockResolvedValue([]);
    expect((await locateCaller(db, "g1", "C2EW")).table.section).toBe("C");
  });

  it("says 'A pair' when it can't find the pair", async () => {
    mockResolve.mockResolvedValue(null);
    mockPairs.mockResolvedValue([]);
    expect((await locateCaller(db, "g1", "A1NS")).players).toBe("A pair");
  });
});
