import { describe, it, expect, vi, beforeEach } from "vitest";

const mockValidate = vi.fn();
vi.mock("@/services/security/player-token", () => ({
  validatePlayerToken: (...a: unknown[]) => mockValidate(...a),
}));
const mockGame = vi.fn();
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: (...a: unknown[]) => mockGame(...a),
}));
const mockStarted = vi.fn();
vi.mock("@/db/games/queries/is-game-started", () => ({
  isGameStarted: (...a: unknown[]) => mockStarted(...a),
}));
vi.mock("@/db/games", () => ({ getDb: vi.fn().mockResolvedValue({}) }));
const mockPairs = vi.fn();
vi.mock("@/db/games/queries/find-pairs", () => ({
  findPairs: () => mockPairs(),
}));
const mockSections = vi.fn();
vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: () => mockSections(),
}));

import { identifyDevice } from "./identify-device";

const pair = (seat: string) => ({
  initialSeat: seat,
  player1: { firstName: "Mary", lastName: "Smith" },
  player2: { firstName: "John", lastName: "Jones" },
});

describe("identifyDevice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidate.mockResolvedValue(true);
    mockGame.mockResolvedValue({
      eventName: "Monday Pairs",
      finalisedAt: null,
    });
    mockStarted.mockResolvedValue(true);
    mockPairs.mockResolvedValue([pair("A3NS")]);
    mockSections.mockResolvedValue([{ section: "A", label: "A" }]);
  });

  const held = { gameId: "g1", seat: "A3NS", token: "tok" };

  it("names the pair at a seat the device really holds", async () => {
    expect(await identifyDevice([held])).toEqual([
      {
        eventName: "Monday Pairs",
        seatLabel: "Table 3 NS",
        players: "Mary Smith & John Jones",
      },
    ]);
    expect(mockValidate).toHaveBeenCalledWith("g1", "A3NS", "tok");
  });

  it("includes the section name in a multi-section game", async () => {
    mockPairs.mockResolvedValue([pair("B3NS")]);
    mockSections.mockResolvedValue([
      { section: "A", label: "Red" },
      { section: "B", label: "Blue" },
    ]);
    const [s] = await identifyDevice([{ ...held, seat: "B3NS" }]);
    expect(s.seatLabel).toBe("Section Blue, Table 3 NS");
  });

  it("falls back to the section letter when it has no section row", async () => {
    mockPairs.mockResolvedValue([pair("C1EW")]);
    mockSections.mockResolvedValue([
      { section: "A", label: "A" },
      { section: "B", label: "B" },
    ]);
    const [s] = await identifyDevice([{ ...held, seat: "C1EW" }]);
    expect(s.seatLabel).toBe("Section C, Table 1 EW");
  });

  it("ignores a seat whose token doesn't match", async () => {
    mockValidate.mockResolvedValue(false);
    expect(await identifyDevice([held])).toEqual([]);
  });

  it("ignores games that are missing, finalised or not started", async () => {
    mockGame.mockResolvedValueOnce(null);
    expect(await identifyDevice([held])).toEqual([]);
    mockGame.mockResolvedValueOnce({ eventName: "x", finalisedAt: "2026" });
    expect(await identifyDevice([held])).toEqual([]);
    mockStarted.mockResolvedValueOnce(false);
    expect(await identifyDevice([held])).toEqual([]);
  });

  it("ignores a seat with no pair", async () => {
    mockPairs.mockResolvedValue([]);
    expect(await identifyDevice([held])).toEqual([]);
  });

  it("skips a seat that can't be resolved instead of failing", async () => {
    mockValidate.mockRejectedValueOnce(new Error("db gone"));
    expect(await identifyDevice([held, held])).toHaveLength(1);
  });

  it("looks at no more than ten seats", async () => {
    await identifyDevice(Array.from({ length: 15 }, () => held));
    expect(mockValidate).toHaveBeenCalledTimes(10);
  });
});
