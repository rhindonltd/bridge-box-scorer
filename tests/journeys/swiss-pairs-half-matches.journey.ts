import { test, expect, Page } from "@playwright/test";
import { io as ioClient, Socket } from "socket.io-client";
import Database from "better-sqlite3";
import path from "node:path";

import { createGame } from "../fixtures/game-create";
import {
  setTableCount,
  pickSwissHalfMatchMovement,
  startGame,
} from "../fixtures/game-setup";
import { seatSeatsOnDevices } from "../fixtures/join";
import { deleteGame } from "../fixtures/delete-game";
import { closeSeatDevices, newParticipant, gotoStable } from "./support";

/**
 * Swiss Pairs "2 half matches" (odd field) end to end.
 *
 * An odd Swiss Pairs field (one pair short) can resolve each round with a bye
 * OR with "2 half matches": three pairs play at one table — an ANCHOR plays the
 * full round against a different opponent in each half, and the two non-anchors
 * each play one half (and are credited an average-plus blend for the half they
 * miss). This journey creates an odd single-section Swiss game set to half
 * matches, seats the field, starts (so round 1 materialises the group), scores
 * the half-match round over a socket, draws round 2, and asserts the leaderboard
 * credits every pair — proving the whole odd-field loop works through the UI.
 *
 * Round scoring is a matching Pass Out from both real seats of each played board
 * row (read from the DB), the same socket technique the even-field Swiss journey
 * uses. HALF_AVERAGE (compensation) and SIT_OUT rows are never submitted — they
 * are not played.
 */

const DATA_DIR = () => process.env.DATABASE_GAMES_URL ?? "./data/games";

/** Open the game's SQLite file read-only. */
function openDb(gameId: string): Database.Database {
  return new Database(path.join(DATA_DIR(), `${gameId}.db`), { readonly: true });
}

/** Read each seat's secret token from the game's SQLite file (seat -> token). */
function readSeatSecrets(gameId: string): Map<string, string> {
  const db = openDb(gameId);
  try {
    const rows = db
      .prepare(
        "SELECT initial_seat AS seat, secret_key AS secret FROM participant",
      )
      .all() as Array<{ seat: string; secret: string }>;
    return new Map(rows.map((r) => [r.seat, r.secret]));
  } finally {
    db.close();
  }
}

/** The distinct board-row statuses present for a section's round. */
function roundStatuses(gameId: string, round: number, section = "A"): string[] {
  const db = openDb(gameId);
  try {
    const rows = db
      .prepare(
        "SELECT DISTINCT status FROM boards WHERE section = ? AND round_number = ?",
      )
      .all(section, round) as Array<{ status: string }>;
    return rows.map((r) => r.status);
  } finally {
    db.close();
  }
}

/** Count how many rounds have been materialized for a section. */
function materializedRounds(gameId: string, section = "A"): number {
  const db = openDb(gameId);
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
 * One playable (table, board) instance to score, plus the PHYSICAL table seats
 * to submit from. Excludes SIT_OUT (bye) and HALF_AVERAGE (half-match
 * compensation) — neither is played.
 *
 * Results are submitted from the table's own `A{table}NS` / `A{table}EW` seats
 * (not the pair ids stored in the board's ns/ew columns): the submit handler
 * derives the recorded SIDE from the seat-string suffix and keys the board by
 * (section, round, table, board). A half-match anchor's two halves share one
 * table but sit on different board subsets against different opponents, yet the
 * table's two chairs are the same throughout, so these fixed table seats record
 * both sides of every played board. In an odd field the empty seat (A3EW here)
 * never backs a playable row, so its missing token is never needed.
 */
interface PlayableRow {
  tableNumber: number;
  boardNumber: number;
  ns: string;
  ew: string;
}

function playableRows(
  gameId: string,
  round: number,
  section = "A",
): PlayableRow[] {
  const db = openDb(gameId);
  try {
    const instances = db
      .prepare(
        "SELECT DISTINCT table_number AS tableNumber, board_number AS boardNumber " +
          "FROM boards " +
          "WHERE section = ? AND round_number = ? " +
          "AND status NOT IN ('SIT_OUT', 'HALF_AVERAGE')",
      )
      .all(section, round) as Array<{
      tableNumber: number;
      boardNumber: number;
    }>;
    return instances.map((i) => ({
      ...i,
      ns: `${section}${i.tableNumber}NS`,
      ew: `${section}${i.tableNumber}EW`,
    }));
  } finally {
    db.close();
  }
}

/**
 * Confirm a round by submitting a matching Pass Out from both seats of every
 * played table, over a socket from the test process. Works for a half-match
 * round too: the anchor's two halves live on the same table (different board
 * subsets), so submitting from that table's two chairs records both halves.
 */
async function confirmRound(
  gameId: string,
  round: number,
  section = "A",
): Promise<void> {
  const secrets = readSeatSecrets(gameId);
  const rows = playableRows(gameId, round, section);
  expect(rows.length, "round has playable rows").toBeGreaterThan(0);

  const socket: Socket = ioClient("http://localhost:3000");
  try {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("socket timeout")), 10_000);
      socket.on("connect", () => {
        clearTimeout(t);
        resolve();
      });
    });

    const submit = (seat: string, row: PlayableRow) =>
      new Promise<{ success: boolean; error?: string }>((resolve) => {
        socket.emit(
          "game:submitResult",
          {
            gameId,
            seat,
            token: secrets.get(seat),
            roundNumber: round,
            tableNumber: row.tableNumber,
            boardNumber: row.boardNumber,
            result: "PO",
          },
          (res: { success: boolean; error?: string }) => resolve(res),
        );
      });

    for (const row of rows) {
      const ns = await submit(row.ns, row);
      expect(ns.success, `NS submit failed (${row.ns}): ${ns.error}`).toBeTruthy();
      const ew = await submit(row.ew, row);
      expect(ew.success, `EW submit failed (${row.ew}): ${ew.error}`).toBeTruthy();
    }
  } finally {
    socket.disconnect();
  }
}

/** Draw the next round from the Movement screen and accept the preview. */
async function drawNextRound(directorPage: Page, gameId: string): Promise<void> {
  await gotoStable(directorPage, `/game/${gameId}/manage/movement`);
  const button = directorPage.getByTestId("draw-next-round");
  await expect(button).toBeEnabled({ timeout: 15000 });
  await button.click();

  const ok = directorPage.getByTestId("draw-confirm");
  await expect(ok).toBeVisible({ timeout: 15000 });
  await ok.click();

  await expect(directorPage.getByTestId("draw-notice")).toBeVisible({
    timeout: 15000,
  });
}

test.describe("Swiss Pairs 2 half matches (odd field)", () => {
  test("starts an odd field as a half-match round, scores it, and draws the next", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    const tables = 3; // 6 positions; an odd field seats 5 (A3EW left empty).
    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Swiss Half ${Date.now()}`,
      recordOpeningLead: false,
    });

    let seats: Record<string, Page> = {};
    try {
      await setTableCount(directorPage, tables);
      await pickSwissHalfMatchMovement(directorPage);

      // Seat an ODD field: every seat except A3EW (one pair short).
      const oddSeats = ["A1NS", "A1EW", "A2NS", "A2EW", "A3NS"];
      seats = await seatSeatsOnDevices(
        () => newParticipant(browser),
        gameId,
        oddSeats,
      );

      await startGame(directorPage, gameId);

      // Round 1 is materialised as a HALF-MATCH group, not a bye: its rows
      // include HALF_AVERAGE compensation blocks (which a bye never produces).
      expect(materializedRounds(gameId)).toBe(1);
      expect(roundStatuses(gameId, 1)).toContain("HALF_AVERAGE");
      expect(roundStatuses(gameId, 1)).not.toContain("SIT_OUT");

      // Score the half-match round, then draw round 2.
      await confirmRound(gameId, 1);
      await drawNextRound(directorPage, gameId);
      expect(materializedRounds(gameId)).toBe(2);

      // The leaderboard credits every pair in the field (the anchor's /20 plus
      // each non-anchor's played + compensated /20). Open the display and assert
      // one standings row per seated pair — none is left uncredited by the
      // half-match round.
      await gotoStable(directorPage, `/game/${gameId}/display/leaderboard`);
      await expect(
        directorPage.getByTestId("leaderboard-standings"),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        directorPage.getByTestId("leaderboard-row"),
      ).toHaveCount(oddSeats.length, { timeout: 15000 });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await closeSeatDevices(seats);
    }
  });
});
