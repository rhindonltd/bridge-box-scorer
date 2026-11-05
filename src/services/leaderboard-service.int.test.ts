// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";
import { withFixtureMatchId, seedFixtureMatch } from "@/mocks/fixtures/db-rows";

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
    seedFixtureMatch(db);
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
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");

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
      db.insert(seatOccupancy)
        .values({
          seat: `${section}${table}${seatDir}`,
          boards: null,
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
    const { computeLeaderboard, computeSectionLeaderboards } =
      await import("./leaderboard-service");

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
    db.insert(boards).values(rows.map(withFixtureMatchId)).run();

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

  it("lists every seated pair at a baseline before any board is played", async () => {
    const db = await setup();
    const { computeLeaderboard, computeSectionLeaderboards } =
      await import("./leaderboard-service");

    // Two seated pairs (one table), but NO board rows inserted — the game has
    // not been played yet.
    await seatPair(db, "A", 1, ["N1", "N1b"], ["E1", "E1b"]);

    const combined = await computeLeaderboard(db, gameId);
    // Both seated pairs appear at the 0/0 matchpoint baseline, even with no
    // results — rather than an empty leaderboard.
    const ids = combined.overallScore.lines.map((l: any) => l.pairId).sort();
    expect(ids).toEqual(["A1EW", "A1NS"]);
    expect(
      combined.overallScore.lines.every(
        (l: any) => l.totalMP === 0 && l.maxMP === 0,
      ),
    ).toBe(true);

    // The per-section leaderboard lists them too.
    const [a] = await computeSectionLeaderboards(db, gameId);
    expect(a.overallScore.lines).toHaveLength(2);
  });

  it("credits a Swiss sit-out pair 60% of the board top under matchpoints", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { computeSectionLeaderboards } =
      await import("./leaderboard-service");

    // Section A: three pairs. Two tables play board 1 (giving a matchpoint top
    // of 2, i.e. 2*(2-1) with two results), and a third pair sits out board 1.
    await seatPair(db, "A", 1, ["N1", "N1b"], ["E1", "E1b"]);
    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    await seatPair(db, "A", 3, ["N3", "N3b"], ["E3", "E3b"]);

    db.insert(boards)
      .values(
        [
          // Two real results on board 1 -> matchpoint top = 2.
          {
            section: "A",
            roundNumber: 1,
            tableNumber: 1,
            boardNumber: 1,
            ns: "A1NS",
            ew: "A1EW",
            confirmedResult: "3NTN+1" as BoardOutcome,
            status: "CONFIRMED" as const,
          },
          {
            section: "A",
            roundNumber: 1,
            tableNumber: 2,
            boardNumber: 1,
            ns: "A2NS",
            ew: "A2EW",
            confirmedResult: "3NTN=" as BoardOutcome,
            status: "CONFIRMED" as const,
          },
          // Pair A3NS sits out board 1 (phantom opponent, SIT_OUT).
          {
            section: "A",
            roundNumber: 1,
            tableNumber: 3,
            boardNumber: 1,
            ns: "A3NS",
            ew: "PHANTOM",
            status: "SIT_OUT" as const,
          },
        ].map(withFixtureMatchId),
      )
      .run();

    const perSection = await computeSectionLeaderboards(db, gameId);
    const a = perSection.find((s) => s.section === "A")!;
    const lines = a.overallScore.lines as {
      pairId: string;
      totalMP: number;
      maxMP: number;
    }[];

    const sitOut = lines.find((l) => l.pairId === "A3NS");
    expect(sitOut).toBeDefined();
    // Board top is 2, so the bye pair is credited 60% => 1.2 of a max of 2.
    // EBU §4.2.6.1 then rounds each board to the nearest whole matchpoint: 1.2
    // → 1. On such a tiny field (top 2) there is no whole matchpoint that
    // represents 60%, so the rounded AVE+ necessarily collapses to the nearest
    // unit — a faithful consequence of the 1-MP scoring unit, not a bug.
    expect(sitOut!.maxMP).toBeCloseTo(2, 5);
    expect(sitOut!.totalMP).toBeCloseTo(1, 5);
  });

  it("drops a WITHOUT_STANDING pair from the ranking but keeps its results in the field (§2.4.9)", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    const { computeSectionLeaderboards } =
      await import("./leaderboard-service");

    // Three NS/EW tables play board 1 — a 3-result field (matchpoint top 4).
    await seatPair(db, "A", 1, ["N1", "N1b"], ["E1", "E1b"]);
    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    await seatPair(db, "A", 3, ["N3", "N3b"], ["E3", "E3b"]);

    db.insert(boards)
      .values(
        [
          {
            section: "A",
            roundNumber: 1,
            tableNumber: 1,
            boardNumber: 1,
            ns: "A1NS",
            ew: "A1EW",
            confirmedResult: "3NTN+1" as BoardOutcome, // best NS score
            status: "CONFIRMED" as const,
          },
          {
            section: "A",
            roundNumber: 1,
            tableNumber: 2,
            boardNumber: 1,
            ns: "A2NS",
            ew: "A2EW",
            confirmedResult: "3NTN=" as BoardOutcome, // middle
            status: "CONFIRMED" as const,
          },
          {
            section: "A",
            roundNumber: 1,
            tableNumber: 3,
            boardNumber: 1,
            ns: "A3NS",
            ew: "A3EW",
            confirmedResult: "3NTN-1" as BoardOutcome, // worst NS score
            status: "CONFIRMED" as const,
          },
        ].map(withFixtureMatchId),
      )
      .run();

    // Baseline: all three NS pairs ranked. A1NS top, A3NS bottom.
    const before = (await computeSectionLeaderboards(db, gameId)).find(
      (s) => s.section === "A",
    )!;
    const beforeNs = (before.overallScore.lines as { pairId: string }[])
      .map((l) => l.pairId)
      .filter((id) => id.endsWith("NS"));
    expect(beforeNs).toContain("A1NS");
    expect(beforeNs).toContain("A2NS");
    const a1Before = (before.overallScore.lines as any[]).find(
      (l) => l.pairId === "A1NS",
    );

    // Mark the MIDDLE pair A2NS "without standing" (§2.4.9).
    db.update(seatOccupancy)
      .set({ standing: "WITHOUT_STANDING" })
      .where(eq(seatOccupancy.seat, "A2NS"))
      .run();

    const after = (await computeSectionLeaderboards(db, gameId)).find(
      (s) => s.section === "A",
    )!;
    const afterIds = (after.overallScore.lines as { pairId: string }[]).map(
      (l) => l.pairId,
    );

    // A2NS (and its EW partner line, same participant seat is NS; EW is a
    // separate seat) is dropped from the ranking.
    expect(afterIds).not.toContain("A2NS");
    // Its opponents' results STAND: A1NS is still ranked and still top, with
    // the SAME matchpoints as before (it was still compared against A2NS's
    // result — only A2NS's own ranking line is removed).
    const a1After = (after.overallScore.lines as any[]).find(
      (l) => l.pairId === "A1NS",
    );
    expect(a1After).toBeDefined();
    expect(a1After.totalMP).toBeCloseTo(a1Before.totalMP, 5);
    expect(a1After.maxMP).toBeCloseTo(a1Before.maxMP, 5);
    // Exactly one line (A2NS) was dropped from the pooled field of 6 → 5 remain,
    // and A1NS still tops the field (rank 1).
    expect(after.overallScore.lines.length).toBe(5);
    expect(a1After.rank).toBe(1);
  });

  // ── Design §11: pairs withdrawals / late arrivals ──────────────────────
  //
  // Five tables so a board top is 2·4 = 8 (big enough that §4.2.6.1 whole-MP
  // rounding does not hide the AVE± values). On board 1 every table plays and
  // A1NS (3NTN+1) tops the field, so A1NS averages 100% and A1EW 0%. Board 2 is
  // played by tables 2–5; table 1's board-2 row is the one A1NS misses.

  type MpLine = { pairId: string; totalMP: number; maxMP: number };

  async function fiveTableField(db: any, table1Board2Round: number) {
    const { boards } = await import("@/db/games/tables/boards");
    for (let t = 1; t <= 5; t++) {
      await seatPair(db, "A", t, [`N${t}`, `N${t}b`], [`E${t}`, `E${t}b`]);
    }
    const played = (bn: number, round: number, t: number, outcome: string) => ({
      section: "A",
      roundNumber: round,
      tableNumber: t,
      boardNumber: bn,
      ns: `A${t}NS`,
      ew: `A${t}EW`,
      confirmedResult: outcome as BoardOutcome,
      status: "CONFIRMED" as const,
    });
    const rows: any[] = [played(1, 1, 1, "3NTN+1")];
    for (let t = 2; t <= 5; t++) rows.push(played(1, 1, t, "3NTN="));
    for (let t = 2; t <= 5; t++) rows.push(played(2, 2, t, "3NTN="));
    rows.push({
      section: "A",
      roundNumber: table1Board2Round,
      tableNumber: 1,
      boardNumber: 2,
      ns: "A1NS",
      ew: "A1EW",
      status: "ABSENT" as const,
    });
    db.insert(boards).values(rows.map(withFixtureMatchId)).run();
  }

  async function markAbsent(
    db: any,
    standing: "WITHDRAWN" | "LATE",
    round: number,
    treatment: "AVERAGE" | "REMOVED" | null,
  ) {
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    db.update(seatOccupancy)
      .set({
        standing,
        withdrawnInRound: round,
        withdrawalTreatment: treatment,
      })
      .where(eq(seatOccupancy.seat, "A1NS"))
      .run();
  }

  async function sectionA(db: any) {
    const { computeSectionLeaderboards } =
      await import("./leaderboard-service");
    const a = (await computeSectionLeaderboards(db, gameId)).find(
      (s) => s.section === "A",
    )!;
    return a.overallScore.lines as MpLine[];
  }

  it("AVERAGE withdrawal: the withdrawn pair gets AVE− and its opponent AVE+ on the missed board, both stay ranked", async () => {
    const db = await setup();
    await fiveTableField(db, 2);
    await markAbsent(db, "WITHDRAWN", 2, "AVERAGE");

    const lines = await sectionA(db);
    const a1ns = lines.find((l) => l.pairId === "A1NS")!;
    const a1ew = lines.find((l) => l.pairId === "A1EW")!;
    const a2ns = lines.find((l) => l.pairId === "A2NS")!;

    // The withdrawn pair stays in the ranking, on both boards.
    expect(a1ns).toBeDefined();
    expect(a1ns.maxMP).toBe(a2ns.maxMP);
    expect(a1ew.maxMP).toBe(a2ns.maxMP);
    // Board 1: A1NS 8, A1EW 0. Board 2 (top 8): AVE− = min(40%, A1NS's 100%)
    // = 3.2 → 3; AVE+ = max(60%, A1EW's 0%) = 4.8 → 5.
    expect(a1ns.totalMP).toBe(8 + 3);
    expect(a1ew.totalMP).toBe(0 + 5);
  });

  it("an unchosen treatment defaults to AVERAGE", async () => {
    const db = await setup();
    await fiveTableField(db, 2);
    await markAbsent(db, "WITHDRAWN", 2, null);

    const lines = await sectionA(db);
    expect(lines.find((l) => l.pairId === "A1NS")!.totalMP).toBe(11);
    expect(lines.find((l) => l.pairId === "A1EW")!.totalMP).toBe(5);
  });

  it("REMOVED withdrawal: the missed board is out of the movement for both pairs, the withdrawn pair stays ranked", async () => {
    const db = await setup();
    await fiveTableField(db, 2);
    await markAbsent(db, "WITHDRAWN", 2, "REMOVED");

    const lines = await sectionA(db);
    const a1ns = lines.find((l) => l.pairId === "A1NS")!;
    const a1ew = lines.find((l) => l.pairId === "A1EW")!;
    const a2ns = lines.find((l) => l.pairId === "A2NS")!;

    expect(a1ns).toBeDefined();
    // One board each (board 1 only) — the opponent is treated as sitting out.
    expect(a1ns.maxMP).toBe(a2ns.maxMP / 2);
    expect(a1ew.maxMP).toBe(a2ns.maxMP / 2);
    expect(a1ns.totalMP).toBe(8);
    expect(a1ew.totalMP).toBe(0);
  });

  it("does not touch a withdrawn pair's boards from before it withdrew", async () => {
    const db = await setup();
    // The table-1 board-2 row is in round 2, but the pair withdrew in round 3:
    // that board is not one it missed through withdrawal.
    await fiveTableField(db, 2);
    await markAbsent(db, "WITHDRAWN", 3, "AVERAGE");

    const lines = await sectionA(db);
    const a1ns = lines.find((l) => l.pairId === "A1NS")!;
    expect(a1ns.maxMP).toBe(8);
  });

  it("AVERAGE late arrival: the boards before the arrival round score AVE−/AVE+", async () => {
    const db = await setup();
    // A1NS arrived in round 3, so its round-2 board-2 row was missed.
    await fiveTableField(db, 2);
    await markAbsent(db, "LATE", 3, "AVERAGE");

    const lines = await sectionA(db);
    expect(lines.find((l) => l.pairId === "A1NS")!.totalMP).toBe(11);
    expect(lines.find((l) => l.pairId === "A1EW")!.totalMP).toBe(5);
  });

  it("REMOVED late arrival: the boards before the arrival round are dropped", async () => {
    const db = await setup();
    await fiveTableField(db, 2);
    await markAbsent(db, "LATE", 3, "REMOVED");

    const lines = await sectionA(db);
    expect(lines.find((l) => l.pairId === "A1NS")!.maxMP).toBe(8);
    expect(lines.find((l) => l.pairId === "A1EW")!.maxMP).toBe(8);
  });

  it("scores AVERAGE at Cross-IMPs as ±3 through the §4.1.1.1 uplift", async () => {
    const { findGameById } =
      await import("@/db/game-index/queries/find-game-by-id");
    vi.mocked(findGameById).mockImplementationOnce(
      async () =>
        ({ gameId: "g", gameType: "PAIRS", scoringType: "XIMP" }) as never,
    );
    const db = await setup();
    await fiveTableField(db, 2);
    await markAbsent(db, "WITHDRAWN", 2, "AVERAGE");

    const lines = (await sectionA(db)) as unknown as {
      pairId: string;
      crossImps: number;
    }[];
    const a1ns = lines.find((l) => l.pairId === "A1NS")!;
    const a1ew = lines.find((l) => l.pairId === "A1EW")!;
    // Board 1: 430 against four 400s → A1NS +1, A1EW −1 cross-IMPs.
    // Board 2: AVE− = min(−3, A1NS's +1) = −3; AVE+ = max(+3, A1EW's −1) = +3.
    // Ranked on the average per board.
    expect(a1ns.crossImps).toBeCloseTo((1 - 3) / 2, 5);
    expect(a1ew.crossImps).toBeCloseTo((-1 + 3) / 2, 5);
  });

  it("AVERAGE empty expected-late seat: its opponent gets AVE+, the empty seat is not ranked", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { expectedLateSeats } =
      await import("@/db/games/tables/expected-late-seats");
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");

    for (let t = 1; t <= 4; t++) {
      await seatPair(db, "A", t, [`N${t}`, `N${t}b`], [`E${t}`, `E${t}b`]);
    }
    // Table 5: A5NS seated, A5EW expected late (no occupancy).
    const p1 = db
      .insert(players)
      .values({ firstName: "N5", lastName: "x" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: "N5b", lastName: "y" })
      .returning()
      .get();
    db.insert(seatOccupancy)
      .values({
        seat: "A5NS",
        boards: null,
        player1: p1.id,
        player2: p2.id,
        secretKey: "A5NS",
      })
      .run();
    db.insert(expectedLateSeats).values({ seat: "A5EW" }).run();

    const rows: any[] = [];
    for (let t = 1; t <= 4; t++) {
      rows.push({
        section: "A",
        roundNumber: 1,
        tableNumber: t,
        boardNumber: 1,
        ns: `A${t}NS`,
        ew: `A${t}EW`,
        confirmedResult: "3NTN=" as BoardOutcome,
        status: "CONFIRMED" as const,
      });
    }
    rows.push({
      section: "A",
      roundNumber: 1,
      tableNumber: 5,
      boardNumber: 1,
      ns: "A5NS",
      ew: "A5EW",
      status: "NOT_PLAYED" as const,
    });
    db.insert(boards).values(rows.map(withFixtureMatchId)).run();

    const lines = await sectionA(db);
    const a5ns = lines.find((l) => l.pairId === "A5NS")!;
    // Top 8; AVE+ with no real boards of its own = a flat 60% = 4.8 → 5.
    expect(a5ns.maxMP).toBe(8);
    expect(a5ns.totalMP).toBe(5);
    expect(lines.some((l) => l.pairId === "A5EW")).toBe(false);
  });

  it("REMOVED empty expected-late seat: its opponent simply has no board", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { expectedLateSeats } =
      await import("@/db/games/tables/expected-late-seats");
    await seatPair(db, "A", 1, ["N1", "N1b"], ["E1", "E1b"]);
    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const p1 = db
      .insert(players)
      .values({ firstName: "N3", lastName: "x" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: "N3b", lastName: "y" })
      .returning()
      .get();
    db.insert(seatOccupancy)
      .values({
        seat: "A3NS",
        boards: null,
        player1: p1.id,
        player2: p2.id,
        secretKey: "A3NS",
      })
      .run();
    db.insert(expectedLateSeats)
      .values({ seat: "A3EW", treatment: "REMOVED" })
      .run();
    db.insert(boards)
      .values(
        [
          {
            section: "A",
            roundNumber: 1,
            tableNumber: 1,
            boardNumber: 1,
            ns: "A1NS",
            ew: "A1EW",
            confirmedResult: "3NTN+1" as BoardOutcome,
            status: "CONFIRMED" as const,
          },
          {
            section: "A",
            roundNumber: 1,
            tableNumber: 2,
            boardNumber: 1,
            ns: "A2NS",
            ew: "A2EW",
            confirmedResult: "3NTN=" as BoardOutcome,
            status: "CONFIRMED" as const,
          },
          {
            section: "A",
            roundNumber: 1,
            tableNumber: 3,
            boardNumber: 1,
            ns: "A3NS",
            ew: "A3EW",
            status: "NOT_PLAYED" as const,
          },
        ].map(withFixtureMatchId),
      )
      .run();

    const lines = await sectionA(db);
    expect(lines.find((l) => l.pairId === "A3NS")?.maxMP ?? 0).toBe(0);
    expect(lines.some((l) => l.pairId === "A3EW")).toBe(false);
  });

  // ── §2.4.7 substitution handover (two occupancies on one seat) ──

  /**
   * Seat a handover at `${section}${table}NS` under the two-toggle model: an
   * EARLIER occupancy (the arrival anchor, plays `earlierBoards`) and a LATER
   * occupancy (plays `laterBoards`). Both default to ACTIVE (eligible for
   * ranking); `split` controls whether they rank as one merged line (`false`,
   * the arrival anchor's id `${section}${table}NS`) or two separate lines
   * (`true`, the later occupancy getting its own scored-field id
   * `${section}${table}NS#<id>`). `earlierStanding` lets a test mark the earlier
   * occupant WITHOUT_STANDING (ineligible — counts for opponents but stripped
   * from the ranking). Returns the later occupancy's id.
   */
  async function seatHandoverNs(
    db: any,
    section: string,
    table: number,
    earlierBoards: number[],
    laterBoards: number[],
    opts: {
      split?: boolean;
      earlierStanding?: "ACTIVE" | "WITHOUT_STANDING";
      /**
       * Which occupant is the merged-line MAIN pair (split=no). Default
       * "anchor" (= the early* occupancy here, which carries isArrivalAnchor=1).
       * "later" marks the late* occupancy isMainLine=1 to exercise the override.
       */
      mainLine?: "anchor" | "later";
    } = {},
  ): Promise<number> {
    const {
      split = false,
      earlierStanding = "ACTIVE",
      mainLine = "anchor",
    } = opts;
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const seat = `${section}${table}NS`;

    const mkPlayers = (tag: string) => {
      const p1 = db
        .insert(players)
        .values({ firstName: `${tag}1`, lastName: "x" })
        .returning()
        .get();
      const p2 = db
        .insert(players)
        .values({ firstName: `${tag}2`, lastName: "y" })
        .returning()
        .get();
      return [p1.id, p2.id] as const;
    };

    // The EARLIER occupancy — the arrival anchor (holds the seat's device /
    // identity). Eligible by default; a test may mark it WITHOUT_STANDING.
    const [e1, e2] = mkPlayers(`early${seat}`);
    db.insert(seatOccupancy)
      .values({
        seat,
        boards: earlierBoards,
        player1: e1,
        player2: e2,
        secretKey: `${seat}-early`,
        standing: earlierStanding,
        isArrivalAnchor: 1,
        isMainLine: mainLine === "anchor" ? 1 : 0,
        split: split ? 1 : 0,
      })
      .run();

    // The LATER occupancy (the substitute/handover-in pair). Always ACTIVE here.
    const [l1, l2] = mkPlayers(`late${seat}`);
    const lateRow = db
      .insert(seatOccupancy)
      .values({
        seat,
        boards: laterBoards,
        player1: l1,
        player2: l2,
        secretKey: `${seat}-late`,
        standing: "ACTIVE",
        isArrivalAnchor: 0,
        isMainLine: mainLine === "later" ? 1 : 0,
        split: split ? 1 : 0,
      })
      .returning()
      .get();
    return lateRow.id;
  }

  it("merged handover (split=no, both eligible): one ranked line on the anchor id, opponents matchpointed", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { computeSectionLeaderboards } =
      await import("./leaderboard-service");

    // 4-board MP event, three tables. Table 1's NS seat is a merged handover
    // (split=no): the earlier pair plays boards 1–2, the later pair plays 3–4,
    // and both are eligible. They rank as ONE line on the anchor id A1NS.
    await seatPair(db, "A", 1, ["ignored", "ignored"], ["E1", "E1b"]); // seats A1EW; A1NS replaced below
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    db.delete(seatOccupancy).where(eq(seatOccupancy.seat, "A1NS")).run();
    await seatHandoverNs(db, "A", 1, [1, 2], [3, 4], { split: false });

    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    await seatPair(db, "A", 3, ["N3", "N3b"], ["E3", "E3b"]);

    const played = (bn: number, t: number, ns: string, ew: string) => ({
      section: "A",
      roundNumber: bn,
      tableNumber: t,
      boardNumber: bn,
      ns,
      ew,
      confirmedResult: "3NTN=" as BoardOutcome,
      status: "CONFIRMED" as const,
    });
    db.insert(boards)
      .values(
        [1, 2, 3, 4]
          .flatMap((bn) => [
            played(bn, 1, "A1NS", "A1EW"),
            played(bn, 2, "A2NS", "A2EW"),
            played(bn, 3, "A3NS", "A3EW"),
          ])
          .map(withFixtureMatchId),
      )
      .run();

    const a = (await computeSectionLeaderboards(db, gameId)).find(
      (s) => s.section === "A",
    )!;
    const lines = a.overallScore.lines as {
      pairId: string;
      totalMP: number;
      maxMP: number;
    }[];
    const ids = lines.map((l) => l.pairId);

    // Exactly one ranked line for the seat, on the anchor id — no split `#id`.
    expect(ids).toContain("A1NS");
    expect(ids.some((id) => id.startsWith("A1NS#"))).toBe(false);
    const merged = lines.find((l) => l.pairId === "A1NS")!;
    expect(merged).toBeDefined();
    // Merged line covers all four boards (1–2 earlier + 3–4 later).
    expect(merged.maxMP).toBeGreaterThan(0);
    // The EW opponent is matchpointed on all four boards (opponents' results
    // stand regardless of the handover).
    const a1ew = lines.find((l) => l.pairId === "A1EW");
    expect(a1ew).toBeDefined();
    expect(a1ew!.maxMP).toBeGreaterThan(0);

    // DUAL-NAMING: the A1NS participant carries BOTH pairs' names for the local
    // leaderboard — the ANCHOR pair's line plus a "(Sub)" line for the OTHER
    // occupant that folded onto the merged line. (In this helper the anchor is
    // the `early*` occupancy — isArrivalAnchor=1 — and the folded-in one is the
    // `late*` occupancy.)
    const a1nsParticipant = a.participants.find((p) => p.id === "A1NS")!;
    expect(a1nsParticipant.type).toBe("PAIR");
    const dualNames =
      a1nsParticipant.type === "PAIR"
        ? a1nsParticipant.displayNameLines
        : undefined;
    expect(dualNames).toBeDefined();
    expect(dualNames).toHaveLength(2);
    expect(dualNames![1]).toMatch(/^\(Sub\) /);
    // The anchor line names the anchor pair; the sub line names the other pair.
    expect(dualNames![0]).toContain("earlyA1NS1");
    expect(dualNames![1]).toContain("lateA1NS1");
  });

  it("merged handover with the MAIN pair re-pointed (split=no): the other pair is the primary line, its partner the (Sub)", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { computeSectionLeaderboards } =
      await import("./leaderboard-service");

    // Same merged setup, but the director has made the LATER occupant the main
    // pair (mainLine: "later"). The merged line is still the bare id A1NS, but
    // its displayed primary identity + the (Sub) partner swap over.
    await seatPair(db, "A", 1, ["ignored", "ignored"], ["E1", "E1b"]);
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    db.delete(seatOccupancy).where(eq(seatOccupancy.seat, "A1NS")).run();
    await seatHandoverNs(db, "A", 1, [1, 2], [3, 4], {
      split: false,
      mainLine: "later",
    });

    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    await seatPair(db, "A", 3, ["N3", "N3b"], ["E3", "E3b"]);

    const played = (bn: number, t: number, ns: string, ew: string) => ({
      section: "A",
      roundNumber: bn,
      tableNumber: t,
      boardNumber: bn,
      ns,
      ew,
      confirmedResult: "3NTN=" as BoardOutcome,
      status: "CONFIRMED" as const,
    });
    db.insert(boards)
      .values(
        [1, 2, 3, 4]
          .flatMap((bn) => [
            played(bn, 1, "A1NS", "A1EW"),
            played(bn, 2, "A2NS", "A2EW"),
            played(bn, 3, "A3NS", "A3EW"),
          ])
          .map(withFixtureMatchId),
      )
      .run();

    const a = (await computeSectionLeaderboards(db, gameId)).find(
      (s) => s.section === "A",
    )!;
    const lines = a.overallScore.lines as {
      pairId: string;
      totalMP: number;
      maxMP: number;
    }[];
    const ids = lines.map((l) => l.pairId);

    // Still exactly ONE ranked line on the bare id — scoring is unchanged by
    // the main-pair choice (a merged seat always scores to the bare id).
    expect(ids).toContain("A1NS");
    expect(ids.some((id) => id.startsWith("A1NS#"))).toBe(false);

    // DUAL-NAMING flips: the LATER pair is now the primary line; the EARLIER
    // pair is the "(Sub)".
    const a1nsParticipant = a.participants.find((p) => p.id === "A1NS")!;
    expect(a1nsParticipant.type).toBe("PAIR");
    const dualNames =
      a1nsParticipant.type === "PAIR"
        ? a1nsParticipant.displayNameLines
        : undefined;
    expect(dualNames).toBeDefined();
    expect(dualNames).toHaveLength(2);
    expect(dualNames![0]).toContain("lateA1NS1");
    expect(dualNames![1]).toMatch(/^\(Sub\) /);
    expect(dualNames![1]).toContain("earlyA1NS1");
  });

  it("split handover (split=yes, both eligible): two separate ranked lines, each only on its own boards", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    const { computeSectionLeaderboards } =
      await import("./leaderboard-service");

    // Table 1's NS seat is a split handover: the earlier pair plays 1–2, the
    // later pair plays 3–4, both eligible. They rank as TWO lines — the anchor
    // id A1NS (earlier) and A1NS#<lateId> (later) — each only on its 2 boards.
    await seatPair(db, "A", 1, ["ignored", "ignored"], ["E1", "E1b"]);
    db.delete(seatOccupancy).where(eq(seatOccupancy.seat, "A1NS")).run();
    const lateId = await seatHandoverNs(db, "A", 1, [1, 2], [3, 4], {
      split: true,
    });
    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    await seatPair(db, "A", 3, ["N3", "N3b"], ["E3", "E3b"]);

    const played = (bn: number, t: number, ns: string, ew: string) => ({
      section: "A",
      roundNumber: bn,
      tableNumber: t,
      boardNumber: bn,
      ns,
      ew,
      confirmedResult: "3NTN=" as BoardOutcome,
      status: "CONFIRMED" as const,
    });
    db.insert(boards)
      .values(
        [1, 2, 3, 4]
          .flatMap((bn) => [
            played(bn, 1, "A1NS", "A1EW"),
            played(bn, 2, "A2NS", "A2EW"),
            played(bn, 3, "A3NS", "A3EW"),
          ])
          .map(withFixtureMatchId),
      )
      .run();

    const a = (await computeSectionLeaderboards(db, gameId)).find(
      (s) => s.section === "A",
    )!;
    const lines = a.overallScore.lines as {
      pairId: string;
      totalMP: number;
      maxMP: number;
    }[];
    const ids = lines.map((l) => l.pairId);

    // Both occupants are ranked as their own lines.
    expect(ids).toContain("A1NS");
    expect(ids).toContain(`A1NS#${lateId}`);
    // Each ranks only on its own 2 boards — never under-boarded nor over-boarded.
    const earlier = lines.find((l) => l.pairId === "A1NS")!;
    const later = lines.find((l) => l.pairId === `A1NS#${lateId}`)!;
    expect(earlier.maxMP).toBeGreaterThan(0);
    expect(later.maxMP).toBeGreaterThan(0);
  });

  it("ineligible earlier pair (WITHOUT_STANDING, split=yes): excluded from ranking but counts for opponents", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    const { computeSectionLeaderboards } =
      await import("./leaderboard-service");

    // Split handover where the EARLIER pair is WITHOUT_STANDING (ineligible):
    // it is stripped from the ranking, but its results still matchpoint the
    // opponents it played. The later pair ranks on its own boards.
    await seatPair(db, "A", 1, ["ignored", "ignored"], ["E1", "E1b"]);
    db.delete(seatOccupancy).where(eq(seatOccupancy.seat, "A1NS")).run();
    const lateId = await seatHandoverNs(db, "A", 1, [1, 2], [3, 4], {
      split: true,
      earlierStanding: "WITHOUT_STANDING",
    });
    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    await seatPair(db, "A", 3, ["N3", "N3b"], ["E3", "E3b"]);

    const played = (bn: number, t: number, ns: string, ew: string) => ({
      section: "A",
      roundNumber: bn,
      tableNumber: t,
      boardNumber: bn,
      ns,
      ew,
      confirmedResult: "3NTN=" as BoardOutcome,
      status: "CONFIRMED" as const,
    });
    db.insert(boards)
      .values(
        [1, 2, 3, 4]
          .flatMap((bn) => [
            played(bn, 1, "A1NS", "A1EW"),
            played(bn, 2, "A2NS", "A2EW"),
            played(bn, 3, "A3NS", "A3EW"),
          ])
          .map(withFixtureMatchId),
      )
      .run();

    const a = (await computeSectionLeaderboards(db, gameId)).find(
      (s) => s.section === "A",
    )!;
    const lines = a.overallScore.lines as {
      pairId: string;
      totalMP: number;
      maxMP: number;
    }[];
    const ids = lines.map((l) => l.pairId);

    // The ineligible earlier pair (anchor id A1NS) is NOT ranked.
    expect(ids).not.toContain("A1NS");
    // The later (eligible) pair IS ranked on its own boards.
    expect(ids).toContain(`A1NS#${lateId}`);
    const later = lines.find((l) => l.pairId === `A1NS#${lateId}`)!;
    expect(later.maxMP).toBeGreaterThan(0);
    // The EW opponent is still matchpointed on all four boards — the earlier
    // pair's boards 1–2 results count for the opponents even though the pair
    // itself is unranked.
    const a1ew = lines.find((l) => l.pairId === "A1EW")!;
    expect(a1ew).toBeDefined();
    expect(a1ew.maxMP).toBeGreaterThan(0);
  });
});
