import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- mock the DB + query/materialization layer ----

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/games/tables/boards", () => ({
  boards: { boardNumber: "board_number" },
}));

vi.mock("@/db/games/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: vi.fn(),
}));

vi.mock("@/db/games/queries/get-section-movement", () => ({
  getSectionMovement: vi.fn(),
}));

vi.mock("@/services/materialize-movement", async (importActual) => {
  // Mock only the DB write (materializeSections); keep the real pure mappers
  // (e.g. roundRobinTeamsToMaterializable) so the resolver produces its real
  // materializable movement, which the tests below assert on.
  const actual =
    await importActual<typeof import("@/services/materialize-movement")>();
  return {
    ...actual,
    materializeSections: vi.fn(async () => {}),
  };
});

import { getDb } from "@/db/games";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findSections } from "@/db/games/queries/find-sections";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { materializeSections } from "@/services/materialize-movement";
import { checkStart, startGame } from "./start-game-service";
import { PairSeat } from "@/model/participants";

function seatedPairs(
  tables: number,
  section: string,
  exclude: PairSeat[] = [],
) {
  const pairs: { initialSeat: PairSeat }[] = [];
  for (let t = 1; t <= tables; t++) {
    for (const dir of ["NS", "EW"] as const) {
      const seat = `${section}${t}${dir}` as PairSeat;
      if (!exclude.includes(seat)) {
        pairs.push({ initialSeat: seat });
      }
    }
  }
  return pairs;
}

function section(letter: string, tables: number) {
  return { section: letter, label: letter, tables, selectedMovement: null, ordinal: 0 };
}

const mitchell = (tables: number) => ({
  source: "MITCHELL" as const,
  mitchell: { tables, rounds: tables, boardsPerRound: 3 },
});

const swiss = (tables: number, rounds = 5, boardsPerRound = 3) => ({
  source: "SWISS" as const,
  swiss: { tables, rounds, boardsPerRound },
});

const roundRobinTeams = (teams: number, rounds: number, boardsPerRound = 3) => ({
  source: "ROUND_ROBIN_TEAMS" as const,
  roundRobinTeams: { teams, rounds, boardsPerRound },
});

/** Mock a games Db whose boards table is empty (not yet started). */
function mockEmptyDb() {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ limit: vi.fn(async () => []) })),
    })),
  };
}

/** Mock a games Db whose boards table already has rows (started). */
function mockStartedDb() {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ limit: vi.fn(async () => [{ n: 1 }]) })),
    })),
  };
}

describe("checkStart (multi-section)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports canStart false when a section has no movement", async () => {
    vi.mocked(findSections).mockResolvedValue([section("A", 5)] as any);
    vi.mocked(getSectionMovement).mockResolvedValue(null);
    vi.mocked(findPairs).mockResolvedValue(seatedPairs(5, "A") as any);

    const result = await checkStart("g1", {} as any);

    expect(result.canStart).toBe(false);
    expect(result.problems.map((p) => p.code)).toContain(
      "NO_MOVEMENT_SELECTED",
    );
  });

  it("resolves a section that has no seated pairs (empty seat list)", async () => {
    // Section A exists with a movement, but no pairs are seated anywhere, so
    // seatsBySection has no entry for A and the `?? []` fallback is taken.
    vi.mocked(findSections).mockResolvedValue([section("A", 5)] as any);
    vi.mocked(getSectionMovement).mockResolvedValue(mitchell(5));
    vi.mocked(findPairs).mockResolvedValue([] as any);

    const result = await checkStart("g1", {} as any);

    expect(result.canStart).toBe(false);
    // No pairs seated -> the section reports NO_PAIRS_SEATED.
    expect(result.problems.map((p) => p.code)).toContain("NO_PAIRS_SEATED");
  });

  it("reports canStart false with no sections", async () => {
    vi.mocked(findSections).mockResolvedValue([] as any);
    vi.mocked(findPairs).mockResolvedValue([] as any);

    const result = await checkStart("g1", {} as any);

    expect(result.canStart).toBe(false);
  });

  it("reports canStart true when all sections are valid", async () => {
    vi.mocked(findSections).mockResolvedValue([
      section("A", 5),
      section("B", 3),
    ] as any);
    vi.mocked(getSectionMovement).mockImplementation(
      async (_db: any, s: string) => (s === "A" ? mitchell(5) : mitchell(3)),
    );
    vi.mocked(findPairs).mockResolvedValue([
      ...seatedPairs(5, "A"),
      ...seatedPairs(3, "B"),
    ] as any);

    const result = await checkStart("g1", {} as any);

    expect(result.canStart).toBe(true);
  });

  it("blocks start and names the failing section when one section is short", async () => {
    vi.mocked(findSections).mockResolvedValue([
      section("A", 5),
      section("B", 3),
    ] as any);
    vi.mocked(getSectionMovement).mockImplementation(
      async (_db: any, s: string) => (s === "A" ? mitchell(5) : mitchell(3)),
    );
    // Section B is two pairs short.
    vi.mocked(findPairs).mockResolvedValue([
      ...seatedPairs(5, "A"),
      ...seatedPairs(3, "B", ["B2NS", "B3NS"]),
    ] as any);

    const result = await checkStart("g1", {} as any);

    expect(result.canStart).toBe(false);
    // Problems are tagged with the section they belong to (Section B is short).
    expect(result.problems.some((p) => p.section === "B")).toBe(true);
  });
});

describe("startGame (multi-section)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("materializes every section once when all are valid", async () => {
    vi.mocked(getDb).mockResolvedValue(mockEmptyDb() as any);
    vi.mocked(findSections).mockResolvedValue([
      section("A", 5),
      section("B", 3),
    ] as any);
    vi.mocked(getSectionMovement).mockImplementation(
      async (_db: any, s: string) => (s === "A" ? mitchell(5) : mitchell(3)),
    );
    vi.mocked(findPairs).mockResolvedValue([
      ...seatedPairs(5, "A"),
      ...seatedPairs(3, "B"),
    ] as any);

    const result = await startGame("g1");

    expect(result.canStart).toBe(true);
    expect(materializeSections).toHaveBeenCalledTimes(1);
    const [, sections] = vi.mocked(materializeSections).mock.calls[0];
    expect(sections.map((s) => s.section).sort()).toEqual(["A", "B"]);
  });

  it("does not materialize when one section is invalid", async () => {
    vi.mocked(getDb).mockResolvedValue(mockEmptyDb() as any);
    vi.mocked(findSections).mockResolvedValue([
      section("A", 5),
      section("B", 3),
    ] as any);
    vi.mocked(getSectionMovement).mockImplementation(
      async (_db: any, s: string) => (s === "A" ? mitchell(5) : mitchell(3)),
    );
    vi.mocked(findPairs).mockResolvedValue([
      ...seatedPairs(5, "A"),
      ...seatedPairs(3, "B", ["B2NS", "B3NS"]),
    ] as any);

    const result = await startGame("g1");

    expect(result.canStart).toBe(false);
    expect(materializeSections).not.toHaveBeenCalled();
  });

  it("throws when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(undefined as any);

    await expect(startGame("missing-game")).rejects.toThrow(
      "Game db does not exist",
    );
    expect(materializeSections).not.toHaveBeenCalled();
  });

  it("does not materialize when the game was already started", async () => {
    vi.mocked(getDb).mockResolvedValue(mockStartedDb() as any);
    vi.mocked(findSections).mockResolvedValue([section("A", 5)] as any);
    vi.mocked(getSectionMovement).mockResolvedValue(mitchell(5));
    vi.mocked(findPairs).mockResolvedValue(seatedPairs(5, "A") as any);

    const result = await startGame("g1");

    expect(result.canStart).toBe(false);
    expect(materializeSections).not.toHaveBeenCalled();
  });
});

describe("startGame (Swiss)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("materializes only round 1 as a positional layout", async () => {
    vi.mocked(getDb).mockResolvedValue(mockEmptyDb() as any);
    // 2 Swiss tables => 4 pairs seated positionally (A1NS/A1EW/A2NS/A2EW).
    vi.mocked(findSections).mockResolvedValue([section("A", 2)] as any);
    vi.mocked(getSectionMovement).mockResolvedValue(swiss(2, 5, 3));
    vi.mocked(findPairs).mockResolvedValue(seatedPairs(2, "A") as any);

    const result = await startGame("g1");

    expect(result.canStart).toBe(true);
    expect(materializeSections).toHaveBeenCalledTimes(1);

    const [, sections] = vi.mocked(materializeSections).mock.calls[0];
    const movement = sections[0].movement;

    // Only round 1 is materialized (no later rounds), across both tables.
    expect(movement).toHaveLength(2);
    for (const table of movement) {
      expect(table.rounds).toHaveLength(1);
      expect(table.rounds[0].roundNumber).toBe(1);
      // Round 1 boards are 1..boardsPerRound.
      expect(table.rounds[0].boardStart).toBe(1);
      expect(table.rounds[0].boardEnd).toBe(3);
    }

    // Positional pairing: table T seats its own NS/EW pairs, whose stable ids
    // are their round-1 home seats ("1NS" / "1EW", section-qualified later).
    const t1 = movement.find((m) => m.tableNumber === 1)!.rounds[0];
    expect(t1.ns).toBe("1NS");
    expect(t1.ew).toBe("1EW");
  });

  it("applies a round-1 bye when the field is odd", async () => {
    vi.mocked(getDb).mockResolvedValue(mockEmptyDb() as any);
    // 2 tables but one seat empty (A2EW) => 3 pairs => a bye.
    vi.mocked(findSections).mockResolvedValue([section("A", 2)] as any);
    vi.mocked(getSectionMovement).mockResolvedValue(swiss(2, 5, 3));
    vi.mocked(findPairs).mockResolvedValue(
      seatedPairs(2, "A", ["A2EW"]) as any,
    );

    const result = await startGame("g1");

    expect(result.canStart).toBe(true);

    const [, sections] = vi.mocked(materializeSections).mock.calls[0];
    const movement = sections[0].movement;

    // The table with the empty EW seat becomes a sit-out; its occupied pair
    // (the NS pair at that table, home seat "2NS") byes with a phantom opponent.
    const sitOutTable = movement.find((m) => m.rounds[0].sitOut)!;
    expect(sitOutTable.rounds[0].ns).toBe("2NS");
    expect(sitOutTable.rounds[0].ew).toBe("PHANTOM");
  });
});

describe("startGame (Round Robin Teams)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("materializes the WHOLE fixed schedule (every round) up front", async () => {
    vi.mocked(getDb).mockResolvedValue(mockEmptyDb() as any);
    // 6 teams => 6 tables fully seated (both pairs at each table).
    const teams = 6;
    const rounds = teams - 1;
    vi.mocked(findSections).mockResolvedValue([section("A", teams)] as any);
    vi.mocked(getSectionMovement).mockResolvedValue(
      roundRobinTeams(teams, rounds, 4),
    );
    vi.mocked(findPairs).mockResolvedValue(seatedPairs(teams, "A") as any);

    const result = await startGame("g1");

    expect(result.canStart).toBe(true);
    expect(materializeSections).toHaveBeenCalledTimes(1);

    const [, sections] = vi.mocked(materializeSections).mock.calls[0];
    const movement = sections[0].movement;

    // Every team's home table is present, each carrying ALL rounds (unlike
    // Swiss Teams, which materializes only round 1 at start).
    expect(movement.map((m) => m.tableNumber).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    for (const table of movement) {
      expect(table.rounds.map((r) => r.roundNumber)).toEqual([1, 2, 3, 4, 5]);
      for (const round of table.rounds) {
        expect(round.boardStart).toBe((round.roundNumber - 1) * 4 + 1);
        expect(round.boardEnd).toBe(round.roundNumber * 4);
      }
    }
  });

  it("does not materialize an odd-team Round Robin (blocked)", async () => {
    vi.mocked(getDb).mockResolvedValue(mockEmptyDb() as any);
    vi.mocked(findSections).mockResolvedValue([section("A", 5)] as any);
    vi.mocked(getSectionMovement).mockResolvedValue(roundRobinTeams(5, 4, 4));
    vi.mocked(findPairs).mockResolvedValue(seatedPairs(5, "A") as any);

    const result = await startGame("g1");

    expect(result.canStart).toBe(false);
    expect(result.problems.map((p) => p.code)).toContain("ODD_TEAM_COUNT");
    expect(materializeSections).not.toHaveBeenCalled();
  });
});
