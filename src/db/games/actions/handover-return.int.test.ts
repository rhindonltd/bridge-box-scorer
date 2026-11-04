// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";
import type { PairSeat } from "@/model/participants";
import { withFixtureMatchId, seedFixtureMatch } from "@/mocks/fixtures/db-rows";

/**
 * Integration coverage for a §2.4.7 handover in which the arriving pair is one
 * that already played the seat (the original pair returning after a substitute,
 * or the substitute coming back), plus the teams pair cap, against a real
 * migrated per-game SQLite file. A return is just a handover whose names match
 * an earlier occupant — there is no separate "hand back" operation.
 *
 * The seat is A1NS and plays boards 1..6; boards are scored by giving them a
 * confirmed result, which is what the handover's board split reads.
 */
let tmpDir: string;
let gameId: string;

describe("handoverSeat — a pair returning to the seat", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "handover-return-"));
    process.env.DATABASE_GAMES_URL = tmpDir;
    gameId = `game-${Math.random().toString(16).slice(2)}`;
    vi.resetModules();
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
    vi.resetModules();
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

  /** Seat a whole-seat pair at `seat`, returning its occupancy id. */
  async function seatPairAt(
    db: any,
    seat: string,
    first: string,
  ): Promise<number> {
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const p1 = db
      .insert(players)
      .values({ firstName: `${first}1`, lastName: "X" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: `${first}2`, lastName: "X" })
      .returning()
      .get();
    const row = db
      .insert(seatOccupancy)
      .values({
        seat,
        boards: null,
        player1: p1.id,
        player2: p2.id,
        secretKey: `${first}-secret`,
      })
      .returning()
      .get();
    return row.id;
  }

  /** Lay boards on A1NS/A1EW; `withResult` already carry a confirmed result. */
  async function layBoards(
    db: any,
    boardNumbers: number[],
    withResult: number[],
  ) {
    const { boards } = await import("@/db/games/tables/boards");
    const resultSet = new Set(withResult);
    const rows = boardNumbers.map((boardNumber) => ({
      section: "A",
      roundNumber: boardNumber,
      tableNumber: 1,
      boardNumber,
      ns: "A1NS",
      ew: "A1EW",
      confirmedResult: resultSet.has(boardNumber)
        ? ("3NTN=" as BoardOutcome)
        : null,
      status: resultSet.has(boardNumber) ? ("CONFIRMED" as const) : null,
    }));
    db.insert(boards).values(rows.map(withFixtureMatchId)).run();
  }

  /** Score more boards (give them a confirmed result). */
  async function scoreBoards(db: any, boardNumbers: number[]) {
    const { boards } = await import("@/db/games/tables/boards");
    const { eq } = await import("drizzle-orm");
    for (const boardNumber of boardNumbers) {
      db.update(boards)
        .set({ confirmedResult: "3NTN=" as BoardOutcome, status: "CONFIRMED" })
        .where(eq(boards.boardNumber, boardNumber))
        .run();
    }
  }

  async function occupanciesAt(db: any, seat: PairSeat = "A1NS") {
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    return db
      .select()
      .from(seatOccupancy)
      .where(eq(seatOccupancy.seat, seat))
      .all();
  }

  const realPair = {
    player1: { firstName: "Sub", lastName: "One" },
    player2: { firstName: "Sub", lastName: "Two" },
  };

  /** The original pair's names as seated by `seatPairAt(db, seat, "Orig")`. */
  const originalPair = {
    player1: { firstName: "Orig1", lastName: "X" },
    player2: { firstName: "Orig2", lastName: "X" },
  };

  /** Hand the seat over to `pair` (by names) — a return when they match. */
  async function handTo(
    pair: typeof realPair,
    secretKey: string,
    teamsGame?: boolean,
  ) {
    const { handoverSeat } = await import("./handover-seat");
    return handoverSeat(gameId, {
      seat: "A1NS",
      realPair: pair,
      secretKey,
      teamsGame,
    });
  }

  /** Seat the original, lay boards 1–6 with 1–2 scored, hand over to a sub. */
  async function handedOver(db: any) {
    const originalId = await seatPairAt(db, "A1NS", "Orig");
    await layBoards(db, [1, 2, 3, 4, 5, 6], [1, 2]);
    const { handoverSeat } = await import("./handover-seat");
    const result = await handoverSeat(gameId, {
      seat: "A1NS",
      realPair,
      secretKey: "sub-secret",
    });
    expect(result.ok).toBe(true);
    const occ = await occupanciesAt(db);
    const subId = occ.find((o: any) => o.id !== originalId)!.id;
    return { originalId, subId };
  }

  it("hands the original pair back in for the unplayed boards (non-contiguous set)", async () => {
    const db = await setup();
    const { originalId, subId } = await handedOver(db);
    // The substitute plays boards 3 and 4; 5 and 6 are still to come.
    await scoreBoards(db, [3, 4]);

    const result = await handTo(originalPair, "orig-new-secret");
    expect(result.ok).toBe(true);

    const occ = await occupanciesAt(db);
    // Still exactly two occupancies — the original is reused, not duplicated.
    expect(occ).toHaveLength(2);
    const original = occ.find((o: any) => o.id === originalId)!;
    const sub = occ.find((o: any) => o.id === subId)!;

    expect(original.boards).toEqual([1, 2, 5, 6]);
    expect(original.isArrivalAnchor).toBe(1);
    expect(original.secretKey).toBe("orig-new-secret");

    expect(sub.boards).toEqual([3, 4]);
    expect(sub.isArrivalAnchor).toBe(0);
    // The leaving pair's token was rotated away.
    expect(sub.secretKey).not.toBe("sub-secret");
  });

  it("can hand back and forth: the substitute comes in again", async () => {
    const db = await setup();
    const { originalId, subId } = await handedOver(db);
    await scoreBoards(db, [3, 4]);

    await handTo(originalPair, "k1");
    // The original plays board 5; the substitute then returns for board 6.
    await scoreBoards(db, [5]);
    const second = await handTo(realPair, "k2");
    expect(second.ok).toBe(true);

    const occ = await occupanciesAt(db);
    expect(occ).toHaveLength(2);
    const original = occ.find((o: any) => o.id === originalId)!;
    const sub = occ.find((o: any) => o.id === subId)!;

    expect(original.boards).toEqual([1, 2, 5]);
    expect(original.isArrivalAnchor).toBe(0);
    expect(sub.boards).toEqual([3, 4, 6]);
    expect(sub.isArrivalAnchor).toBe(1);
    expect(sub.secretKey).toBe("k2");
  });

  it("collapses back to a single whole-seat pair when the leaving pair played nothing", async () => {
    const db = await setup();
    const { originalId } = await handedOver(db);
    // The substitute has not played a board yet — hand straight back.

    const result = await handTo(originalPair, "orig-new-secret");
    expect(result.ok).toBe(true);

    const occ = await occupanciesAt(db);
    expect(occ).toHaveLength(1);
    expect(occ[0]).toMatchObject({
      id: originalId,
      boards: null,
      standing: "ACTIVE",
      isArrivalAnchor: 0,
      isMainLine: 0,
      split: 0,
      secretKey: "orig-new-secret",
    });
  });

  it("keeps the director's split and main-pair choices through a return", async () => {
    const db = await setup();
    const { originalId, subId } = await handedOver(db);
    await scoreBoards(db, [3]);

    const { setSubstitutionOptions } =
      await import("./set-substitution-options");
    await setSubstitutionOptions(gameId, "A1NS", {
      split: true,
      eligibility: [
        { id: originalId, eligible: true },
        { id: subId, eligible: false },
      ],
    });

    await handTo(originalPair, "k");

    const occ = await occupanciesAt(db);
    const sub = occ.find((o: any) => o.id === subId)!;
    expect(occ.every((o: any) => o.split === 1)).toBe(true);
    expect(sub.standing).toBe("WITHOUT_STANDING");
  });

  it("recognises the returning pair whatever the case, spacing or seat order", async () => {
    const db = await setup();
    const { originalId } = await handedOver(db);
    await scoreBoards(db, [3]);

    const result = await handTo(
      {
        player1: { firstName: " orig2 ", lastName: "x" },
        player2: { firstName: "ORIG1", lastName: "X" },
      },
      "k",
    );
    expect(result.ok).toBe(true);

    const occ = await occupanciesAt(db);
    expect(occ).toHaveLength(2);
    expect(occ.find((o: any) => o.id === originalId)!.isArrivalAnchor).toBe(1);
  });

  it("matches by EBU number when both sides have one, ignoring the names", async () => {
    const db = await setup();
    const { players } = await import("@/db/games/tables/players");
    const { eq } = await import("drizzle-orm");
    const { originalId } = await handedOver(db);
    // Give the original pair EBU numbers.
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const orig = db
      .select()
      .from(seatOccupancy)
      .where(eq(seatOccupancy.id, originalId))
      .get()!;
    db.update(players)
      .set({ nationalId: "111" })
      .where(eq(players.id, orig.player1))
      .run();
    db.update(players)
      .set({ nationalId: "222" })
      .where(eq(players.id, orig.player2))
      .run();
    await scoreBoards(db, [3]);

    const result = await handTo(
      {
        player1: {
          firstName: "Bob",
          lastName: "Spelt Differently",
          nationalId: "111",
        } as never,
        player2: {
          firstName: "Al",
          lastName: "Other",
          nationalId: "222",
        } as never,
      },
      "k",
    );
    expect(result.ok).toBe(true);
    expect(await occupanciesAt(db)).toHaveLength(2);
  });

  it("rejects handing over to the pair already playing the seat", async () => {
    const db = await setup();
    await seatPairAt(db, "A1NS", "Orig");
    await layBoards(db, [1, 2, 3], [1]);

    const result = await handTo(originalPair, "k");
    expect(result).toEqual({
      ok: false,
      error: "That pair is already playing this seat.",
    });
  });

  it("rejects a return when every board already has a result", async () => {
    const db = await setup();
    await handedOver(db);
    await scoreBoards(db, [3, 4, 5, 6]);

    const result = await handTo(originalPair, "k");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/nothing to hand over/);
  });
});

describe("handoverSeat — a different pair after a substitute", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hand-over-twice-"));
    process.env.DATABASE_GAMES_URL = tmpDir;
    gameId = `game-${Math.random().toString(16).slice(2)}`;
    vi.resetModules();
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
    vi.resetModules();
  });

  it("rejects a third pair, naming the earlier pair who may take it back", async () => {
    const games = await import("@/db/games");
    const create = await import("@/db/games/actions/create-game");
    await create.createGameDb(gameId);
    const db = (await games.getDb(gameId))!;
    seedFixtureMatch(db);

    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { boards } = await import("@/db/games/tables/boards");
    const mk = (first: string) =>
      db
        .insert(players)
        .values({ firstName: first, lastName: "X" })
        .returning()
        .get();
    db.insert(seatOccupancy)
      .values({
        seat: "A1NS",
        boards: null,
        player1: mk("a").id,
        player2: mk("b").id,
        secretKey: "s",
      })
      .run();
    db.insert(boards)
      .values(
        [1, 2, 3].map((boardNumber) =>
          withFixtureMatchId({
            section: "A",
            roundNumber: boardNumber,
            tableNumber: 1,
            boardNumber,
            ns: "A1NS",
            ew: "A1EW",
            confirmedResult:
              boardNumber === 1 ? ("3NTN=" as BoardOutcome) : null,
            status: boardNumber === 1 ? ("CONFIRMED" as const) : null,
          }),
        ),
      )
      .run();

    const { handoverSeat } = await import("./handover-seat");
    const pair = (n: string) => ({
      player1: { firstName: n, lastName: "One" },
      player2: { firstName: n, lastName: "Two" },
    });
    expect(
      (
        await handoverSeat(gameId, {
          seat: "A1NS",
          realPair: pair("S1"),
          secretKey: "k1",
        })
      ).ok,
    ).toBe(true);
    const again = await handoverSeat(gameId, {
      seat: "A1NS",
      realPair: pair("S2"),
      secretKey: "k2",
    });
    expect(again.ok).toBe(false);
    expect(again.error).toBe(
      "This seat already has a substitute. Only the pair who played it earlier (a X & b X) can take it back.",
    );
  });
});

describe("handoverSeat — teams pair cap", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "team-cap-"));
    process.env.DATABASE_GAMES_URL = tmpDir;
    gameId = `game-${Math.random().toString(16).slice(2)}`;
    vi.resetModules();
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
    vi.resetModules();
  });

  /** A team at table 1: NS and EW pairs, boards 1–4 on both, board 1 scored. */
  async function seatTeam() {
    const games = await import("@/db/games");
    const create = await import("@/db/games/actions/create-game");
    await create.createGameDb(gameId);
    const db = (await games.getDb(gameId))!;
    seedFixtureMatch(db);

    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { boards } = await import("@/db/games/tables/boards");
    const mk = (first: string) =>
      db
        .insert(players)
        .values({ firstName: first, lastName: "X" })
        .returning()
        .get();
    for (const seat of ["A1NS", "A1EW"] as const) {
      db.insert(seatOccupancy)
        .values({
          seat,
          boards: null,
          player1: mk(`${seat}a`).id,
          player2: mk(`${seat}b`).id,
          secretKey: `${seat}-s`,
        })
        .run();
    }
    db.insert(boards)
      .values(
        [1, 2, 3, 4].map((boardNumber) =>
          withFixtureMatchId({
            section: "A",
            roundNumber: boardNumber,
            tableNumber: 1,
            boardNumber,
            ns: "A1NS",
            ew: "A1EW",
            confirmedResult:
              boardNumber === 1 ? ("3NTN=" as BoardOutcome) : null,
            status: boardNumber === 1 ? ("CONFIRMED" as const) : null,
          }),
        ),
      )
      .run();
  }

  const pair = (n: string) => ({
    player1: { firstName: n, lastName: "One" },
    player2: { firstName: n, lastName: "Two" },
  });

  it("allows one substitute per team and rejects a second on the other seat", async () => {
    await seatTeam();
    const { handoverSeat } = await import("./handover-seat");

    const first = await handoverSeat(gameId, {
      seat: "A1NS",
      realPair: pair("S1"),
      secretKey: "k1",
      teamsGame: true,
    });
    expect(first.ok).toBe(true);

    // The team now has three pairs (NS original + NS substitute + EW): a
    // substitute on the EW seat would make it four (eight players).
    const second = await handoverSeat(gameId, {
      seat: "A1EW",
      realPair: pair("S2"),
      secretKey: "k2",
      teamsGame: true,
    });
    expect(second.ok).toBe(false);
    expect(second.error).toMatch(/at most six players/);
  });

  it("does not apply the cap to a pairs game (NS and EW are unrelated contestants)", async () => {
    await seatTeam();
    const { handoverSeat } = await import("./handover-seat");

    expect(
      (
        await handoverSeat(gameId, {
          seat: "A1NS",
          realPair: pair("S1"),
          secretKey: "k1",
        })
      ).ok,
    ).toBe(true);
    expect(
      (
        await handoverSeat(gameId, {
          seat: "A1EW",
          realPair: pair("S2"),
          secretKey: "k2",
        })
      ).ok,
    ).toBe(true);
  });

  it("a returning pair does not count against the cap: the original can come back after the one substitute", async () => {
    await seatTeam();
    const { handoverSeat } = await import("./handover-seat");

    await handoverSeat(gameId, {
      seat: "A1NS",
      realPair: pair("S1"),
      secretKey: "k1",
      teamsGame: true,
    });
    // The original NS pair (seated by seatTeam as "A1NSa X" / "A1NSb X").
    const back = await handoverSeat(gameId, {
      seat: "A1NS",
      realPair: {
        player1: { firstName: "A1NSa", lastName: "X" },
        player2: { firstName: "A1NSb", lastName: "X" },
      },
      secretKey: "k2",
      teamsGame: true,
    });
    expect(back.ok).toBe(true);
  });
});
