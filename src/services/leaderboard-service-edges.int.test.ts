// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";
import {
  withFixtureMatchId,
  seedFixtureMatch,
  seedFixtureTeamsMatch,
} from "@/mocks/fixtures/db-rows";
/**
 * Leaderboard paths that need a particular game configuration (scoring type +
 * movement) rather than a particular board layout: the pre-play baseline for
 * every scoring variant, the per-section teams scorers, the two-winner
 * (Mitchell) split under each pairs scoring type, expected-late seats on a
 * teams game, and the "without standing" exclusion applied to the split.
 */
const game = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => game.current),
}));
const SWISS_TEAMS = JSON.stringify({
  source: "SWISS_TEAMS",
  swissTeams: { teams: 2, rounds: 3, boardsPerRound: 1 },
});
const SWISS_PAIRS = JSON.stringify({
  source: "SWISS",
  swiss: { tables: 2, rounds: 3, boardsPerRound: 2 },
});
const MITCHELL = JSON.stringify({
  source: "MITCHELL",
  mitchell: { tables: 3, rounds: 3, boardsPerRound: 2 },
});
let tmpDir: string;
let gameId: string;
describe("leaderboard-service game-configuration edges", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "leaderboard-edges-"));
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
  async function setup(config: Record<string, unknown>) {
    game.current = { gameId: "g", combinedRanking: true, ...config };
    const games = await import("@/db/games");
    const create = await import("@/db/games/actions/create-game");
    await create.createGameDb(gameId);
    const db = await games.getDb(gameId);
    if (!db) throw new Error("db not created");
    return db;
  }
  async function seat(db: any, seat: string) {
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const p1 = db
      .insert(players)
      .values({ firstName: `${seat}a`, lastName: "x" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: `${seat}b`, lastName: "y" })
      .returning()
      .get();
    db.insert(seatOccupancy)
      .values({
        seat,
        boards: null,
        player1: p1.id,
        player2: p2.id,
        secretKey: seat,
      })
      .run();
  }
  /** Two teams: home NS + away EW pairs at tables 1 and 2. */
  async function seatTwoTeams(db: any) {
    for (const s of ["A1NS", "A1EW", "A2NS", "A2EW"]) await seat(db, s);
  }
  describe("baseline field before any board is played", () => {
    const cases: [string, Record<string, unknown>, string, string][] = [
      ["Cross-IMP pairs", { gameType: "PAIRS", scoringType: "XIMP" }, "pairId", "crossImps"],
      [
        "Swiss Cross-IMP pairs",
        {
          gameType: "PAIRS",
          scoringType: "XIMP",
          selectedMovement: SWISS_PAIRS,
        },
        "pairId",
        "totalVP",
      ],
      [
        "Swiss matchpoint pairs",
        { gameType: "PAIRS", scoringType: "MP", selectedMovement: SWISS_PAIRS },
        "pairId",
        "totalVP",
      ],
      [
        "aggregate-IMP teams",
        { gameType: "TEAMS", scoringType: "IMP", selectedMovement: SWISS_TEAMS },
        "teamId",
        "totalImps",
      ],
      [
        "Board-a-Match teams",
        { gameType: "TEAMS", scoringType: "BAM", selectedMovement: SWISS_TEAMS },
        "teamId",
        "totalWon",
      ],
      [
        "Point-a-Board teams",
        { gameType: "TEAMS", scoringType: "PAB", selectedMovement: SWISS_TEAMS },
        "teamId",
        "totalWon",
      ],
    ];
    it.each(cases)(
      "%s lists the seated field at zero (combined and per section)",
      async (_label, config, idField, valueField) => {
        const db = await setup(config);
        await seatTwoTeams(db);
        const { computeLeaderboard, computeSectionLeaderboards } = await import(
          "./leaderboard-service"
        );
        const combined = await computeLeaderboard(db, gameId);
        const sections = await computeSectionLeaderboards(db, gameId);
        expect(sections.map((s) => s.section)).toEqual(["A"]);
        for (const lines of [
          combined.overallScore.lines,
          sections[0].overallScore.lines,
        ] as unknown as Record<string, unknown>[][]) {
          expect(lines.length).toBeGreaterThanOrEqual(2);
          for (const line of lines) {
            expect(line[idField]).toEqual(expect.any(String));
            expect(line[valueField]).toBe(0);
          }
        }
      },
    );
  });
  describe("a section with boards but no seated teams", () => {
    it.each(["BAM", "IMP"])(
      "is listed empty on a %s teams game",
      async (scoringType) => {
        const db = await setup({
          gameType: "TEAMS",
          scoringType,
          selectedMovement: SWISS_TEAMS,
        });
        await seatTwoTeams(db);
        const { boards } = await import("@/db/games/tables/boards");
        seedFixtureTeamsMatch(db);
        db.insert(boards)
          .values(
            withFixtureMatchId({
              section: "B",
              roundNumber: 1,
              tableNumber: 1,
              boardNumber: 1,
              ns: "B1NS",
              ew: "B2EW",
              confirmedResult: "3NTN=" as BoardOutcome,
              status: "CONFIRMED" as const,
            }),
          )
          .run();
        const { computeSectionLeaderboards } = await import(
          "./leaderboard-service"
        );
        const sections = await computeSectionLeaderboards(db, gameId);
        const b = sections.find((s) => s.section === "B")!;
        expect(b.participants).toEqual([]);
      },
    );
  });
  describe("two-winner (Mitchell) split", () => {
    async function seatAndScore(db: any) {
      const { boards } = await import("@/db/games/tables/boards");
      for (const t of [1, 2, 3]) {
        await seat(db, `A${t}NS`);
        await seat(db, `A${t}EW`);
      }
      seedFixtureMatch(db);
      const results: BoardOutcome[] = ["3NTN+1", "3NTN=", "3NTN-1"];
      db.insert(boards)
        .values(
          results.map((confirmedResult, i) =>
            withFixtureMatchId({
              section: "A",
              roundNumber: 1,
              tableNumber: i + 1,
              boardNumber: 1,
              ns: `A${i + 1}NS`,
              ew: `A${i + 1}EW`,
              confirmedResult,
              status: "CONFIRMED" as const,
            }),
          ),
        )
        .run();
    }
    it("re-ranks each direction on Cross-IMPs", async () => {
      const field = "crossImps";
      const db = await setup({
        gameType: "PAIRS",
        scoringType: "XIMP",
        selectedMovement: MITCHELL,
      });
      await seatAndScore(db);
      const { computeLeaderboard } = await import("./leaderboard-service");
      const result = await computeLeaderboard(db, gameId);
      const ns = result.directional!.ns.overallScore.lines as any[];
      const ew = result.directional!.ew.overallScore.lines as any[];
      expect(ns.map((l) => l.pairId)).toEqual(["A1NS", "A2NS", "A3NS"]);
      expect(ew.map((l) => l.pairId)).toEqual(["A3EW", "A2EW", "A1EW"]);
      expect(ns.every((l) => typeof l[field] === "number")).toBe(true);
      expect(ns.map((l) => l.rank)).toEqual([1, 2, 3]);
    });
    it("drops a without-standing pair from the overall and each direction", async () => {
      const db = await setup({
        gameType: "PAIRS",
        scoringType: "MP",
        selectedMovement: MITCHELL,
      });
      await seatAndScore(db);
      const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
      const { eq } = await import("drizzle-orm");
      db.update(seatOccupancy)
        .set({ standing: "WITHOUT_STANDING" })
        .where(eq(seatOccupancy.seat, "A2NS"))
        .run();
      const { computeLeaderboard } = await import("./leaderboard-service");
      const result = await computeLeaderboard(db, gameId);
      const ids = (lines: any[]) => lines.map((l) => l.pairId);
      expect(ids(result.overallScore.lines as any[])).not.toContain("A2NS");
      expect(ids(result.directional!.ns.overallScore.lines as any[])).toEqual([
        "A1NS",
        "A3NS",
      ]);
      expect(ids(result.directional!.ew.overallScore.lines as any[])).toContain(
        "A2EW",
      );
    });
  });
  it("rejects a pairs game scored with a teams-only scoring type", async () => {
    // IMP has no pairs overall plugin, so a PAIRS game configured with it is a
    // wiring error rather than a silently empty leaderboard.
    const db = await setup({ gameType: "PAIRS", scoringType: "IMP" });
    await seat(db, "A1NS");
    await seat(db, "A1EW");
    const { boards } = await import("@/db/games/tables/boards");
    seedFixtureMatch(db);
    db.insert(boards)
      .values(
        withFixtureMatchId({
          section: "A",
          roundNumber: 1,
          tableNumber: 1,
          boardNumber: 1,
          ns: "A1NS",
          ew: "A1EW",
          confirmedResult: "3NTN=" as BoardOutcome,
          status: "CONFIRMED" as const,
        }),
      )
      .run();
    const { computeLeaderboard } = await import("./leaderboard-service");
    await expect(computeLeaderboard(db, gameId)).rejects.toThrow(
      'Scoring type "IMP" has no overall plugin',
    );
  });
  describe("expected-late seats on a teams game", () => {
    it("excludes an unseated expected-late seat but ignores one already seated", async () => {
      const db = await setup({
        gameType: "TEAMS",
        scoringType: "IMP_VP",
        selectedMovement: SWISS_TEAMS,
      });
      await seatTwoTeams(db);
      const { expectedLateSeats } = await import(
        "@/db/games/tables/expected-late-seats"
      );
      db.insert(expectedLateSeats)
        .values([{ seat: "A1NS" }, { seat: "A3NS" }])
        .run();
      const { computeLeaderboard } = await import("./leaderboard-service");
      const result = await computeLeaderboard(db, gameId);
      const ids = (result.overallScore.lines as any[]).map((l) => l.teamId);
      // The seated team stays ranked; the empty late seat never appears.
      expect(ids).toContain("A1NS");
      expect(ids).not.toContain("A3NS");
    });
  });
});
