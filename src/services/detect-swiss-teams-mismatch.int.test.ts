// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({
    gameId: "g",
    gameType: "TEAMS",
    scoringType: "IMP_VP",
    selectedMovement: JSON.stringify({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 6, rounds: 5, boardsPerRound: 1 },
    }),
  })),
}));

let tmpDir: string;
let gameId: string;

describe("detectSectionMismatches (Swiss TEAMS §3.5 detection)", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "teams-mismatch-"));
    process.env.DATABASE_GAMES_URL = tmpDir;
    gameId = `game-${Math.random().toString(16).slice(2)}`;
  });
  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  });

  /** 6-team Swiss Teams section with round 1 = {1,2},{3,4},{5,6}. */
  async function setup() {
    const { createGameDb } = await import("@/db/games/actions/create-game");
    const { setSectionMovement } = await import(
      "@/db/games/actions/set-section-movement"
    );
    const { materializeSwissTeamsRound } = await import(
      "@/services/materialize-swiss-teams-round"
    );
    await createGameDb(gameId, 6);
    await setSectionMovement(gameId, "A", {
      source: "SWISS_TEAMS",
      swissTeams: { teams: 6, rounds: 5, boardsPerRound: 1 },
    });
    await materializeSwissTeamsRound(gameId, "A", 1, 1, 5, [
      { a: 1, b: 2 },
      { a: 3, b: 4 },
      { a: 5, b: 6 },
    ]);
  }

  async function setRoundTable(
    round: number,
    table: number,
    result: BoardOutcome,
  ) {
    const games = await import("@/db/games");
    const { boards } = await import("@/db/games/tables/boards");
    const { and, eq } = await import("drizzle-orm");
    const db = (await games.getDb(gameId))!;
    await db
      .update(boards)
      .set({ confirmedResult: result, status: "CONFIRMED" })
      .where(and(eq(boards.roundNumber, round), eq(boards.tableNumber, table)));
  }

  /**
   * Round-1 spread (from the probe): team1=20, team6=20, team3=10, team4=10,
   * team2=0, team5=0. The CORRECT round-2 draw is 1v6, 2v3, 4v5.
   */
  async function scoreRound1Spread() {
    await setRoundTable(1, 1, "6NTN="); // team1 big winner
    await setRoundTable(1, 2, "1NTN=");
    await setRoundTable(1, 3, "3NTN="); // level
    await setRoundTable(1, 4, "3NTN=");
    await setRoundTable(1, 5, "1NTN=");
    await setRoundTable(1, 6, "6NTN="); // team6 big winner
  }

  async function materializeRound2(matches: { a: number; b: number }[]) {
    const { materializeSwissTeamsRound } = await import(
      "@/services/materialize-swiss-teams-round"
    );
    await materializeSwissTeamsRound(gameId, "A", 2, 1, 5, matches);
  }

  it("flags a teams candidate when a committed round differs from the correct draw", async () => {
    await setup();
    await scoreRound1Spread();

    // Correct draw is 1v6, 2v3, 4v5. Commit a WRONG round 2: 1v2, 3v6, 4v5 —
    // team 1 now plays team 2 (0 VP) when it should play team 6 (20 VP).
    await materializeRound2([
      { a: 1, b: 2 },
      { a: 3, b: 6 },
      { a: 4, b: 5 },
    ]);
    await setRoundTable(2, 1, "3NTN=");
    await setRoundTable(2, 2, "3NTN=");
    await setRoundTable(2, 3, "3NTN=");
    await setRoundTable(2, 4, "3NTN=");
    await setRoundTable(2, 5, "3NTN=");
    await setRoundTable(2, 6, "3NTN=");

    const { detectSectionMismatches } = await import(
      "@/services/detect-swiss-mismatch-service"
    );
    const candidates = await detectSectionMismatches(gameId, "A");

    expect(candidates.length).toBeGreaterThan(0);

    const t1 = candidates.find((c) => c.mismatchedId === 1);
    expect(t1).toBeDefined();
    expect(t1!.participantKind).toBe("TEAM");
    expect(t1!.roundNumber).toBe(2);
    expect(t1!.actualOpponent).toBe(2);
    expect(t1!.correctOpponent).toBe(6);
    expect(t1!.side).toBe("NS"); // the home team sits NS
    expect(t1!.boardNumber).toBe(2); // round 2, 1 board/round → board 2

    for (const c of candidates) {
      expect(c.actualOpponent).not.toBe(c.correctOpponent);
      expect(
        Math.abs(c.actualOpponentVp - c.correctOpponentVp),
      ).toBeGreaterThan(5);
    }
  });

  it("returns nothing when the committed round matches the correct draw", async () => {
    await setup();
    await scoreRound1Spread();
    // The correct draw.
    await materializeRound2([
      { a: 1, b: 6 },
      { a: 2, b: 3 },
      { a: 4, b: 5 },
    ]);
    for (let t = 1; t <= 6; t++) await setRoundTable(2, t, "3NTN=");

    const { detectSectionMismatches } = await import(
      "@/services/detect-swiss-mismatch-service"
    );
    expect(await detectSectionMismatches(gameId, "A")).toEqual([]);
  });
});
