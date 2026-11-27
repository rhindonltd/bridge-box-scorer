// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { and, eq } from "drizzle-orm";
import type { BoardOutcome } from "@/model/score";
import { impVpWinner } from "@/modules/scoring";

// A Teams game on a head-to-head scored by IMP (Victory Points).
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({
    gameId: "g",
    gameType: "TEAMS",
    scoringType: "IMP_VP",
    selectedMovement: JSON.stringify({
      source: "HEAD_TO_HEAD_TEAMS",
      headToHeadTeams: { boardsPerRound: 2 },
    }),
  })),
}));

let tmpDir: string;
let gameId: string;

describe("Head-to-head leaderboard", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "leaderboard-h2h-"));
    process.env.DATABASE_GAMES_URL = tmpDir;
    gameId = `game-${Math.random().toString(16).slice(2)}`;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("works out the Victory Points on both stanzas' IMPs together", async () => {
    const games = await import("@/db/games");
    const create = await import("@/db/games/actions/create-game");
    await create.createGameDb(gameId);
    const db = await games.getDb(gameId);
    if (!db) throw new Error("db not created");
    const { describeMovement } =
      await import("@/modules/movement-catalog/server");
    const { planMovement } = await import("@/modules/movement-catalog");
    const { buildSectionRows, insertSectionDrafts } =
      await import("./materialize-movement");
    const { boards } = await import("@/db/games/tables/boards");
    const { computeLeaderboard } = await import("./leaderboard-service");

    const plan = planMovement(
      await describeMovement({
        source: "HEAD_TO_HEAD_TEAMS",
        headToHeadTeams: { boardsPerRound: 2 },
      }),
      { sitOutSeat: null },
    );
    const { boardRows, matchRows } = buildSectionRows("A", plan);
    insertSectionDrafts(db, matchRows, boardRows);

    // Each board's result in team 1's home room (table 1) and team 2's home
    // room (table 2), both from North/South.
    const results: Record<number, [BoardOutcome, BoardOutcome]> = {
      // Stanza 1: team 1 gains 6 IMPs (+420 v +170) and halves board 2.
      1: ["4SN=", "3SN+1"],
      2: ["3NTN=", "3NTN="],
      // Stanza 2: team 2 gains 1 IMP on each board (+420 v +400, +620 v +600).
      3: ["3NTN=", "4SN="],
      4: ["3NTN=", "4SN="],
    } as never;
    for (const [board, [table1, table2]] of Object.entries(results)) {
      for (const [table, result] of [
        [1, table1],
        [2, table2],
      ] as const) {
        db.update(boards)
          .set({ confirmedResult: result, status: "CONFIRMED" })
          .where(
            and(
              eq(boards.tableNumber, table),
              eq(boards.boardNumber, Number(board)),
            ),
          )
          .run();
      }
    }

    const result = await computeLeaderboard(db, gameId);
    const lines = result.overallScore.lines as {
      teamId: string;
      totalVP: number;
    }[];
    const team1 = lines.find((l) => l.teamId === "A1NS")!;
    const team2 = lines.find((l) => l.teamId === "A2NS")!;
    // One match: team 1 wins by 6 − 2 = 4 IMPs over 4 boards.
    const winner = impVpWinner(4, 4, 20);
    expect(team1.totalVP).toBe(winner);
    expect(team2.totalVP).toBe(20 - winner);
    // Not the two stanzas' VPs added up.
    const byStanza = impVpWinner(6, 2, 20) + (20 - impVpWinner(2, 2, 20));
    expect(byStanza).not.toBe(winner);
  });
});
