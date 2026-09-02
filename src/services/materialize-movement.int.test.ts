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

  it("writes section-tagged boards and section-qualified assignments", async () => {
    const db = await setup();
    const { materializePairLikeMovement } = await import(
      "@/services/materialize-movement"
    );
    const { boards } = await import("@/db/games/tables/boards");
    const { assignments } = await import("@/db/games/tables/assignments");

    await materializePairLikeMovement("B", twoTable, gameId);

    const boardRows = db.select().from(boards).all();
    expect(boardRows).toHaveLength(4);
    expect(boardRows.every((b) => b.section === "B")).toBe(true);
    expect(boardRows.every((b) => b.status === "NOT_PLAYED")).toBe(true);

    const assignmentRows = db.select().from(assignments).all();
    const seats = assignmentRows.map((a) => a.initialSeat).sort();
    expect(seats).toEqual(["B1EW", "B1NS", "B2EW", "B2NS"]);
    // Assignment ids are the section-qualified movement participant ids, and
    // match the board ns/ew values so the schedule join holds.
    const byId = Object.fromEntries(
      assignmentRows.map((a) => [a.id, a.initialSeat]),
    );
    expect(byId["B1"]).toBe("B1NS");
    expect(byId["B3"]).toBe("B1EW");

    // Board ns/ew use the same section-qualified ids.
    const board1 = boardRows.find((b) => b.boardNumber === 1)!;
    expect(board1.ns).toBe("B1");
    expect(board1.ew).toBe("B3");
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
