// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Db } from "@/db/games";
const mockFindTeams = vi.fn();
const mockReadOccupancies = vi.fn();
vi.mock("@/db/games/queries/find-teams", () => ({
  findTeams: (...a: unknown[]) => mockFindTeams(...a),
}));
vi.mock("@/db/games/queries/seat-occupancy", () => ({
  readSeatOccupancies: (...a: unknown[]) => mockReadOccupancies(...a),
}));
import { findTeamsRoster } from "./find-teams-roster";
/**
 * Defensive paths of findTeamsRoster that a real database never produces
 * (every derived team has occupancies and a non-null standing), exercised with
 * the team and occupancy readers stubbed.
 */
const db = {
  select: () => ({
    from: () => Promise.resolve([{ id: 1, firstName: "A", lastName: "B" }]),
  }),
} as unknown as Db;
function team(pair1: Record<string, unknown>) {
  return {
    type: "TEAM",
    id: "A1NS",
    name: "Smith",
    pair1: { initialSeat: "A1NS", ...pair1 },
    pair2: { initialSeat: "A1EW" },
  };
}
describe("findTeamsRoster (stubbed readers)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadOccupancies.mockResolvedValue([]);
  });
  it("reports seats with no occupancy as empty and treats a missing standing as active", async () => {
    mockFindTeams.mockResolvedValue([team({ standing: undefined })]);
    const [entry] = await findTeamsRoster(db);
    expect(entry.status).toBe("ACTIVE");
    expect(entry.seats.map((s) => s.occupants)).toEqual([[], []]);
    expect(entry.pairsUsed).toBe(0);
  });
  it("counts the boards an occupant played, or none when it covers every board", async () => {
    mockFindTeams.mockResolvedValue([team({ standing: "ACTIVE" })]);
    mockReadOccupancies.mockResolvedValue([
      { id: 2, seat: "A1NS", player1: 1, player2: 1, boards: [4, 5, 6] },
      { id: 1, seat: "A1EW", player1: 1, player2: 1, boards: null },
    ]);
    const [entry] = await findTeamsRoster(db);
    expect(entry.seats[0].occupants).toEqual([
      { pair: "A B & A B", boardCount: 3 },
    ]);
    expect(entry.seats[1].occupants[0].boardCount).toBeNull();
    expect(entry.pairsUsed).toBe(2);
  });
  it.each(["WITHDRAWN", "LATE"])(
    "leaves round and treatment null for a %s team that recorded neither",
    async (standing) => {
      mockFindTeams.mockResolvedValue([
        team({
          standing,
          withdrawnInRound: undefined,
          withdrawalTreatment: undefined,
        }),
      ]);
      const [entry] = await findTeamsRoster(db);
      expect(entry).toMatchObject({
        status: standing,
        round: null,
        treatment: null,
      });
    },
  );
  it("reports the round and treatment a withdrawn team recorded", async () => {
    mockFindTeams.mockResolvedValue([
      team({
        standing: "WITHDRAWN",
        withdrawnInRound: 3,
        withdrawalTreatment: "REMOVE",
      }),
    ]);
    const [entry] = await findTeamsRoster(db);
    expect(entry).toMatchObject({ round: 3, treatment: "REMOVE" });
  });
});
