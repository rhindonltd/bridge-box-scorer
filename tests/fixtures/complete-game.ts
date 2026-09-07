import { APIRequestContext, expect } from "@playwright/test";
import { io as ioClient, Socket } from "socket.io-client";
import Database from "better-sqlite3";
import path from "node:path";

/**
 * Confirm every playable board instance in a started game by submitting a
 * matching Pass Out from BOTH sides of each (round, table, board), over a
 * direct socket connection from the test process. Leaves every pair's schedule
 * complete (so "all results in").
 *
 * A Howell rotates each pair's table and opponents every round, so driving a
 * single pair to completion through the UI is fragile. The board set is fully
 * described by the boards API: for each board number we read its instances
 * (round/table/status) and confirm the non-sit-out ones. Submitting from both
 * the NS and EW seat of a table/round matches server-side and flips the board
 * to CONFIRMED, exactly as two tablets would.
 *
 * `game:submitResult` is player-authorised: each submission must carry the
 * seat's secret token (issued at join). We read those secrets directly from the
 * game's SQLite file (the seating already happened through the UI before this
 * runs) and attach the matching token to every submission.
 */
export async function confirmEntireGame(
  request: APIRequestContext,
  gameId: string,
  section = "A",
): Promise<void> {
  const seatSecrets = readSeatSecrets(gameId);

  const boardsRes = await request.get(`/api/games/${gameId}/boards`);
  expect(boardsRes.ok()).toBeTruthy();
  const boardNumbers: number[] = (await boardsRes.json()).result.boards;

  type Instance = {
    roundNumber: number;
    tableNumber: number;
    boardNumber: number;
  };
  const instances: Instance[] = [];
  for (const boardNumber of boardNumbers) {
    const res = await request.get(`/api/games/${gameId}/boards/${boardNumber}`);
    expect(res.ok()).toBeTruthy();
    const rows: Array<Instance & { status: string | null }> = (
      await res.json()
    ).result.instances;
    for (const row of rows) {
      if (row.status === "SIT_OUT") continue;
      instances.push({
        roundNumber: row.roundNumber,
        tableNumber: row.tableNumber,
        boardNumber: row.boardNumber,
      });
    }
  }

  const socket: Socket = ioClient("http://localhost:3000");
  try {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(
        () => reject(new Error("socket connect timeout")),
        10_000,
      );
      socket.on("connect", () => {
        clearTimeout(t);
        resolve();
      });
    });

    const submit = (seat: string, inst: Instance) =>
      new Promise<{ success: boolean; error?: string }>((resolve) => {
        const token = seatSecrets.get(seat);
        if (!token) {
          throw new Error(`No secret token found for seat ${seat}`);
        }
        socket.emit(
          "game:submitResult",
          {
            gameId,
            seat,
            token,
            roundNumber: inst.roundNumber,
            tableNumber: inst.tableNumber,
            boardNumber: inst.boardNumber,
            result: "PO",
          },
          (res: { success: boolean; error?: string }) => resolve(res),
        );
      });

    for (const inst of instances) {
      // Submit both seats of a single instance back-to-back so the board
      // confirms (and its pending submissions clear) before the next one.
      const ns = await submit(`${section}${inst.tableNumber}NS`, inst);
      expect(ns.success, `NS submit failed: ${ns.error}`).toBeTruthy();
      const ew = await submit(`${section}${inst.tableNumber}EW`, inst);
      expect(ew.success, `EW submit failed: ${ew.error}`).toBeTruthy();
    }
  } finally {
    socket.disconnect();
  }
}

/**
 * Read every seat's secret token straight from the game's SQLite file, keyed by
 * the section-qualified initial seat (e.g. "A1NS"). This mirrors how the
 * participant-auth middleware looks up the seat secret server-side.
 */
function readSeatSecrets(gameId: string): Map<string, string> {
  const dataDir = process.env.DATABASE_GAMES_URL ?? "./data/games";
  const dbFile = path.join(dataDir, `${gameId}.db`);

  const db = new Database(dbFile, { readonly: true });
  try {
    const rows = db
      .prepare("SELECT initial_seat AS seat, secret_key AS secret FROM participant")
      .all() as Array<{ seat: string; secret: string }>;

    const map = new Map<string, string>();
    for (const row of rows) {
      map.set(row.seat, row.secret);
    }
    return map;
  } finally {
    db.close();
  }
}
