import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));

import { getDb } from "@/db/games";
import { createPairWithPlayers } from "./create-pair-with-players";

/**
 * Stub a db whose `transaction(cb)` runs the callback synchronously against a
 * recording tx. Insert chains support the two shapes the action uses:
 *   - players: `.values().returning().get()` (returns a generated id)
 *   - participants: `.values().run()`
 *   - teams: `.values().onConflictDoUpdate().run()`
 */
function stubDb() {
  const inserts: any[] = [];
  let nextId = 1;

  const tx = {
    insert: () => ({
      values: (values: any) => {
        inserts.push(values);
        const id = nextId++;
        return {
          returning: () => ({ get: () => ({ id }) }),
          run: vi.fn(),
          onConflictDoUpdate: () => ({ run: vi.fn() }),
        };
      },
    }),
  };

  const transaction = vi.fn((cb: (t: typeof tx) => void) => cb(tx));
  return { db: { transaction }, inserts, transaction };
}

/** Find the teams-table insert (values carry teamId + teamName), if any. */
const teamInsert = (inserts: any[]) =>
  inserts.find((v) => "teamId" in v && "teamName" in v);

const player = (lastName: string) =>
  ({ firstName: "X", lastName, nationalId: null }) as any;

describe("createPairWithPlayers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(null as never);

    await expect(
      createPairWithPlayers("g1", {
        initialSeat: "A1NS",
        player1: player("North"),
        player2: player("South"),
        secretKey: "sk",
      }),
    ).rejects.toThrow("Game db does not exist");
  });

  it("inserts two players and a participant, and upserts a team for a named NS pair", async () => {
    const { db, inserts, transaction } = stubDb();
    vi.mocked(getDb).mockResolvedValue(db as never);

    await createPairWithPlayers("g1", {
      initialSeat: "A1NS",
      player1: player("North"),
      player2: player("South"),
      secretKey: "sk",
      teamName: "  The Aces  ",
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    const team = teamInsert(inserts);
    expect(team).toBeDefined();
    // Team name is trimmed before storing.
    expect(team.teamName).toBe("The Aces");
  });

  it("writes no team row when the NS pair's name is blank", async () => {
    const { db, inserts } = stubDb();
    vi.mocked(getDb).mockResolvedValue(db as never);

    await createPairWithPlayers("g1", {
      initialSeat: "A1NS",
      player1: player("North"),
      player2: player("South"),
      secretKey: "sk",
      teamName: "   ",
    });

    expect(teamInsert(inserts)).toBeUndefined();
  });

  it("ignores a team name passed for a non-NS (EW) seat", async () => {
    const { db, inserts } = stubDb();
    vi.mocked(getDb).mockResolvedValue(db as never);

    await createPairWithPlayers("g1", {
      initialSeat: "A1EW",
      player1: player("East"),
      player2: player("West"),
      secretKey: "sk",
      teamName: "Should Be Ignored",
    });

    expect(teamInsert(inserts)).toBeUndefined();
  });
});
