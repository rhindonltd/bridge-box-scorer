// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";

// The game-index lookup only supplies the scoring type; mock it so this test
// stays focused on the per-game DB and real scoring.
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({
    gameId: "g",
    gameType: "PAIRS",
    scoringType: "MP",
  })),
}));

let tmpDir: string;
let gameId: string;

describe("section-aware leaderboard (real scoring)", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "leaderboard-"));
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

  async function setup() {
    const games = await import("@/db/games");
    const create = await import("@/db/games/actions/create-game");
    await create.createGameDb(gameId);
    const db = await games.getDb(gameId);
    if (!db) throw new Error("db not created");
    return db;
  }

  /**
   * Seat one NS pair and one EW pair in a section (section-qualified seats and
   * matching movement ids), then return their movement ids for board rows.
   */
  async function seatPair(
    db: any,
    section: string,
    table: number,
    nsPlayers: [string, string],
    ewPlayers: [string, string],
  ) {
    const { players } = await import("@/db/games/tables/players");
    const { participants } = await import("@/db/games/tables/participants");

    for (const [seatDir, names] of [
      ["NS", nsPlayers],
      ["EW", ewPlayers],
    ] as const) {
      const p1 = db
        .insert(players)
        .values({ firstName: names[0], lastName: "x" })
        .returning()
        .get();
      const p2 = db
        .insert(players)
        .values({ firstName: names[1], lastName: "y" })
        .returning()
        .get();
      db.insert(participants)
        .values({
          initialSeat: `${section}${table}${seatDir}`,
          player1: p1.id,
          player2: p2.id,
          secretKey: `${section}${table}${seatDir}`,
        })
        .run();
    }
  }

  it("produces separate per-section rankings and a pooled combined ranking", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { computeLeaderboard, computeSectionLeaderboards } = await import(
      "./leaderboard-service"
    );

    // Two sections, each with two pairs playing board 1. Section-qualified
    // movement ids: A -> A1/A2, B -> B1/B2.
    await seatPair(db, "A", 1, ["A-NS", "A-NS2"], ["A-EW", "A-EW2"]);
    await seatPair(db, "B", 1, ["B-NS", "B-NS2"], ["B-EW", "B-EW2"]);

    // Board 1 in each section, one result per section (single table each).
    // Give A a better NS score than B so combined ranking pools all four.
    const rows = [
      {
        section: "A",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        ns: "A1",
        ew: "A2",
        confirmedResult: "3NTN+1" as BoardOutcome,
        status: "CONFIRMED" as const,
      },
      {
        section: "B",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        ns: "B1",
        ew: "B2",
        confirmedResult: "3NTN=" as BoardOutcome,
        status: "CONFIRMED" as const,
      },
    ];
    db.insert(boards).values(rows).run();

    // --- Per-section leaderboards ---
    const perSection = await computeSectionLeaderboards(db, gameId);
    expect(perSection.map((s) => s.section)).toEqual(["A", "B"]);

    // Each section scored on its own: with a single result the pair ids are
    // section-qualified and only that section's participants appear.
    const a = perSection.find((s) => s.section === "A")!;
    const b = perSection.find((s) => s.section === "B")!;
    expect(a.participants.every((p) => p.id.startsWith("A"))).toBe(true);
    expect(b.participants.every((p) => p.id.startsWith("B"))).toBe(true);
    // Section A's overall lines reference only section-A ids.
    const aIds = a.overallScore.lines.map((l: any) => l.pairId);
    expect(aIds.every((id: string) => id.startsWith("A"))).toBe(true);

    // --- Combined leaderboard ---
    const combined = await computeLeaderboard(db, gameId);
    const combinedIds = combined.overallScore.lines.map((l: any) => l.pairId);
    // Combined pools both sections' board-1 results into one field: ids from
    // both A and B appear together.
    expect(combinedIds.some((id: string) => id.startsWith("A"))).toBe(true);
    expect(combinedIds.some((id: string) => id.startsWith("B"))).toBe(true);
    // All four pairs (2 per section) are ranked in the combined field.
    expect(combined.overallScore.lines.length).toBe(4);
    // Per-section A ranks only its own 2 pairs.
    expect(a.overallScore.lines.length).toBe(2);
  });
});
