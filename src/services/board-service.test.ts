import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/games/tables/boards", () => ({
  boards: {
    boardNumber: "boardNumber",
    section: "section",
    roundNumber: "roundNumber",
    tableNumber: "tableNumber",
    ns: "ns",
    ew: "ew",
    confirmedResult: "confirmedResult",
    directorOverrideResult: "directorOverrideResult",
    status: "status",
  },
}));

vi.mock("@/db/games/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/db/games/queries/find-teams", () => ({
  findTeams: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
}));

import { Db, getDb as getPairsDb } from "@/db/games";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findTeams } from "@/db/games/queries/find-teams";
import { getBoardInstances, buildTeamTravellerMatches } from "./board-service";

describe("board-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBoardInstances (PAIRS)", () => {
    it("returns instances with participant names and current result", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                roundNumber: 1,
                tableNumber: 1,
                boardNumber: 7,
                ns: "1NS",
                ew: "2EW",
                confirmedResult: "3NTN=",
                directorOverrideResult: null,
                status: "CONFIRMED",
              },
              {
                roundNumber: 2,
                tableNumber: 3,
                boardNumber: 7,
                ns: "3NS",
                ew: "1NS",
                confirmedResult: null,
                directorOverrideResult: null,
                status: "NOT_PLAYED",
              },
            ]),
          }),
        }),
      } as unknown as Db;
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      vi.mocked(findPairs).mockResolvedValue([
        {
          initialSeat: "1NS",
          type: "PAIR",
          player1: {
            id: 1,
            firstName: "Alice",
            lastName: "Smith",
            nationalId: null,
          },
          player2: {
            id: 2,
            firstName: "Bob",
            lastName: "Jones",
            nationalId: null,
          },
        },
        {
          initialSeat: "2EW",
          type: "PAIR",
          player1: {
            id: 3,
            firstName: "Carol",
            lastName: "Brown",
            nationalId: null,
          },
          player2: {
            id: 4,
            firstName: "Dave",
            lastName: "Wilson",
            nationalId: null,
          },
        },
        {
          initialSeat: "3NS",
          type: "PAIR",
          player1: {
            id: 5,
            firstName: "Eve",
            lastName: "Green",
            nationalId: null,
          },
          player2: {
            id: 6,
            firstName: "Frank",
            lastName: "White",
            nationalId: null,
          },
        },
      ] as any);

      const result = await getBoardInstances(mockDb, 7);

      expect(result).toHaveLength(2);
      expect(result[0].currentResult).toBe("3NTN=");
      expect(result[0].participants.type).toBe("PAIRS");
      if (result[0].participants.type === "PAIRS") {
        expect(result[0].participants.nsNames).toBe("Alice Smith & Bob Jones");
        expect(result[0].participants.ewNames).toBe(
          "Carol Brown & Dave Wilson",
        );
      }
      expect(result[1].currentResult).toBeNull();
      if (result[1].participants.type === "PAIRS") {
        expect(result[1].participants.nsNames).toBe("Eve Green & Frank White");
      }
    });

    it("uses director override when available", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                roundNumber: 1,
                tableNumber: 1,
                boardNumber: 5,
                ns: "1NS",
                ew: "2EW",
                confirmedResult: "3NTN=",
                directorOverrideResult: "3NTN+1",
                status: "OVERRIDDEN",
              },
            ]),
          }),
        }),
      } as unknown as Db;
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      vi.mocked(findPairs).mockResolvedValue([]);

      const result = await getBoardInstances(mockDb, 5);

      expect(result[0].currentResult).toBe("3NTN+1");
    });

    it("returns null names when pair not found in lookup", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                roundNumber: 1,
                tableNumber: 1,
                boardNumber: 1,
                ns: "99NS",
                ew: "88EW",
                confirmedResult: null,
                directorOverrideResult: null,
                status: "NOT_PLAYED",
              },
            ]),
          }),
        }),
      } as unknown as Db;
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      vi.mocked(findPairs).mockResolvedValue([]);

      const result = await getBoardInstances(mockDb, 1);

      expect(result[0].participants.type).toBe("PAIRS");
      if (result[0].participants.type === "PAIRS") {
        expect(result[0].participants.nsNames).toBeNull();
        expect(result[0].participants.ewNames).toBeNull();
      }
    });

    it("returns null status when board status is null (line 38)", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                roundNumber: 1,
                tableNumber: 1,
                boardNumber: 1,
                ns: "1NS",
                ew: "2EW",
                confirmedResult: null,
                directorOverrideResult: null,
                status: null,
              },
            ]),
          }),
        }),
      } as unknown as Db;
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      vi.mocked(findPairs).mockResolvedValue([
        {
          initialSeat: "1NS",
          type: "PAIR",
          player1: {
            id: 1,
            firstName: "Alice",
            lastName: "Smith",
            nationalId: null,
          },
          player2: {
            id: 2,
            firstName: "Bob",
            lastName: "Jones",
            nationalId: null,
          },
        },
        {
          initialSeat: "2EW",
          type: "PAIR",
          player1: {
            id: 3,
            firstName: "Carol",
            lastName: "Brown",
            nationalId: null,
          },
          player2: {
            id: 4,
            firstName: "Dave",
            lastName: "Wilson",
            nationalId: null,
          },
        },
      ] as any);

      const result = await getBoardInstances(mockDb, 1);

      expect(result[0].currentResult).toBeNull();
      expect(result[0].status).toBeNull();
    });

    it("excludes SIT_OUT (bye) and HALF_AVERAGE (half-match compensation) rows", async () => {
      // Board 3 as seen on a "2 half matches" round: a real anchor-vs-opponent
      // line, a bye row, and a compensation row (phantom opponent). Only the
      // real line belongs on the traveller.
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                roundNumber: 2,
                tableNumber: 1,
                boardNumber: 3,
                ns: "1NS",
                ew: "2NS",
                confirmedResult: "3NTN=",
                directorOverrideResult: null,
                status: "CONFIRMED",
              },
              {
                roundNumber: 2,
                tableNumber: 7,
                boardNumber: 3,
                ns: "2EW",
                ew: "PHANTOM",
                confirmedResult: null,
                directorOverrideResult: null,
                status: "HALF_AVERAGE",
              },
              {
                roundNumber: 2,
                tableNumber: 8,
                boardNumber: 3,
                ns: "3NS",
                ew: "PHANTOM",
                confirmedResult: null,
                directorOverrideResult: null,
                status: "SIT_OUT",
              },
            ]),
          }),
        }),
      } as unknown as Db;
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);
      vi.mocked(findPairs).mockResolvedValue([]);

      const result = await getBoardInstances(mockDb, 3);

      // Only the real played line survives; the phantom rows are filtered out.
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("CONFIRMED");
      if (result[0].participants.type === "PAIRS") {
        expect(result[0].participants.ew).not.toBe("PHANTOM");
      }
    });
  });

  describe("buildTeamTravellerMatches", () => {
    /** A mock db whose object-arg `select().from().where()` resolves to rows. */
    function dbWithRows(rows: unknown[]): Db {
      return {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(rows),
          }),
        }),
      } as unknown as Db;
    }

    it("groups a board's two rooms into one team match with names and margin", async () => {
      // Board 5, round 1: team 1 (home table 1) v team 2 (home table 2).
      //  - open room at table 1: A1NS (home team 1) vs A2EW, 4H by N making = +620
      //  - closed room at table 2: A2NS (home team 2) vs A1EW, 3NT by N making = +400
      const db = dbWithRows([
        {
          section: "A",
          roundNumber: 1,
          tableNumber: 1,
          boardNumber: 5,
          ns: "A1NS",
          ew: "A2EW",
          confirmedResult: "4HN=",
          directorOverrideResult: null,
          status: "CONFIRMED",
        },
        {
          section: "A",
          roundNumber: 1,
          tableNumber: 2,
          boardNumber: 5,
          ns: "A2NS",
          ew: "A1EW",
          confirmedResult: "3NTN=",
          directorOverrideResult: null,
          status: "CONFIRMED",
        },
      ]);

      vi.mocked(findTeams).mockResolvedValue([
        { type: "TEAM", id: "A1NS", name: "Sharks" } as any,
        { type: "TEAM", id: "A2NS", name: "Owls" } as any,
      ]);

      const matches = await buildTeamTravellerMatches(db, 5);

      expect(matches).toHaveLength(1);
      const m = matches[0];
      // Keyed on the lower table; both rooms present.
      expect(m.tables).toEqual([1, 2]);
      expect(m.teams).toEqual([
        { table: 1, id: "A1NS", name: "Sharks" },
        { table: 2, id: "A2NS", name: "Owls" },
      ]);
      // 620 − 400 = 220 → a positive IMP margin for the home team.
      expect(typeof m.margin).toBe("number");
      expect(m.margin).toBeGreaterThan(0);
    });

    it("reports a null margin when a room has no comparable result yet", async () => {
      const db = dbWithRows([
        {
          section: "A",
          roundNumber: 1,
          tableNumber: 1,
          boardNumber: 5,
          ns: "A1NS",
          ew: "A2EW",
          confirmedResult: "4HN=",
          directorOverrideResult: null,
          status: "CONFIRMED",
        },
        {
          section: "A",
          roundNumber: 1,
          tableNumber: 2,
          boardNumber: 5,
          ns: "A2NS",
          ew: "A1EW",
          confirmedResult: null,
          directorOverrideResult: null,
          status: "NOT_PLAYED",
        },
      ]);
      vi.mocked(findTeams).mockResolvedValue([]);

      const matches = await buildTeamTravellerMatches(db, 5);

      expect(matches).toHaveLength(1);
      expect(matches[0].margin).toBeNull();
      // Falls back to the raw team id when the team name isn't resolved.
      expect(matches[0].teams[0].name).toBe("A1NS");
    });

    it("frames a LONG triple comparison (two rooms on this board, two rounds) as one two-team card", async () => {
      // A long triple comparison x-y on set A board 5: the two rooms share the
      // board but sit in different rounds (x·NS v y in round R, y·NS v x in
      // R+1). It must still group into ONE two-team card, not two one-room ones.
      const db = dbWithRows([
        {
          section: "A",
          roundNumber: 1,
          tableNumber: 1,
          boardNumber: 5,
          ns: "A1NS",
          ew: "A2EW",
          confirmedResult: "4HN=",
          directorOverrideResult: null,
          status: "CONFIRMED",
        },
        {
          section: "A",
          roundNumber: 2,
          tableNumber: 2,
          boardNumber: 5,
          ns: "A2NS",
          ew: "A1EW",
          confirmedResult: "3NTN=",
          directorOverrideResult: null,
          status: "CONFIRMED",
        },
      ]);
      vi.mocked(findTeams).mockResolvedValue([
        { type: "TEAM", id: "A1NS", name: "Sharks" } as any,
        { type: "TEAM", id: "A2NS", name: "Owls" } as any,
      ]);

      const matches = await buildTeamTravellerMatches(db, 5);

      expect(matches).toHaveLength(1);
      expect(matches[0].tables).toEqual([1, 2]);
      expect(matches[0].teams.map((t) => t.name)).toEqual(["Sharks", "Owls"]);
      expect(matches[0].margin).toBeGreaterThan(0); // 620 − 400
    });

    it("frames each short-triple board set as its own two-team card", async () => {
      // Board 5 is a short triple's set A (comparison 1 v 2); its two mutual
      // rooms on this board form one two-team card. (Sets B/C live on other
      // boards, so only this comparison appears for board 5.)
      const db = dbWithRows([
        {
          section: "A",
          roundNumber: 1,
          tableNumber: 1,
          boardNumber: 5,
          ns: "A1NS",
          ew: "A2EW",
          confirmedResult: "4HN=",
          directorOverrideResult: null,
          status: "CONFIRMED",
        },
        {
          section: "A",
          roundNumber: 1,
          tableNumber: 2,
          boardNumber: 5,
          ns: "A2NS",
          ew: "A1EW",
          confirmedResult: "3NTN=",
          directorOverrideResult: null,
          status: "CONFIRMED",
        },
      ]);
      vi.mocked(findTeams).mockResolvedValue([]);

      const matches = await buildTeamTravellerMatches(db, 5);
      expect(matches).toHaveLength(1);
      expect(matches[0].tables).toEqual([1, 2]);
    });

    it("returns an empty array for a board with no rows", async () => {
      const db = dbWithRows([]);
      vi.mocked(findTeams).mockResolvedValue([]);
      expect(await buildTeamTravellerMatches(db, 9)).toEqual([]);
    });
  });
});
