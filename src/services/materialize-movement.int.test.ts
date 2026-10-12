// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

import type { MaterializableMovement } from "@/services/materialize-movement";

let tmpDir: string;
let gameId: string;

describe("section-aware materialization", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "materialize-"));
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

  // A tiny 2-table, 1-round movement: table 1 plays boards 1-2, table 2 plays
  // boards 3-4.
  const twoTable: MaterializableMovement = [
    {
      tableNumber: 1,
      rounds: [{ roundNumber: 1, ns: "1", ew: "3", boardStart: 1, boardEnd: 2 }],
    },
    {
      tableNumber: 2,
      rounds: [{ roundNumber: 1, ns: "2", ew: "4", boardStart: 3, boardEnd: 4 }],
    },
  ];

  it("writes section-tagged boards and stamps each occupancy's anchor id", async () => {
    const db = await setup();
    const { materializePairLikeMovement } = await import(
      "@/services/materialize-movement"
    );
    const { boards } = await import("@/db/games/tables/boards");
    const { seatOccupancy } = await import(
      "@/db/games/tables/seat-occupancy"
    );
    const { players } = await import("@/db/games/tables/players");
    const { eq } = await import("drizzle-orm");

    // Seat the four pairs FIRST (occupancy exists before materialisation, as in
    // the real start flow). The physical seats are B1NS/B1EW/B2NS/B2EW; the
    // movement's bare ids ("1"/"3"/...) become the board ids "B1"/"B3"/...
    for (const seat of ["B1NS", "B1EW", "B2NS", "B2EW"]) {
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
          seat: seat as `${string}${number}NS` | `${string}${number}EW`,
          boards: null,
          player1: p1.id,
          player2: p2.id,
          secretKey: seat,
        })
        .run();
    }

    await materializePairLikeMovement("B", twoTable, gameId);

    const boardRows = db.select().from(boards).all();
    expect(boardRows).toHaveLength(4);
    expect(boardRows.every((b) => b.section === "B")).toBe(true);
    expect(boardRows.every((b) => b.status === "NOT_PLAYED")).toBe(true);

    // Board ns/ew carry the bare section-qualified movement ids.
    const board1 = boardRows.find((b) => b.boardNumber === 1)!;
    expect(board1.ns).toBe("B1");
    expect(board1.ew).toBe("B3");

    // Materialisation stamped each seat's occupancy with the anchor id written
    // to its board rows, bridging the physical seat ("B1NS") to the board id
    // ("B1") so the schedule / name joins hold.
    const anchorOf = (seat: string) =>
      db
        .select({ anchorId: seatOccupancy.anchorId })
        .from(seatOccupancy)
        .where(eq(seatOccupancy.seat, seat as `${string}${number}NS`))
        .get()?.anchorId;
    expect(anchorOf("B1NS")).toBe("B1");
    expect(anchorOf("B1EW")).toBe("B3");
    expect(anchorOf("B2NS")).toBe("B2");
    expect(anchorOf("B2EW")).toBe("B4");
  });

  it("defaults the board copy to 'A' when the round omits it", async () => {
    const db = await setup();
    const { materializePairLikeMovement } = await import(
      "@/services/materialize-movement"
    );
    const { boards } = await import("@/db/games/tables/boards");

    await materializePairLikeMovement("A", twoTable, gameId);

    const boardRows = db.select().from(boards).all();
    expect(boardRows.every((b) => b.copy === "A")).toBe(true);
  });

  it("persists per-round board copies for a Web movement", async () => {
    const db = await setup();
    const { materializePairLikeMovement } = await import(
      "@/services/materialize-movement"
    );
    const { boards } = await import("@/db/games/tables/boards");

    // Table 1 on copy A, table 2 on copy B (mirrors the even-Web halves).
    const webLike: MaterializableMovement = [
      {
        tableNumber: 1,
        rounds: [
          {
            roundNumber: 1,
            ns: "1",
            ew: "3",
            boardStart: 1,
            boardEnd: 2,
            boardCopy: "A",
          },
        ],
      },
      {
        tableNumber: 2,
        rounds: [
          {
            roundNumber: 1,
            ns: "2",
            ew: "4",
            boardStart: 1,
            boardEnd: 2,
            boardCopy: "B",
          },
        ],
      },
    ];

    await materializePairLikeMovement("A", webLike, gameId);

    const boardRows = db.select().from(boards).all();
    expect(boardRows.filter((b) => b.tableNumber === 1).every((b) => b.copy === "A")).toBe(true);
    expect(boardRows.filter((b) => b.tableNumber === 2).every((b) => b.copy === "B")).toBe(true);
  });

  it("marks sit-out rounds with SIT_OUT status", async () => {
    const db = await setup();
    const { materializePairLikeMovement } = await import(
      "@/services/materialize-movement"
    );
    const { boards } = await import("@/db/games/tables/boards");
    const { eq } = await import("drizzle-orm");

    const withSitOut: MaterializableMovement = [
      {
        tableNumber: 1,
        rounds: [
          {
            roundNumber: 1,
            ns: "1",
            ew: "3",
            boardStart: 1,
            boardEnd: 2,
            sitOut: true,
          },
        ],
      },
    ];

    await materializePairLikeMovement("A", withSitOut, gameId);

    const sitOutRows = db
      .select()
      .from(boards)
      .where(eq(boards.status, "SIT_OUT"))
      .all();
    expect(sitOutRows).toHaveLength(2);
  });

  it("materializes multiple sections sharing board numbers in one transaction", async () => {
    const db = await setup();
    const { materializeSections } = await import(
      "@/services/materialize-movement"
    );
    const { boards } = await import("@/db/games/tables/boards");

    // Both sections play the same board numbers (1-4) at the same table
    // numbers; section keying keeps them distinct.
    await materializeSections(gameId, [
      { section: "A", movement: twoTable },
      { section: "B", movement: twoTable },
    ]);

    const boardRows = db.select().from(boards).all();
    expect(boardRows).toHaveLength(8);
    expect(boardRows.filter((b) => b.section === "A")).toHaveLength(4);
    expect(boardRows.filter((b) => b.section === "B")).toHaveLength(4);

    // Same (round, table, board) exists in both sections without collision.
    const a1 = boardRows.find(
      (b) =>
        b.section === "A" &&
        b.roundNumber === 1 &&
        b.tableNumber === 1 &&
        b.boardNumber === 1,
    );
    const b1 = boardRows.find(
      (b) =>
        b.section === "B" &&
        b.roundNumber === 1 &&
        b.tableNumber === 1 &&
        b.boardNumber === 1,
    );
    expect(a1).toBeDefined();
    expect(b1).toBeDefined();
  });
});
