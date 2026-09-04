import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/db/games/tables/boards", () => ({
  boards: "boards",
}));

// Capture the data passed to the XML generator so we can assert the branch
// fallbacks (direction, outcome, lead, sectionName) without exercising the real
// serializer.
vi.mock("@/lib/usebio/generate-usebio", () => ({
  generateUsebioXml: vi.fn(() => "<xml/>"),
}));

import { generateUsebio } from "./usebio-service";
import { Db } from "@/db/games";
import { findPairs } from "@/db/games/queries/find-pairs";
import { generateUsebioXml } from "@/lib/usebio/generate-usebio";
import type { BridgeGame } from "@/db/game-index/schema";
import type { Club } from "@/db/system/schema";

const club: Club = { id: 1, name: "Test Club", clubNumber: "999" };

function makeGame(overrides: Partial<BridgeGame> = {}): BridgeGame {
  return {
    gameId: "g1",
    eventName: "Evt",
    director: "Dir",
    gameType: "PAIRS",
    scoringType: "MP",
    sessionName: "1",
    sectionName: "A",
    eventDate: "2024-01-01T00:00:00.000Z",
    tables: 1,
    selectedMovement: null,
    leadCardRequired: true,
    createdAt: "2024-01-01 00:00:00",
    updatedAt: "2024-01-01 00:00:00",
    ...overrides,
  } as BridgeGame;
}

function mockDb(boardRows: unknown[]): Db {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue(boardRows),
    }),
  } as unknown as Db;
}

describe("generateUsebio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps NS/EW directions and every outcome/lead fallback branch", async () => {
    vi.mocked(findPairs).mockResolvedValue([
      {
        initialSeat: "A1NS",
        player1: { firstName: "A", lastName: "B" },
        player2: { firstName: "C", lastName: "D" },
      },
      {
        initialSeat: "A1EW",
        player1: { firstName: "E", lastName: "F" },
        player2: { firstName: "G", lastName: "H" },
      },
    ] as any);

    const db = mockDb([
      // director override wins over confirmed; lead present.
      {
        tableNumber: 1,
        boardNumber: 1,
        roundNumber: 1,
        ns: "A1NS",
        ew: "A1EW",
        status: "OVERRIDDEN",
        confirmedResult: "3NTN=",
        directorOverrideResult: "AVE",
        confirmedLead: "SA",
      },
      // no override -> falls through to confirmedResult; lead null (?? null).
      {
        tableNumber: 1,
        boardNumber: 2,
        roundNumber: 1,
        ns: "A1NS",
        ew: "A1EW",
        status: "CONFIRMED",
        confirmedResult: "4HE+1",
        directorOverrideResult: null,
        confirmedLead: null,
      },
      // NOT_PLAYED, no results -> outcome falls all the way to "NP".
      {
        tableNumber: 1,
        boardNumber: 3,
        roundNumber: 1,
        ns: "A1NS",
        ew: "A1EW",
        status: "NOT_PLAYED",
        confirmedResult: null,
        directorOverrideResult: null,
        confirmedLead: null,
      },
      // Filtered out: no confirmedResult and not NOT_PLAYED.
      {
        tableNumber: 1,
        boardNumber: 4,
        roundNumber: 1,
        ns: "A1NS",
        ew: "A1EW",
        status: "PENDING_CONFIRMATION",
        confirmedResult: null,
        directorOverrideResult: null,
        confirmedLead: null,
      },
    ]);

    await generateUsebio(db, makeGame(), club);

    const data = vi.mocked(generateUsebioXml).mock.calls[0][0];

    // Direction ternary: NS -> "N", EW -> "E".
    expect(data.pairs.map((p) => p.direction)).toEqual(["N", "E"]);
    expect(data.sectionName).toBe("A");

    // Only 3 of 4 boards pass the filter.
    expect(data.boardResults).toHaveLength(3);
    // Override beats confirmed.
    expect(data.boardResults[0].outcome).toBe("AVE");
    expect(data.boardResults[0].lead).toBe("SA");
    // Confirmed used when no override; lead defaults to null.
    expect(data.boardResults[1].outcome).toBe("4HE+1");
    expect(data.boardResults[1].lead).toBeNull();
    // No result at all -> "NP".
    expect(data.boardResults[2].outcome).toBe("NP");
    // Distinct board numbers among included rows (1,2,3) plus the filtered 4.
    expect(data.boards).toBe(4);
  });

  it("defaults sectionName to 'A' when the game has none", async () => {
    vi.mocked(findPairs).mockResolvedValue([]);
    const db = mockDb([]);

    await generateUsebio(db, makeGame({ sectionName: "" }), club);

    const data = vi.mocked(generateUsebioXml).mock.calls[0][0];
    expect(data.sectionName).toBe("A");
    expect(data.pairs).toHaveLength(0);
    expect(data.boardResults).toHaveLength(0);
    expect(data.boards).toBe(0);
  });
});
