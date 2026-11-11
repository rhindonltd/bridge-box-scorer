import { expect, type Page } from "@playwright/test";
import { E2E_BASE_URL, E2E_GAMES_DIR } from "../e2e-env";
import { io as ioClient, Socket } from "socket.io-client";
import Database from "better-sqlite3";
import path from "node:path";
import { gotoStable } from "../journeys/support";

/**
 * Helpers for driving a Swiss Pairs game round by round: score a whole round
 * over a socket from the test process, draw the next round from the Movement
 * screen, and read where pairs sat from the game's SQLite file.
 */

/** Read each seat's secret token from the game's SQLite file (seat -> token). */
function readSeatSecrets(gameId: string): Map<string, string> {
  const dataDir = E2E_GAMES_DIR;
  const db = new Database(path.join(dataDir, `${gameId}.db`), {
    readonly: true,
  });
  try {
    const rows = db
      .prepare(
        "SELECT seat, secret_key AS secret FROM seat_occupancy WHERE standing != 'WITHOUT_STANDING' ORDER BY id ASC",
      )
      .all() as Array<{ seat: string; secret: string }>;
    return new Map(rows.map((r) => [r.seat, r.secret]));
  } finally {
    db.close();
  }
}

/**
 * Confirm every playable board of a single round by submitting a matching Pass
 * Out from both seats of each table, over a socket from the test process.
 */
export async function confirmRound(
  gameId: string,
  roundNumber: number,
  tables: number,
  section = "A",
): Promise<void> {
  const secrets = readSeatSecrets(gameId);

  // Read the round's board rows straight from the DB to know which
  // (table, board) instances are playable this round.
  const dataDir = E2E_GAMES_DIR;
  const db = new Database(path.join(dataDir, `${gameId}.db`), {
    readonly: true,
  });
  let instances: Array<{ tableNumber: number; boardNumber: number }>;
  try {
    instances = db
      .prepare(
        "SELECT DISTINCT table_number AS tableNumber, board_number AS boardNumber " +
          "FROM boards WHERE section = ? AND round_number = ? AND status != 'SIT_OUT'",
      )
      .all(section, roundNumber) as Array<{
      tableNumber: number;
      boardNumber: number;
    }>;
  } finally {
    db.close();
  }

  const socket: Socket = ioClient(E2E_BASE_URL);
  try {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("socket timeout")), 10_000);
      socket.on("connect", () => {
        clearTimeout(t);
        resolve();
      });
    });

    const submit = (seat: string, tableNumber: number, boardNumber: number) =>
      new Promise<{ success: boolean; error?: string }>((resolve) => {
        socket.emit(
          "game:submitResult",
          {
            gameId,
            seat,
            token: secrets.get(seat),
            roundNumber,
            tableNumber,
            boardNumber,
            result: "PO",
          },
          (res: { success: boolean; error?: string }) => resolve(res),
        );
      });

    for (const inst of instances) {
      const ns = await submit(
        `${section}${inst.tableNumber}NS`,
        inst.tableNumber,
        inst.boardNumber,
      );
      expect(ns.success, `NS submit failed: ${ns.error}`).toBeTruthy();
      const ew = await submit(
        `${section}${inst.tableNumber}EW`,
        inst.tableNumber,
        inst.boardNumber,
      );
      expect(ew.success, `EW submit failed: ${ew.error}`).toBeTruthy();
    }
  } finally {
    socket.disconnect();
  }

  // The number of playable tables should match (no bye in an even field).
  expect(new Set(instances.map((i) => i.tableNumber)).size).toBe(tables);
}

/** Count how many rounds have been materialized for a section. */
export function materializedRounds(gameId: string, section = "A"): number {
  const dataDir = E2E_GAMES_DIR;
  const db = new Database(path.join(dataDir, `${gameId}.db`), {
    readonly: true,
  });
  try {
    const row = db
      .prepare(
        "SELECT COUNT(DISTINCT round_number) AS n FROM boards WHERE section = ?",
      )
      .get(section) as { n: number };
    return row.n;
  } finally {
    db.close();
  }
}

/**
 * Draw the next round from the in-play Movement screen: click Draw, review the
 * proposed seating on the preview page, accept it (OK), and wait for the
 * confirmation notice. The draw only commits when OK is pressed.
 */
export async function drawNextRound(
  directorPage: Page,
  gameId: string,
): Promise<void> {
  await gotoStable(directorPage, `/game/${gameId}/manage/movement`);
  const button = directorPage.getByTestId("draw-next-round");
  await expect(button).toBeEnabled({ timeout: 15000 });
  await button.click();

  // The preview page appears with an OK button; accept the draw.
  const ok = directorPage.getByTestId("draw-confirm");
  await expect(ok).toBeVisible({ timeout: 15000 });
  await ok.click();

  await expect(directorPage.getByTestId("draw-notice")).toBeVisible({
    timeout: 15000,
  });
}

/** One table's pairs in a round, as stored (see {@link homeSeatOf} for the ids). */
export interface RoundTable {
  tableNumber: number;
  ns: string;
  ew: string;
}

/** Who sat where in a round (one row per table, ordered by table). */
export function roundSeating(
  gameId: string,
  round: number,
  section = "A",
): RoundTable[] {
  const db = new Database(path.join(E2E_GAMES_DIR, `${gameId}.db`), {
    readonly: true,
  });
  try {
    return db
      .prepare(
        "SELECT DISTINCT table_number AS tableNumber, ns, ew FROM boards " +
          "WHERE section = ? AND round_number = ? ORDER BY table_number",
      )
      .all(section, round) as RoundTable[];
  } finally {
    db.close();
  }
}

/**
 * A pair's home seat: the table and direction it started the event at. Every
 * round names a pair by its stable pair number ("A3", with the pairs that
 * started East/West numbered after the North/South ones: "A7" with 4 tables is
 * table 3, East/West). A seat id ("A3NS") is also accepted.
 */
export function homeSeatOf(
  pairId: string,
  tables: number,
): { table: number; side: "NS" | "EW" } {
  const seat = /^[A-Z](\d+)(NS|EW)$/.exec(pairId);
  if (seat) return { table: Number(seat[1]), side: seat[2] as "NS" | "EW" };
  const bare = /^[A-Z](\d+)$/.exec(pairId);
  if (!bare) throw new Error(`Unexpected pair id "${pairId}"`);
  const n = Number(bare[1]);
  return n <= tables
    ? { table: n, side: "NS" }
    : { table: n - tables, side: "EW" };
}
