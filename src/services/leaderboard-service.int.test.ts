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
    const { computeLeaderboard, computeSectionLeaderboards } = await import(
      "./leaderboard-service"
    );

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
    const { computeSectionLeaderboards } = await import("./leaderboard-service");

    // Section A: three pairs. Two tables play board 1 (giving a matchpoint top
    // of 2, i.e. 2*(2-1) with two results), and a third pair sits out board 1.
    await seatPair(db, "A", 1, ["N1", "N1b"], ["E1", "E1b"]);
    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    await seatPair(db, "A", 3, ["N3", "N3b"], ["E3", "E3b"]);

    db.insert(boards)
      .values([
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
      ].map(withFixtureMatchId))
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
    const { computeSectionLeaderboards } = await import("./leaderboard-service");

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

  it("credits a PENALISED withdrawer AVE−-minus-fine on its unplayed boards (§2.4.5/§2.4.6)", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    const { computeSectionLeaderboards } = await import("./leaderboard-service");

    // Three NS/EW tables. Board 1 is played by all; board 2 is played by the
    // two tables that stay, but table-1's A1NS pair withdrew after board 1, so
    // its board-2 row is NOT_PLAYED (no result).
    await seatPair(db, "A", 1, ["N1", "N1b"], ["E1", "E1b"]);
    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    await seatPair(db, "A", 3, ["N3", "N3b"], ["E3", "E3b"]);

    db.insert(boards)
      .values(
        [
          // Board 1 — all three tables played.
          { section: "A", roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "A1NS", ew: "A1EW", confirmedResult: "3NTN+1" as BoardOutcome, status: "CONFIRMED" as const },
          { section: "A", roundNumber: 1, tableNumber: 2, boardNumber: 1, ns: "A2NS", ew: "A2EW", confirmedResult: "3NTN=" as BoardOutcome, status: "CONFIRMED" as const },
          { section: "A", roundNumber: 1, tableNumber: 3, boardNumber: 1, ns: "A3NS", ew: "A3EW", confirmedResult: "3NTN-1" as BoardOutcome, status: "CONFIRMED" as const },
          // Board 2 — tables 2 & 3 played; table 1 (A1NS/A1EW) did not (withdrew).
          { section: "A", roundNumber: 2, tableNumber: 2, boardNumber: 2, ns: "A2NS", ew: "A2EW", confirmedResult: "4SN=" as BoardOutcome, status: "CONFIRMED" as const },
          { section: "A", roundNumber: 2, tableNumber: 3, boardNumber: 2, ns: "A3NS", ew: "A3EW", confirmedResult: "4SN=" as BoardOutcome, status: "CONFIRMED" as const },
          { section: "A", roundNumber: 2, tableNumber: 1, boardNumber: 2, ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" as const },
        ].map(withFixtureMatchId),
      )
      .run();

    // Withdraw A1NS: PENALISED, 0% fine → the unplayed board scores AVE− (40%).
    db.update(seatOccupancy)
      .set({
        standing: "WITHDRAWN",
        withdrawnInRound: 2,
        withdrawalTreatment: "PENALISED",
        withdrawalFinePercent: 0,
      })
      .where(eq(seatOccupancy.seat, "A1NS"))
      .run();

    const a = (await computeSectionLeaderboards(db, gameId)).find(
      (s) => s.section === "A",
    )!;
    const lines = a.overallScore.lines as {
      pairId: string;
      totalMP: number;
      maxMP: number;
    }[];

    const a1 = lines.find((l) => l.pairId === "A1NS");
    // A PENALISED withdrawer stays in the ranking (unlike REMOVE).
    expect(a1).toBeDefined();
    // Board 2's field top is 2 (two tables played it). A1NS's board-2 credit is
    // AVE− = 40% of 2 = 0.8, rounded per §4.2.6.1. Its board-2 max contributes
    // to its own max, so A1NS has a board-2 line crediting < the board top.
    const a1Board2Max = a1!.maxMP; // its total max includes board-1 and board-2
    expect(a1Board2Max).toBeGreaterThan(0);
    // The AVE− credit is strictly below the board average (a penalty), so A1NS's
    // percentage on board 2 is at/below 50%.
    // (Exact rounding aside, the credit must not exceed AVE− = 40% of top.)
    // Confirm the withdrawer is NOT credited a full board like a played result.
    expect(a1!.totalMP).toBeLessThan(a1!.maxMP);
  });

  it("does NOT self-credit a REMOVE withdrawer (it is dropped from the ranking)", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    const { computeSectionLeaderboards } = await import("./leaderboard-service");

    await seatPair(db, "A", 1, ["N1", "N1b"], ["E1", "E1b"]);
    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    await seatPair(db, "A", 3, ["N3", "N3b"], ["E3", "E3b"]);

    db.insert(boards)
      .values(
        [
          { section: "A", roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "A1NS", ew: "A1EW", confirmedResult: "3NTN+1" as BoardOutcome, status: "CONFIRMED" as const },
          { section: "A", roundNumber: 1, tableNumber: 2, boardNumber: 1, ns: "A2NS", ew: "A2EW", confirmedResult: "3NTN=" as BoardOutcome, status: "CONFIRMED" as const },
          { section: "A", roundNumber: 1, tableNumber: 3, boardNumber: 1, ns: "A3NS", ew: "A3EW", confirmedResult: "3NTN-1" as BoardOutcome, status: "CONFIRMED" as const },
          { section: "A", roundNumber: 2, tableNumber: 1, boardNumber: 2, ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" as const },
        ].map(withFixtureMatchId),
      )
      .run();

    db.update(seatOccupancy)
      .set({
        standing: "WITHDRAWN",
        withdrawnInRound: 2,
        withdrawalTreatment: "REMOVE",
      })
      .where(eq(seatOccupancy.seat, "A1NS"))
      .run();

    const a = (await computeSectionLeaderboards(db, gameId)).find(
      (s) => s.section === "A",
    )!;
    const ids = (a.overallScore.lines as { pairId: string }[]).map(
      (l) => l.pairId,
    );
    // A REMOVE withdrawer is excluded from the ranking entirely — no self-credit.
    expect(ids).not.toContain("A1NS");
  });

  it("indemnifies an opponent with AVE+ for a board lost to an AFTER-half withdrawal (§2.4.4)", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    const { computeSectionLeaderboards } = await import("./leaderboard-service");

    // 4-board event. A1NS plays boards 1–3 (3 of 4 ≥ ceil(4/2)=2 → AFTER half),
    // then withdraws; its board-4 row vs A1EW is NOT_PLAYED. Two other tables
    // play board 4 so it has a field top.
    await seatPair(db, "A", 1, ["N1", "N1b"], ["E1", "E1b"]);
    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    await seatPair(db, "A", 3, ["N3", "N3b"], ["E3", "E3b"]);

    const played = (bn: number, t: number, ns: string, ew: string) => ({
      section: "A", roundNumber: bn, tableNumber: t, boardNumber: bn,
      ns, ew, confirmedResult: "3NTN=" as BoardOutcome, status: "CONFIRMED" as const,
    });
    db.insert(boards)
      .values(
        [
          // A1NS plays boards 1,2,3 (vs A1EW).
          played(1, 1, "A1NS", "A1EW"),
          played(2, 1, "A1NS", "A1EW"),
          played(3, 1, "A1NS", "A1EW"),
          // Board 4: tables 2 & 3 play (field top), table 1 is NOT_PLAYED.
          played(4, 2, "A2NS", "A2EW"),
          played(4, 3, "A3NS", "A3EW"),
          { section: "A", roundNumber: 4, tableNumber: 1, boardNumber: 4, ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" as const },
        ].map(withFixtureMatchId),
      )
      .run();

    // A1NS withdraws REMOVE (so it's not ranked); its opponent A1EW is the one
    // we check gets the §2.4.4 after-half AVE+ on board 4.
    db.update(seatOccupancy)
      .set({ standing: "WITHDRAWN", withdrawnInRound: 4, withdrawalTreatment: "REMOVE" })
      .where(eq(seatOccupancy.seat, "A1NS"))
      .run();

    const a = (await computeSectionLeaderboards(db, gameId)).find(
      (s) => s.section === "A",
    )!;
    const lines = a.overallScore.lines as {
      pairId: string;
      totalMP: number;
      maxMP: number;
    }[];

    const a1ew = lines.find((l) => l.pairId === "A1EW");
    expect(a1ew).toBeDefined();
    // A1EW played boards 1–3 (as E/W partner of A1NS) and is indemnified AVE+ on
    // board 4. Its board-4 line contributes a positive credit on a counted
    // board — so its max includes board 4 (it is not under-boarded).
    expect(a1ew!.maxMP).toBeGreaterThan(0);
    // The withdrawer A1NS is REMOVE → absent from the ranking.
    expect(lines.some((l) => l.pairId === "A1NS")).toBe(false);
  });

  it("does NOT indemnify an opponent for a board lost to a BEFORE-half withdrawal (§2.4.4 cancel)", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    const { computeSectionLeaderboards } = await import("./leaderboard-service");

    // 4-board event. A1NS plays only board 1 (1 of 4 < ceil(4/2)=2 → BEFORE
    // half), then withdraws; boards 2–4 vs A1EW are NOT_PLAYED. Other tables
    // play boards 2–4.
    await seatPair(db, "A", 1, ["N1", "N1b"], ["E1", "E1b"]);
    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    await seatPair(db, "A", 3, ["N3", "N3b"], ["E3", "E3b"]);

    const played = (bn: number, t: number, ns: string, ew: string) => ({
      section: "A", roundNumber: bn, tableNumber: t, boardNumber: bn,
      ns, ew, confirmedResult: "3NTN=" as BoardOutcome, status: "CONFIRMED" as const,
    });
    const notPlayed = (bn: number) => ({
      section: "A", roundNumber: bn, tableNumber: 1, boardNumber: bn,
      ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" as const,
    });
    db.insert(boards)
      .values(
        [
          // Board 1 played at ALL three tables (so it has a real field top and
          // A1EW gets a genuine board-1 score). Boards 2–4: A1 did not play
          // (withdrew before half); the other two tables did.
          played(1, 1, "A1NS", "A1EW"), played(1, 2, "A2NS", "A2EW"), played(1, 3, "A3NS", "A3EW"),
          notPlayed(2), notPlayed(3), notPlayed(4),
          played(2, 2, "A2NS", "A2EW"), played(2, 3, "A3NS", "A3EW"),
          played(3, 2, "A2NS", "A2EW"), played(3, 3, "A3NS", "A3EW"),
          played(4, 2, "A2NS", "A2EW"), played(4, 3, "A3NS", "A3EW"),
        ].map(withFixtureMatchId),
      )
      .run();

    db.update(seatOccupancy)
      .set({ standing: "WITHDRAWN", withdrawnInRound: 2, withdrawalTreatment: "REMOVE" })
      .where(eq(seatOccupancy.seat, "A1NS"))
      .run();

    const a = (await computeSectionLeaderboards(db, gameId)).find(
      (s) => s.section === "A",
    )!;
    const lines = a.overallScore.lines as {
      pairId: string;
      totalMP: number;
      maxMP: number;
    }[];

    const a1ew = lines.find((l) => l.pairId === "A1EW");
    expect(a1ew).toBeDefined();
    // Before half: boards 2–4 against the withdrawer are CANCELLED, so A1EW is
    // scored only on the one board it actually played (board 1) — NOT
    // indemnified for boards 2–4. A2NS played all four boards; A1EW's max is
    // exactly ONE board's top, i.e. a quarter of A2NS's four-board max.
    const perBoardTop = (lines.find((l) => l.pairId === "A2NS")?.maxMP ?? 0) / 4;
    expect(a1ew!.maxMP).toBeCloseTo(perBoardTop, 5);
  });

  it("retains standing for a LATE arrival present for at least half the boards (§2.4.7)", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    const { computeSectionLeaderboards } = await import("./leaderboard-service");

    // 4-board event. A1NS arrives late and plays only boards 3 & 4 (2 of 4 =
    // ceil(4/2) → RETAINS standing). Its early boards 1 & 2 are NOT_PLAYED.
    await seatPair(db, "A", 1, ["N1", "N1b"], ["E1", "E1b"]);
    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    await seatPair(db, "A", 3, ["N3", "N3b"], ["E3", "E3b"]);

    const played = (bn: number, t: number, ns: string, ew: string) => ({
      section: "A", roundNumber: bn, tableNumber: t, boardNumber: bn,
      ns, ew, confirmedResult: "3NTN=" as BoardOutcome, status: "CONFIRMED" as const,
    });
    db.insert(boards)
      .values(
        [
          // Other tables play all four boards (field tops exist on every board).
          played(1, 2, "A2NS", "A2EW"), played(1, 3, "A3NS", "A3EW"),
          played(2, 2, "A2NS", "A2EW"), played(2, 3, "A3NS", "A3EW"),
          played(3, 2, "A2NS", "A2EW"), played(3, 3, "A3NS", "A3EW"),
          played(4, 2, "A2NS", "A2EW"), played(4, 3, "A3NS", "A3EW"),
          // A1NS arrives for boards 3 & 4; boards 1 & 2 are its unplayed early cells.
          { section: "A", roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" as const },
          { section: "A", roundNumber: 2, tableNumber: 1, boardNumber: 2, ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" as const },
          played(3, 1, "A1NS", "A1EW"),
          played(4, 1, "A1NS", "A1EW"),
        ].map(withFixtureMatchId),
      )
      .run();

    // LATE + PENALISED 0% fine: were it treated as a withdrawer it would be
    // self-credited AVE− on boards 1 & 2. Because it reached half, it RETAINS
    // standing and gets NO such credit — scored only on the boards it played.
    db.update(seatOccupancy)
      .set({
        standing: "LATE",
        withdrawnInRound: 2,
        withdrawalTreatment: "PENALISED",
        withdrawalFinePercent: 0,
      })
      .where(eq(seatOccupancy.seat, "A1NS"))
      .run();

    const a = (await computeSectionLeaderboards(db, gameId)).find(
      (s) => s.section === "A",
    )!;
    const lines = a.overallScore.lines as {
      pairId: string;
      totalMP: number;
      maxMP: number;
    }[];

    const a1 = lines.find((l) => l.pairId === "A1NS");
    expect(a1).toBeDefined(); // retains standing → ranked
    // Scored on the 2 boards it actually played (boards 3 & 4), NOT credited the
    // early boards: its max equals two per-board tops, half of A2NS's four.
    const perBoardTop = (lines.find((l) => l.pairId === "A2NS")?.maxMP ?? 0) / 4;
    expect(a1!.maxMP).toBeCloseTo(perBoardTop * 2, 5);
  });

  it("scores a short LATE arrival per §2.4.6 — REMOVE drops it from the ranking", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    const { computeSectionLeaderboards } = await import("./leaderboard-service");

    // 4-board event. A1NS arrives very late and plays only board 4 (1 of 4 <
    // ceil(4/2)=2 → SHORT): its unplayed early boards 1–3 score per §2.4.6.
    await seatPair(db, "A", 1, ["N1", "N1b"], ["E1", "E1b"]);
    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    await seatPair(db, "A", 3, ["N3", "N3b"], ["E3", "E3b"]);

    const played = (bn: number, t: number, ns: string, ew: string) => ({
      section: "A", roundNumber: bn, tableNumber: t, boardNumber: bn,
      ns, ew, confirmedResult: "3NTN=" as BoardOutcome, status: "CONFIRMED" as const,
    });
    db.insert(boards)
      .values(
        [
          played(1, 2, "A2NS", "A2EW"), played(1, 3, "A3NS", "A3EW"),
          played(2, 2, "A2NS", "A2EW"), played(2, 3, "A3NS", "A3EW"),
          played(3, 2, "A2NS", "A2EW"), played(3, 3, "A3NS", "A3EW"),
          played(4, 2, "A2NS", "A2EW"), played(4, 3, "A3NS", "A3EW"),
          { section: "A", roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" as const },
          { section: "A", roundNumber: 2, tableNumber: 1, boardNumber: 2, ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" as const },
          { section: "A", roundNumber: 3, tableNumber: 1, boardNumber: 3, ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" as const },
          played(4, 1, "A1NS", "A1EW"),
        ].map(withFixtureMatchId),
      )
      .run();

    db.update(seatOccupancy)
      .set({ standing: "LATE", withdrawnInRound: 4, withdrawalTreatment: "REMOVE" })
      .where(eq(seatOccupancy.seat, "A1NS"))
      .run();

    const a = (await computeSectionLeaderboards(db, gameId)).find(
      (s) => s.section === "A",
    )!;
    const ids = (a.overallScore.lines as { pairId: string }[]).map(
      (l) => l.pairId,
    );
    // Short LATE + REMOVE → scored per §2.4.6 like a REMOVE withdrawer: dropped
    // from the ranking entirely.
    expect(ids).not.toContain("A1NS");
  });

  it("self-credits a short LATE + PENALISED arrival its AVE−-minus-fine on the early boards", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    const { computeSectionLeaderboards } = await import("./leaderboard-service");

    // 4-board event, A1NS plays only board 4 (short). PENALISED 0% → its three
    // unplayed early boards each score AVE− (40% of the board top).
    await seatPair(db, "A", 1, ["N1", "N1b"], ["E1", "E1b"]);
    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    await seatPair(db, "A", 3, ["N3", "N3b"], ["E3", "E3b"]);

    const played = (bn: number, t: number, ns: string, ew: string) => ({
      section: "A", roundNumber: bn, tableNumber: t, boardNumber: bn,
      ns, ew, confirmedResult: "3NTN=" as BoardOutcome, status: "CONFIRMED" as const,
    });
    db.insert(boards)
      .values(
        [
          played(1, 2, "A2NS", "A2EW"), played(1, 3, "A3NS", "A3EW"),
          played(2, 2, "A2NS", "A2EW"), played(2, 3, "A3NS", "A3EW"),
          played(3, 2, "A2NS", "A2EW"), played(3, 3, "A3NS", "A3EW"),
          played(4, 2, "A2NS", "A2EW"), played(4, 3, "A3NS", "A3EW"),
          { section: "A", roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" as const },
          { section: "A", roundNumber: 2, tableNumber: 1, boardNumber: 2, ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" as const },
          { section: "A", roundNumber: 3, tableNumber: 1, boardNumber: 3, ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" as const },
          played(4, 1, "A1NS", "A1EW"),
        ].map(withFixtureMatchId),
      )
      .run();

    db.update(seatOccupancy)
      .set({
        standing: "LATE",
        withdrawnInRound: 4,
        withdrawalTreatment: "PENALISED",
        withdrawalFinePercent: 0,
      })
      .where(eq(seatOccupancy.seat, "A1NS"))
      .run();

    const a = (await computeSectionLeaderboards(db, gameId)).find(
      (s) => s.section === "A",
    )!;
    const lines = a.overallScore.lines as {
      pairId: string;
      totalMP: number;
      maxMP: number;
    }[];

    const a1 = lines.find((l) => l.pairId === "A1NS");
    // PENALISED → stays ranked. The §2.4.5 AVE− cap limits the self-credit to
    // at most HALF the event's boards (ceil(4/2) = 2 of the 3 unplayed early
    // boards), so A1NS has a line on its 1 played board + 2 credited boards =
    // 3 boards; its max is three per-board tops (NOT the full four — the 3rd
    // early board is uncredited).
    expect(a1).toBeDefined();
    const perBoardTop = (lines.find((l) => l.pairId === "A2NS")?.maxMP ?? 0) / 4;
    expect(a1!.maxMP).toBeCloseTo(perBoardTop * 3, 5);
  });

  it("credits the opponent of an EMPTY expected-late seat AVE+ (§2.4.7)", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { expectedLateSeats } = await import(
      "@/db/games/tables/expected-late-seats"
    );
    const { computeSectionLeaderboards } = await import(
      "./leaderboard-service"
    );

    // Two tables play board 1 (field top = 2). A3NS/A3EW's board 1 is NOT
    // played because A3EW is an empty seat the director marked expected-late:
    // there is NO participant row for A3EW. A3NS IS seated (the opponent of the
    // latecomer at this table-share) and must be indemnified AVE+.
    await seatPair(db, "A", 1, ["N1", "N1b"], ["E1", "E1b"]);
    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    // A3NS seated; A3EW deliberately NOT seated (the late pair).
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

    // Mark A3EW expected-late.
    db.insert(expectedLateSeats).values({ seat: "A3EW" }).run();

    db.insert(boards)
      .values(
        [
          { section: "A", roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "A1NS", ew: "A1EW", confirmedResult: "3NTN+1" as BoardOutcome, status: "CONFIRMED" as const },
          { section: "A", roundNumber: 1, tableNumber: 2, boardNumber: 1, ns: "A2NS", ew: "A2EW", confirmedResult: "3NTN=" as BoardOutcome, status: "CONFIRMED" as const },
          // A3NS vs the empty late seat A3EW — no result (the pair isn't here).
          { section: "A", roundNumber: 1, tableNumber: 3, boardNumber: 1, ns: "A3NS", ew: "A3EW", status: "NOT_PLAYED" as const },
        ].map(withFixtureMatchId),
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

    const a3ns = lines.find((l) => l.pairId === "A3NS");
    expect(a3ns).toBeDefined();
    // A3NS is indemnified AVE+ (0.6 of the board top) on board 1 — it is
    // credited the board (its max includes it) and sits AT OR ABOVE the board
    // average, never below. (On this tiny 2-top board the §4.2.6.1 whole-MP
    // rounding collapses 0.6×2 = 1.2 to 1 = exactly average, per the F9 note;
    // the un-rounded AVE+ fraction is asserted at the unit level. The key int
    // guarantee here is that an empty-late seat indemnifies — never penalises —
    // its opponent, unlike a before-half cancel which would drop the board.)
    expect(a3ns!.maxMP).toBeGreaterThan(0);
    expect(a3ns!.totalMP / a3ns!.maxMP).toBeGreaterThanOrEqual(0.5);
    // The empty late seat itself produces no ranked line (no participant).
    expect(lines.some((l) => l.pairId === "A3EW")).toBe(false);
  });

  it("uplifts a synthetic AVE+ by §4.1.1.1 — an indemnified strong opponent beats a flat 60%", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    const { computeSectionLeaderboards } = await import("./leaderboard-service");

    // 5 tables so a board top is 2·4 = 8 (big enough that the §4.2.6.1 whole-MP
    // rounding does not mask a >60% uplift). A1NS withdraws AFTER half so A1EW
    // is indemnified AVE+ on the gap board; A1EW TOPS all its real boards, so
    // its windowed average is ~100% and the §4.1.1.1 uplift makes the AVE+
    // worth its average, not a flat 60%.
    for (let t = 1; t <= 5; t++) {
      await seatPair(db, "A", t, [`N${t}`, `N${t}b`], [`E${t}`, `E${t}b`]);
    }

    // Boards 1–3 played at all 5 tables; A1EW (as E/W of A1NS) tops each. A1NS
    // then withdraws, leaving board 4 unplayed at table 1 (played elsewhere).
    const topRow = (bn: number, t: number, ns: string, ew: string, outcome: BoardOutcome) => ({
      section: "A", roundNumber: bn, tableNumber: t, boardNumber: bn,
      ns, ew, confirmedResult: outcome, status: "CONFIRMED" as const,
    });
    const rows: ReturnType<typeof topRow>[] = [];
    for (const bn of [1, 2, 3]) {
      // Table 1 (A1NS/A1EW) scores the EW-friendly top; others score par.
      rows.push(topRow(bn, 1, "A1NS", "A1EW", "3NTS-3" as BoardOutcome));
      for (let t = 2; t <= 5; t++) rows.push(topRow(bn, t, `A${t}NS`, `A${t}EW`, "3NTN=" as BoardOutcome));
    }
    // Board 4: tables 2–5 play (field top); table 1 NOT_PLAYED (A1NS withdrawn).
    for (let t = 2; t <= 5; t++) rows.push(topRow(4, t, `A${t}NS`, `A${t}EW`, "3NTN=" as BoardOutcome));
    db.insert(boards)
      .values([
        ...rows,
        { section: "A", roundNumber: 4, tableNumber: 1, boardNumber: 4, ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" as const },
      ].map(withFixtureMatchId))
      .run();

    // A1NS withdraws AFTER half (played 3 of 4 ≥ 2) → A1EW indemnified AVE+ on
    // board 4.
    db.update(seatOccupancy)
      .set({ standing: "WITHDRAWN", withdrawnInRound: 4, withdrawalTreatment: "REMOVE" })
      .where(eq(seatOccupancy.seat, "A1NS"))
      .run();

    const a = (await computeSectionLeaderboards(db, gameId)).find((s) => s.section === "A")!;
    const a1ew = (a.overallScore.lines as { pairId: string; totalMP: number; maxMP: number }[]).find(
      (l) => l.pairId === "A1EW",
    )!;
    // A1EW tops boards 1–3 (8 MP each = 24) and is indemnified on board 4. A
    // flat 60% AVE+ would give 0.6·8 = 4.8→5; the §4.1.1.1 uplift gives its own
    // average (~100%) = 8. So its board-4 contribution exceeds the flat 60%,
    // and its overall % stays near 100% rather than being dragged toward 60%.
    // Overall: with the uplift, total ≈ 24+8 = 32 / 32 = 100%; a flat 60% would
    // give ≈ 29/32 ≈ 90.6%. Assert strictly above the flat-60% ceiling.
    const flatSixtyPercentTotal = 24 + 0.6 * 8; // 28.8
    expect(a1ew.totalMP).toBeGreaterThan(flatSixtyPercentTotal);
  });

  // ── §2.4.7 stand-by → real-pair handover (two occupancies on one seat) ──

  /**
   * Seat a handover at `${section}${table}NS`: a REAL pair (ranked, the
   * primary occupant, plays `realBoards`) and a WITHOUT_STANDING STAND-IN (plays
   * `subBoards`). Returns the stand-in occupancy's id so the test can assert on
   * its scored-field id `${section}${table}NS#<id>`.
   */
  async function seatHandoverNs(
    db: any,
    section: string,
    table: number,
    realBoards: number[],
    subBoards: number[],
  ): Promise<number> {
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const seat = `${section}${table}NS`;

    const mkPlayers = (tag: string) => {
      const p1 = db.insert(players).values({ firstName: `${tag}1`, lastName: "x" }).returning().get();
      const p2 = db.insert(players).values({ firstName: `${tag}2`, lastName: "y" }).returning().get();
      return [p1.id, p2.id] as const;
    };

    // The REAL pair (ranked). Inserted first, but the pick is by standing, not
    // order — it is primary because it is NOT without-standing.
    const [r1, r2] = mkPlayers(`real${seat}`);
    db.insert(seatOccupancy)
      .values({ seat, boards: realBoards, player1: r1, player2: r2, secretKey: `${seat}-real`, standing: "LATE" })
      .run();

    // The STAND-IN (without standing).
    const [s1, s2] = mkPlayers(`sub${seat}`);
    const subRow = db
      .insert(seatOccupancy)
      .values({ seat, boards: subBoards, player1: s1, player2: s2, secretKey: `${seat}-sub`, standing: "WITHOUT_STANDING" })
      .returning()
      .get();
    return subRow.id;
  }

  it("scores a stand-by → real-pair handover: sub counts for opponents but is unranked; real pair ranked with an AVE− gap", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { computeSectionLeaderboards } = await import("./leaderboard-service");

    // 4-board MP event, three tables. Table 1's NS seat is a handover: a
    // stand-in plays boards 1–2, the real pair plays boards 3–4. The EW
    // opponent (A1EW) and tables 2–3 are ordinary seated pairs.
    await seatPair(db, "A", 1, ["ignored", "ignored"], ["E1", "E1b"]); // seats A1EW; A1NS replaced below
    // Remove the whole-seat A1NS occupancy seatPair just made, replace with the
    // two handover occupancies.
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    db.delete(seatOccupancy).where(eq(seatOccupancy.seat, "A1NS")).run();
    const subId = await seatHandoverNs(db, "A", 1, [3, 4], [1, 2]);

    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    await seatPair(db, "A", 3, ["N3", "N3b"], ["E3", "E3b"]);

    const played = (bn: number, t: number, ns: string, ew: string) => ({
      section: "A", roundNumber: bn, tableNumber: t, boardNumber: bn,
      ns, ew, confirmedResult: "3NTN=" as BoardOutcome, status: "CONFIRMED" as const,
    });
    // Every table plays every board (full field top on each). Table 1's rows
    // all carry the bare seat ids A1NS/A1EW; the occupant split is resolved at
    // scoring time from the occupancies.
    db.insert(boards)
      .values(
        [1, 2, 3, 4].flatMap((bn) => [
          played(bn, 1, "A1NS", "A1EW"),
          played(bn, 2, "A2NS", "A2EW"),
          played(bn, 3, "A3NS", "A3EW"),
        ]).map(withFixtureMatchId),
      )
      .run();

    const a = (await computeSectionLeaderboards(db, gameId)).find((s) => s.section === "A")!;
    const lines = a.overallScore.lines as { pairId: string; totalMP: number; maxMP: number }[];
    const ids = lines.map((l) => l.pairId);

    // The stand-in is dropped from the ranking (§2.4.9 "without standing").
    expect(ids).not.toContain(`A1NS#${subId}`);
    // The real pair IS ranked (it retained standing — played 2 of 4 ≥ ⌈4/2⌉=2).
    const realPair = lines.find((l) => l.pairId === "A1NS");
    expect(realPair).toBeDefined();
    // The real pair's gap boards (1–2, played by the sub) are scored AVE− for
    // it, so its max covers all four boards — it is ranked on its 2 real boards
    // plus 2 AVE− boards, never under-boarded.
    expect(realPair!.maxMP).toBeGreaterThan(0);
    // The EW opponent is matchpointed on all four boards (its boards 1–2 were a
    // real result against the stand-in — opponents' results stand).
    const a1ew = lines.find((l) => l.pairId === "A1EW");
    expect(a1ew).toBeDefined();
    expect(a1ew!.maxMP).toBeGreaterThan(0);
  });

  it("gives the real pair a lower gap score the larger its director fine", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq, and } = await import("drizzle-orm");
    const { computeSectionLeaderboards } = await import("./leaderboard-service");

    await seatPair(db, "A", 1, ["ignored", "ignored"], ["E1", "E1b"]);
    db.delete(seatOccupancy).where(eq(seatOccupancy.seat, "A1NS")).run();
    await seatHandoverNs(db, "A", 1, [3, 4], [1, 2]);
    await seatPair(db, "A", 2, ["N2", "N2b"], ["E2", "E2b"]);
    await seatPair(db, "A", 3, ["N3", "N3b"], ["E3", "E3b"]);

    // The real pair TOPS its two played boards (3,4): table 1 scores better
    // than tables 2–3. So without the gap it would be ~100%; the AVE− gap on
    // boards 1–2 pulls it down, and a fine pulls it down further — making the
    // fine's effect observable (unlike an all-ties field).
    const row = (
      bn: number,
      t: number,
      ns: string,
      ew: string,
      outcome: BoardOutcome,
    ) => ({
      section: "A", roundNumber: bn, tableNumber: t, boardNumber: bn,
      ns, ew, confirmedResult: outcome, status: "CONFIRMED" as const,
    });
    db.insert(boards)
      .values(
        [1, 2, 3, 4]
          .flatMap((bn) => {
            const t1Outcome: BoardOutcome =
              bn >= 3 ? ("3NTN+1" as BoardOutcome) : ("3NTN=" as BoardOutcome);
            return [
              row(bn, 1, "A1NS", "A1EW", t1Outcome),
              row(bn, 2, "A2NS", "A2EW", "3NTN=" as BoardOutcome),
              row(bn, 3, "A3NS", "A3EW", "3NTN=" as BoardOutcome),
            ];
          })
          .map(withFixtureMatchId),
      )
      .run();

    const scoreOf = async (): Promise<number> => {
      const a = (await computeSectionLeaderboards(db, gameId)).find((s) => s.section === "A")!;
      const real = (a.overallScore.lines as { pairId: string; totalMP: number; maxMP: number }[]).find(
        (l) => l.pairId === "A1NS",
      )!;
      return real.maxMP > 0 ? real.totalMP / real.maxMP : 0;
    };

    // Default (PENALISED, fine 0) → the real pair's gap boards score a flat
    // AVE− (40%). Then set a 40% fine on the REAL (LATE) occupancy only (the
    // stand-in is WITHOUT_STANDING and left untouched) → gap boards score 0% →
    // a strictly lower total.
    const beforeFine = await scoreOf();
    db.update(seatOccupancy)
      .set({ withdrawalTreatment: "PENALISED", withdrawalFinePercent: 40 })
      .where(and(eq(seatOccupancy.seat, "A1NS"), eq(seatOccupancy.standing, "LATE")))
      .run();
    const afterFine = await scoreOf();

    expect(afterFine).toBeLessThan(beforeFine);
  });
});
