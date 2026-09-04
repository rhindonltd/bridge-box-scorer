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

vi.mock("@/services/materialize-movement", () => ({
  materializeSections: vi.fn(async () => {}),
}));

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
    expect(result.problems.some((p) => p.message.startsWith("Section B:"))).toBe(
      true,
    );
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
