import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- mocks for the movements DB layer used by rehydration ----

vi.mock("@/db/movements/queries/get-movement", () => ({
  getPairMovement: vi.fn(),
}));

vi.mock("@/db/movements/queries/get-movement-spec", () => ({
  getPairMovementSpecById: vi.fn(),
}));

import { getPairMovement } from "@/db/movements/queries/get-movement";
import { getPairMovementSpecById } from "@/db/movements/queries/get-movement-spec";
import { resolveSectionStart } from "./start-game-service";
import { PairSeat } from "@/model/participants";

function seatsForTables(tables: number, section = "A"): PairSeat[] {
  const seats: PairSeat[] = [];
  for (let t = 1; t <= tables; t++) {
    seats.push(`${section}${t}NS`, `${section}${t}EW`);
  }
  return seats;
}

function isSitOut(round: { sitOut?: boolean }): boolean {
  return round.sitOut === true;
}

describe("resolveSectionStart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns NO_MOVEMENT_SELECTED when nothing is selected", async () => {
    const result = await resolveSectionStart("A", null, ["A1NS", "A1EW"], "g1");
    expect(result.validation.canStart).toBe(false);
    expect(result.movement).toBeNull();
    expect(result.validation.problems.map((p) => p.code)).toContain(
      "NO_MOVEMENT_SELECTED",
    );
  });

  it("resolves a fully-seated Mitchell without a sit-out", async () => {
    const result = await resolveSectionStart(
      "A",
      {
        source: "MITCHELL",
        mitchell: { tables: 5, rounds: 5, boardsPerRound: 3 },
      },
      seatsForTables(5),
      "g1",
    );

    expect(result.validation.canStart).toBe(true);
    expect(result.validation.sitOutSeat).toBeNull();
    expect(result.movement).not.toBeNull();
    const anySitOut = result.movement!.some((t) => t.rounds.some(isSitOut));
    expect(anySitOut).toBe(false);
  });

  it("resolves a one-short Mitchell with a sit-out applied", async () => {
    const seated = seatsForTables(5).filter((s) => s !== "A3EW");

    const result = await resolveSectionStart(
      "A",
      {
        source: "MITCHELL",
        mitchell: { tables: 5, rounds: 5, boardsPerRound: 3 },
      },
      seated,
      "g1",
    );

    expect(result.validation.canStart).toBe(true);
    expect(result.validation.sitOutSeat).toBe("A3EW");
    // Exactly one sit-out per round => 5 flagged rounds total.
    const sitOutTotal = result
      .movement!.flatMap((t) => t.rounds)
      .filter(isSitOut).length;
    expect(sitOutTotal).toBe(5);
  });

  it("resolves a non-A section with a sit-out qualified to that section", async () => {
    const seated = seatsForTables(5, "B").filter((s) => s !== "B3EW");

    const result = await resolveSectionStart(
      "B",
      {
        source: "MITCHELL",
        mitchell: { tables: 5, rounds: 5, boardsPerRound: 3 },
      },
      seated,
      "g1",
    );

    expect(result.validation.canStart).toBe(true);
    expect(result.validation.sitOutSeat).toBe("B3EW");
  });

  it("rejects a Mitchell that is two pairs short", async () => {
    const seated = seatsForTables(5).filter(
      (s) => s !== "A4NS" && s !== "A4EW" && s !== "A5NS",
    );

    const result = await resolveSectionStart(
      "A",
      {
        source: "MITCHELL",
        mitchell: { tables: 5, rounds: 5, boardsPerRound: 3 },
      },
      seated,
      "g1",
    );

    expect(result.validation.canStart).toBe(false);
    expect(result.movement).toBeNull();
    expect(result.validation.problems.map((p) => p.code)).toContain(
      "MULTIPLE_EMPTY_POSITIONS",
    );
  });

  it("resolves a database spec with no missing pair (introduces a phantom)", async () => {
    vi.mocked(getPairMovement).mockResolvedValue([
      {
        id: 1,
        movementId: 0,
        tableNumber: 1,
        rounds: [
          { id: 0, tableId: 1, roundNumber: 1, ns: "1", ew: "4", boardSet: 1 },
          { id: 0, tableId: 1, roundNumber: 2, ns: "1", ew: "6", boardSet: 2 },
          { id: 0, tableId: 1, roundNumber: 3, ns: "1", ew: "5", boardSet: 3 },
        ],
      },
      {
        id: 2,
        movementId: 0,
        tableNumber: 2,
        rounds: [
          { id: 0, tableId: 2, roundNumber: 1, ns: "2", ew: "5", boardSet: 1 },
          { id: 0, tableId: 2, roundNumber: 2, ns: "2", ew: "4", boardSet: 2 },
          { id: 0, tableId: 2, roundNumber: 3, ns: "2", ew: "6", boardSet: 3 },
        ],
      },
      {
        id: 3,
        movementId: 0,
        tableNumber: 3,
        rounds: [
          { id: 0, tableId: 3, roundNumber: 1, ns: "3", ew: "6", boardSet: 1 },
          { id: 0, tableId: 3, roundNumber: 2, ns: "3", ew: "5", boardSet: 2 },
          { id: 0, tableId: 3, roundNumber: 3, ns: "3", ew: "4", boardSet: 3 },
        ],
      },
    ] as any);
    vi.mocked(getPairMovementSpecById).mockResolvedValue({
      id: 10,
      missingPair: null,
    } as any);

    const seated = seatsForTables(3).filter((s) => s !== "A3EW");

    const result = await resolveSectionStart(
      "A",
      { source: "SPEC", specId: 10, boardsPerRound: 2 },
      seated,
      "g1",
    );

    expect(result.validation.canStart).toBe(true);
    expect(result.validation.sitOutSeat).toBe("A3EW");
    for (let r = 0; r < 3; r++) {
      const sitOuts = result.movement!.filter((t) =>
        isSitOut(t.rounds[r]),
      ).length;
      expect(sitOuts).toBe(1);
    }
  });

  it("resolves a database spec WITH a built-in missing pair (aligns the phantom)", async () => {
    // Same 3-table movement, but pair 6 (round-1 EW at table 3) is the built-in
    // phantom. deriveExpectedSeats drops A3EW, so seating everyone else makes it
    // startable with A3EW as the sit-out — driving alignSpecMissingPair.
    vi.mocked(getPairMovement).mockResolvedValue([
      {
        id: 1,
        movementId: 0,
        tableNumber: 1,
        rounds: [
          { id: 0, tableId: 1, roundNumber: 1, ns: "1", ew: "4", boardSet: 1 },
          { id: 0, tableId: 1, roundNumber: 2, ns: "1", ew: "6", boardSet: 2 },
          { id: 0, tableId: 1, roundNumber: 3, ns: "1", ew: "5", boardSet: 3 },
        ],
      },
      {
        id: 2,
        movementId: 0,
        tableNumber: 2,
        rounds: [
          { id: 0, tableId: 2, roundNumber: 1, ns: "2", ew: "5", boardSet: 1 },
          { id: 0, tableId: 2, roundNumber: 2, ns: "2", ew: "4", boardSet: 2 },
          { id: 0, tableId: 2, roundNumber: 3, ns: "2", ew: "6", boardSet: 3 },
        ],
      },
      {
        id: 3,
        movementId: 0,
        tableNumber: 3,
        rounds: [
          { id: 0, tableId: 3, roundNumber: 1, ns: "3", ew: "6", boardSet: 1 },
          { id: 0, tableId: 3, roundNumber: 2, ns: "3", ew: "5", boardSet: 2 },
          { id: 0, tableId: 3, roundNumber: 3, ns: "3", ew: "4", boardSet: 3 },
        ],
      },
    ] as any);
    vi.mocked(getPairMovementSpecById).mockResolvedValue({
      id: 11,
      missingPair: 6,
    } as any);

    // A3EW is the built-in phantom (excluded from expected seats). Leave one
    // real expected seat empty (A1EW) so validation yields exactly one missing
    // seat -> a sit-out -> alignSpecMissingPair runs to align the phantom.
    const seated = seatsForTables(3).filter(
      (s) => s !== "A3EW" && s !== "A1EW",
    );

    const result = await resolveSectionStart(
      "A",
      { source: "SPEC", specId: 11, boardsPerRound: 2 },
      seated,
      "g1",
    );

    expect(result.validation.canStart).toBe(true);
    expect(result.validation.sitOutSeat).toBe("A1EW");
    expect(result.movement).not.toBeNull();
    // The phantom (pair 6) sits out exactly one round at each involved table.
    const sitOutTotal = result
      .movement!.flatMap((t) => t.rounds)
      .filter(isSitOut).length;
    expect(sitOutTotal).toBeGreaterThan(0);
  });

  it("throws when a sit-out is required for a non-Standard Mitchell variant", async () => {
    // A Skip Mitchell is not Standard, so isStandardMitchell is false. Seating
    // it one pair short forces validation to yield a sitOutSeat, which routes
    // into applySitOut and hits the guard throw.
    const seated = seatsForTables(6).filter((s) => s !== "A3EW");

    await expect(
      resolveSectionStart(
        "A",
        {
          source: "MITCHELL",
          mitchell: { tables: 6, rounds: 5, boardsPerRound: 3, skip: true },
        },
        seated,
        "g1",
      ),
    ).rejects.toThrow(
      "Sit-out handling is only supported for Standard Mitchell movements.",
    );
  });

  it("applies a Swiss round-1 bye when the empty seat is an NS seat (bye pair is the EW pair)", async () => {
    // 2-table Swiss with A2NS empty => 3 pairs => a bye. The empty seat is NS,
    // so the bye pair is the one sitting the OTHER direction (EW) at that table:
    // home seat "2EW". This drives the `direction === "NS" ? round.ew : ...`
    // branch of applySwissRoundOneSitOut.
    const seated = seatsForTables(2).filter((s) => s !== "A2NS");

    const result = await resolveSectionStart(
      "A",
      { source: "SWISS", swiss: { tables: 2, rounds: 5, boardsPerRound: 3 } },
      seated,
      "g1",
    );

    expect(result.validation.canStart).toBe(true);
    expect(result.validation.sitOutSeat).toBe("A2NS");

    const sitOutTable = result.movement!.find((t) => isSitOut(t.rounds[0]))!;
    expect(sitOutTable.rounds[0].ns).toBe("2EW");
    expect(sitOutTable.rounds[0].ew).toBe("PHANTOM");
  });

  it("resolves a fully-seated Swiss Teams and materializes round 1 as two tables per match", async () => {
    const result = await resolveSectionStart(
      "A",
      {
        source: "SWISS_TEAMS",
        swissTeams: { teams: 4, rounds: 5, boardsPerRound: 6 },
      },
      seatsForTables(4),
      "g1",
    );

    expect(result.validation.canStart).toBe(true);
    expect(result.movement).not.toBeNull();

    // Four teams => two matches => four tables, each with round 1 only.
    expect(
      result.movement!.map((t) => t.tableNumber).sort((a, b) => a - b),
    ).toEqual([1, 2, 3, 4]);
    for (const table of result.movement!) {
      expect(table.rounds).toHaveLength(1);
      expect(table.rounds[0].roundNumber).toBe(1);
      // Round 1 plays boards 1..6.
      expect(table.rounds[0].boardStart).toBe(1);
      expect(table.rounds[0].boardEnd).toBe(6);
      // Each table hosts a home NS pair and an away EW pair from another table.
      expect(table.rounds[0].ns).toMatch(/NS$/);
      expect(table.rounds[0].ew).toMatch(/EW$/);
    }
  });

  it("blocks a Swiss Teams start with an odd team count", async () => {
    const result = await resolveSectionStart(
      "A",
      {
        source: "SWISS_TEAMS",
        swissTeams: { teams: 3, rounds: 5, boardsPerRound: 6 },
      },
      seatsForTables(3),
      "g1",
    );

    expect(result.validation.canStart).toBe(false);
    expect(result.movement).toBeNull();
    expect(result.validation.problems.map((p) => p.code)).toContain(
      "ODD_TEAM_COUNT",
    );
  });

  it("blocks a Swiss Teams start when a table is one pair short (no half teams)", async () => {
    const seated = seatsForTables(4).filter((s) => s !== "A3EW");

    const result = await resolveSectionStart(
      "A",
      {
        source: "SWISS_TEAMS",
        swissTeams: { teams: 4, rounds: 5, boardsPerRound: 6 },
      },
      seated,
      "g1",
    );

    expect(result.validation.canStart).toBe(false);
    expect(result.movement).toBeNull();
    expect(result.validation.problems.map((p) => p.code)).toContain(
      "TEAMS_SIT_OUT_NOT_ALLOWED",
    );
  });

  it("draws round 1 deterministically for a given game+section", async () => {
    const spec = {
      source: "SWISS_TEAMS" as const,
      swissTeams: { teams: 6, rounds: 5, boardsPerRound: 6 },
    };
    const a = await resolveSectionStart("A", spec, seatsForTables(6), "g1");
    const b = await resolveSectionStart("A", spec, seatsForTables(6), "g1");
    expect(a.movement).toEqual(b.movement);
  });

  it("resolves a fully-seated Round Robin Teams and materializes ALL rounds", async () => {
    const teams = 6;
    const rounds = 5; // a full round robin of 6 teams
    const result = await resolveSectionStart(
      "A",
      {
        source: "ROUND_ROBIN_TEAMS",
        roundRobinTeams: { teams, rounds, boardsPerRound: 4 },
      },
      seatsForTables(teams),
      "g1",
    );

    expect(result.validation.canStart).toBe(true);
    expect(result.movement).not.toBeNull();

    // Six teams => six physical tables, each carrying every round (unlike Swiss
    // Teams, which materializes only round 1 at start).
    expect(
      result.movement!.map((t) => t.tableNumber).sort((a, b) => a - b),
    ).toEqual([1, 2, 3, 4, 5, 6]);
    for (const table of result.movement!) {
      expect(table.rounds.map((r) => r.roundNumber)).toEqual([1, 2, 3, 4, 5]);
      for (const round of table.rounds) {
        expect(round.boardStart).toBe((round.roundNumber - 1) * 4 + 1);
        expect(round.boardEnd).toBe(round.roundNumber * 4);
        expect(round.ns).toMatch(/NS$/);
        expect(round.ew).toMatch(/EW$/);
      }
    }
  });

  it("blocks a Round Robin Teams start with an odd team count", async () => {
    const result = await resolveSectionStart(
      "A",
      {
        source: "ROUND_ROBIN_TEAMS",
        roundRobinTeams: { teams: 5, rounds: 4, boardsPerRound: 4 },
      },
      seatsForTables(5),
      "g1",
    );

    expect(result.validation.canStart).toBe(false);
    expect(result.movement).toBeNull();
    expect(result.validation.problems.map((p) => p.code)).toContain(
      "ODD_TEAM_COUNT",
    );
  });

  it("blocks a Round Robin Teams start when a table is one pair short", async () => {
    const seated = seatsForTables(6).filter((s) => s !== "A3EW");

    const result = await resolveSectionStart(
      "A",
      {
        source: "ROUND_ROBIN_TEAMS",
        roundRobinTeams: { teams: 6, rounds: 5, boardsPerRound: 4 },
      },
      seated,
      "g1",
    );

    expect(result.validation.canStart).toBe(false);
    expect(result.movement).toBeNull();
    expect(result.validation.problems.map((p) => p.code)).toContain(
      "TEAMS_SIT_OUT_NOT_ALLOWED",
    );
  });

  it("materializes a shortened Round Robin Teams (fewer than a full robin)", async () => {
    const result = await resolveSectionStart(
      "A",
      {
        source: "ROUND_ROBIN_TEAMS",
        roundRobinTeams: { teams: 6, rounds: 3, boardsPerRound: 4 },
      },
      seatsForTables(6),
      "g1",
    );

    expect(result.validation.canStart).toBe(true);
    for (const table of result.movement!) {
      expect(table.rounds.map((r) => r.roundNumber)).toEqual([1, 2, 3]);
    }
  });
});
