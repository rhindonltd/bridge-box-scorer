import { test, expect, Page } from "@playwright/test";
import { io as ioClient, Socket } from "socket.io-client";
import Database from "better-sqlite3";
import path from "node:path";

import { createGame } from "../fixtures/game-create";
import {
  setTableCount,
  pickSwissMovement,
  startGame,
} from "../fixtures/game-setup";
import { seatSingleSectionFieldOnDevices } from "../fixtures/join";
import { deleteGame } from "../fixtures/delete-game";
import { closeSeatDevices, newParticipant, gotoStable } from "./support";

/**
 * Swiss Pairs end-to-end.
 *
 * Swiss is the one movement drawn round by round: only round 1 is set at the
 * start, and the director draws each later round from the standings once the
 * current round is fully scored. This journey creates a single-section Swiss
 * game, seats a full two-table field, plays and confirms round 1, then draws
 * round 2 from the in-play Movement screen — proving the whole live loop
 * (start → score → draw → next round appears) works through the UI.
 *
 * Round scoring is done over a direct socket from the test process (a matching
 * Pass Out from both seats of each table), the same technique the
 * complete-game fixture uses — far more robust than driving the wizard for
 * every seat, and orthogonal to what this journey is really testing (the draw).
 */

/** Read each seat's secret token from the game's SQLite file (seat -> token). */
function readSeatSecrets(gameId: string): Map<string, string> {
  const dataDir = process.env.DATABASE_GAMES_URL ?? "./data/games";
  const db = new Database(path.join(dataDir, `${gameId}.db`), {
    readonly: true,
  });
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

/**
 * Confirm every playable board of a single round by submitting a matching Pass
 * Out from both seats of each table, over a socket from the test process.
 */
async function confirmRound(
  gameId: string,
  roundNumber: number,
  tables: number,
  section = "A",
): Promise<void> {
  const secrets = readSeatSecrets(gameId);

  // Read the round's board rows straight from the DB to know which
  // (table, board) instances are playable this round.
  const dataDir = process.env.DATABASE_GAMES_URL ?? "./data/games";
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

  const socket: Socket = ioClient("http://localhost:3000");
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
function materializedRounds(gameId: string, section = "A"): number {
  const dataDir = process.env.DATABASE_GAMES_URL ?? "./data/games";
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
 * Draw the next round from the in-play Movement screen and wait for the
 * confirmation notice.
 */
async function drawNextRound(directorPage: Page, gameId: string): Promise<void> {
  await gotoStable(directorPage, `/game/${gameId}/manage/movement`);
  const button = directorPage.getByTestId("draw-next-round");
  await expect(button).toBeEnabled({ timeout: 15000 });
  await button.click();
  await expect(directorPage.getByTestId("draw-notice")).toBeVisible({
    timeout: 15000,
  });
}

test.describe("Swiss Pairs draws round by round", () => {
  test("start, score round 1, then draw round 2 from the Movement screen", async ({
    browser,
  }) => {
    test.setTimeout(150_000);

    const tables = 2;
    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Swiss ${Date.now()}`,
      recordOpeningLead: false,
    });

    let seats: Record<string, Page> = {};
    try {
      await setTableCount(directorPage, tables);
      await pickSwissMovement(directorPage);

      seats = await seatSingleSectionFieldOnDevices(
        () => newParticipant(browser),
        gameId,
        tables,
      );
      await startGame(directorPage, gameId);

      // Only round 1 is materialized at start.
      expect(materializedRounds(gameId)).toBe(1);

      // Before scoring, the draw button is disabled (results not yet in).
      await gotoStable(directorPage, `/game/${gameId}/manage/movement`);
      await expect(directorPage.getByTestId("draw-next-round")).toBeDisabled({
        timeout: 15000,
      });

      // Score round 1, then draw round 2 — it should now be materialized.
      await confirmRound(gameId, 1, tables);
      await drawNextRound(directorPage, gameId);
      expect(materializedRounds(gameId)).toBe(2);

      // And the loop repeats: score round 2, draw round 3.
      await confirmRound(gameId, 2, tables);
      await drawNextRound(directorPage, gameId);
      expect(materializedRounds(gameId)).toBe(3);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await closeSeatDevices(seats);
    }
  });
});
