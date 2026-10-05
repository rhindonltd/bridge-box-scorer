import { test, expect, Page } from "@playwright/test";
import { io as ioClient, Socket } from "socket.io-client";
import Database from "better-sqlite3";
import path from "node:path";

import { createGame } from "../fixtures/game-create";
import {
  setTableCount,
  pickSwissTeamsTripleMovement,
  startGame,
} from "../fixtures/game-setup";
import { seatTeamsFieldOnDevices } from "../fixtures/join";
import { deleteGame } from "../fixtures/delete-game";
import { closeSeatDevices, newParticipant, gotoStable } from "./support";

/**
 * Swiss Teams triples (short + long) end-to-end.
 *
 * When a Swiss Teams field is odd, the director can resolve the odd team with a
 * three-way triple instead of a bye. A SHORT triple runs the whole three-way in
 * one round (three head-to-head comparisons on three disjoint board sets); a
 * LONG triple spreads it over two consecutive rounds on full board sets. This
 * journey proves both flavours work through the real UI + draw loop: seat an
 * odd (three-team) field, pick a triple plan, start, score, and check the
 * leaderboard credits all three teams.
 *
 * Scoring is done over a direct socket (a matching Pass Out from both seats of
 * every playable table/room), the same technique the Swiss Teams/Pairs journeys
 * use — robust and orthogonal to what this journey tests (plan → start → score
 * → draw → leaderboard).
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
 * Confirm every playable (table, board) room of a round by submitting a
 * matching Pass Out from both seats, over a socket from the test process. Each
 * room is NS at some home table; the opponent EW seat is at a different home
 * table, so submitting from the NS and EW seats of each row covers both sides.
 * For a triple a home table hosts two board sets, so a (table, board) pair is
 * unique per room and this still covers every played board exactly once.
 */
async function confirmRound(
  gameId: string,
  roundNumber: number,
  section = "A",
): Promise<void> {
  const secrets = readSeatSecrets(gameId);

  const dataDir = process.env.DATABASE_GAMES_URL ?? "./data/games";
  const db = new Database(path.join(dataDir, `${gameId}.db`), {
    readonly: true,
  });
  let rooms: Array<{ tableNumber: number; boardNumber: number; ew: string }>;
  try {
    rooms = db
      .prepare(
        "SELECT DISTINCT table_number AS tableNumber, board_number AS boardNumber, ew " +
          "FROM boards WHERE section = ? AND round_number = ? AND status != 'SIT_OUT'",
      )
      .all(section, roundNumber) as Array<{
      tableNumber: number;
      boardNumber: number;
      ew: string;
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

    for (const room of rooms) {
      // NS seat at this home table.
      const ns = await submit(
        `${section}${room.tableNumber}NS`,
        room.tableNumber,
        room.boardNumber,
      );
      expect(ns.success, `NS submit failed: ${ns.error}`).toBeTruthy();
      // The EW seat travelling into this room (its own home table id).
      const ew = await submit(room.ew, room.tableNumber, room.boardNumber);
      expect(ew.success, `EW submit failed: ${ew.error}`).toBeTruthy();
    }
  } finally {
    socket.disconnect();
  }

  expect(rooms.length).toBeGreaterThan(0);
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

/** Draw the next round from the in-play Movement screen (preview → OK). */
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

/** Open the team leaderboard display and assert all three teams are named. */
async function expectThreeNamedTeams(displayPage: Page, gameId: string) {
  await displayPage.goto(`/game/${gameId}/display/leaderboard`);
  await expect(displayPage.getByTestId("leaderboard-standings")).toBeVisible({
    timeout: 15000,
  });
  await expect(displayPage.getByTestId("leaderboard-row")).toHaveCount(3, {
    timeout: 15000,
  });
  for (const name of ["Team A1", "Team A2", "Team A3"]) {
    await expect(displayPage.getByText(name)).toBeVisible({ timeout: 15000 });
  }
}

test.describe("Swiss Teams triples", () => {
  test("a SHORT triple: an odd field plays a one-round three-way, all teams scored", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    // Three tables = three teams = exactly one short triple (no other matches).
    const tables = 3;
    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Swiss Teams Short Triple ${Date.now()}`,
      recordOpeningLead: false,
      gameType: "TEAMS",
      teamsScoring: "IMP_VP",
    });

    let seats: Record<string, Page> = {};
    let displayPage: Page | undefined;
    try {
      await setTableCount(directorPage, tables);
      // One round, resolved as a SHORT triple.
      await pickSwissTeamsTripleMovement(directorPage, ["SHORT"]);

      seats = await seatTeamsFieldOnDevices(
        () => newParticipant(browser),
        gameId,
        tables,
      );
      await startGame(directorPage, gameId);

      // Round 1 is materialized as the short triple (sets A/B/C in one round).
      expect(materializedRounds(gameId)).toBe(1);

      await confirmRound(gameId, 1);

      // All three named teams appear on the leaderboard with the round scored.
      displayPage = await newParticipant(browser);
      await expectThreeNamedTeams(displayPage, gameId);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      if (displayPage) await displayPage.context().close();
      await closeSeatDevices(seats);
    }
  });

  test("a LONG triple: an odd field plays a two-round three-way, drawn across both rounds", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    // Three teams, a long triple spanning rounds 1 and 2 (its two slots).
    const tables = 3;
    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Swiss Teams Long Triple ${Date.now()}`,
      recordOpeningLead: false,
      gameType: "TEAMS",
      teamsScoring: "IMP_VP",
    });

    let seats: Record<string, Page> = {};
    let displayPage: Page | undefined;
    try {
      await setTableCount(directorPage, tables);
      // Two rounds, one long triple spanning both (two adjacent LONG entries).
      await pickSwissTeamsTripleMovement(directorPage, ["LONG", "LONG"]);

      seats = await seatTeamsFieldOnDevices(
        () => newParticipant(browser),
        gameId,
        tables,
      );
      await startGame(directorPage, gameId);

      // Round 1 (the long triple's first slot) is materialized at start.
      expect(materializedRounds(gameId)).toBe(1);

      // Score round 1, then draw round 2 — the long triple's SECOND slot,
      // which reuses the same three teams (no fresh three-way is drawn).
      await confirmRound(gameId, 1);
      await drawNextRound(directorPage, gameId);
      expect(materializedRounds(gameId)).toBe(2);

      // Score round 2 too; the long triple is now complete.
      await confirmRound(gameId, 2);

      // All three named teams are credited on the leaderboard.
      displayPage = await newParticipant(browser);
      await expectThreeNamedTeams(displayPage, gameId);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      if (displayPage) await displayPage.context().close();
      await closeSeatDevices(seats);
    }
  });
});
