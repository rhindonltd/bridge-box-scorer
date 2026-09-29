import { test, expect, Page } from "@playwright/test";
import { io as ioClient, Socket } from "socket.io-client";
import Database from "better-sqlite3";
import path from "node:path";

import { createGame } from "../fixtures/game-create";
import {
  setTableCount,
  pickSwissTeamsMovement,
  startGame,
} from "../fixtures/game-setup";
import { seatTeamsFieldOnDevices } from "../fixtures/join";
import { deleteGame } from "../fixtures/delete-game";
import { openDirectorTraveller } from "../fixtures/director-override";
import { closeSeatDevices, newParticipant, gotoStable } from "./support";

/**
 * Swiss Teams end-to-end.
 *
 * Like Swiss Pairs, a Swiss Teams event is drawn round by round: only round 1
 * is set at the start, and the director draws each later round from the
 * standings once the current round is fully scored. A team is simply the two
 * pairs seated at one home table — the North/South (home) pair and the
 * East/West (away) pair — so seating a full field IS declaring the teams; the
 * home pair may also enter an optional team name.
 *
 * A team match is played in two rooms sharing the same boards: the open room at
 * one team's home table and the closed room at the other's, so a two-team field
 * (two tables) is one match across both tables. This journey creates a
 * single-section Teams game with IMP-VP scoring, seats a full field with team
 * names, plays and confirms round 1 across both rooms, then draws round 2 from
 * the in-play Movement screen — proving the whole live loop works through the
 * UI. It also opens the leaderboard display and checks the named teams appear.
 *
 * Round scoring is done over a direct socket from the test process (a matching
 * Pass Out from both seats of every playable table/room), the same technique
 * the Swiss Pairs journey uses — robust and orthogonal to what this journey is
 * really testing (seat-teams → start → score → draw).
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
 * Out from both seats of each playable table/room, over a socket from the test
 * process. SIT_OUT rows (a teams bye) are excluded, so this works for an even
 * field (every table plays) or an odd one (the bye table is skipped).
 */
async function confirmRound(
  gameId: string,
  roundNumber: number,
  section = "A",
): Promise<void> {
  const secrets = readSeatSecrets(gameId);

  // Read the round's board rows straight from the DB to know which
  // (table, board) instances are playable this round (open + closed rooms).
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

  // At least one room must be playable, else the round produced nothing to
  // score (a mis-materialized round would silently pass otherwise).
  expect(instances.length).toBeGreaterThan(0);
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
 * Draw the next round from the in-play Movement screen: click Draw, review the
 * proposed matches on the preview page, accept them (OK), and wait for the
 * confirmation notice. The draw only commits when OK is pressed.
 */
async function drawNextRound(directorPage: Page, gameId: string): Promise<void> {
  await gotoStable(directorPage, `/game/${gameId}/manage/movement`);
  const button = directorPage.getByTestId("draw-next-round");
  await expect(button).toBeEnabled({ timeout: 15000 });
  await button.click();

  // The preview page appears with an OK button; accept the draw as shown.
  const ok = directorPage.getByTestId("draw-confirm");
  await expect(ok).toBeVisible({ timeout: 15000 });
  await ok.click();

  await expect(directorPage.getByTestId("draw-notice")).toBeVisible({
    timeout: 15000,
  });
}

test.describe("Swiss Teams draws round by round", () => {
  test("start, score round 1, then draw round 2 from the Movement screen", async ({
    browser,
  }) => {
    test.setTimeout(150_000);

    // Two tables = two teams = one match played across the open and closed
    // rooms (both tables). An even field, so no bye.
    const tables = 2;
    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Swiss Teams ${Date.now()}`,
      recordOpeningLead: false,
      gameType: "TEAMS",
      teamsScoring: "IMP_VP",
    });

    let seats: Record<string, Page> = {};
    try {
      await setTableCount(directorPage, tables);
      await pickSwissTeamsMovement(directorPage);

      seats = await seatTeamsFieldOnDevices(
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

      // Score round 1 across both rooms, then draw round 2.
      await confirmRound(gameId, 1);
      await drawNextRound(directorPage, gameId);
      expect(materializedRounds(gameId)).toBe(2);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await closeSeatDevices(seats);
    }
  });

  test("the named teams appear on the leaderboard once a round is scored", async ({
    browser,
  }) => {
    test.setTimeout(150_000);

    const tables = 2;
    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Swiss Teams Board ${Date.now()}`,
      recordOpeningLead: false,
      gameType: "TEAMS",
      teamsScoring: "IMP_VP",
    });

    let seats: Record<string, Page> = {};
    let displayPage: Page | undefined;
    try {
      await setTableCount(directorPage, tables);
      await pickSwissTeamsMovement(directorPage);
      seats = await seatTeamsFieldOnDevices(
        () => newParticipant(browser),
        gameId,
        tables,
      );
      await startGame(directorPage, gameId);

      // Open the team leaderboard display. Unlike pairs, a teams field shows a
      // row per seated team from the start (each team carries a running VP
      // total that begins at zero), so both named teams are present before any
      // result — proving teams are derived from seating and named correctly.
      displayPage = await newParticipant(browser);
      await displayPage.goto(`/game/${gameId}/display/leaderboard`);
      await expect(
        displayPage.getByTestId("leaderboard-standings"),
      ).toBeVisible({ timeout: 15000 });
      await expect(displayPage.getByTestId("leaderboard-row")).toHaveCount(2, {
        timeout: 15000,
      });

      // The named teams (from the home NS seats' team names) are shown, not
      // pair numbers.
      await expect(displayPage.getByText("Team A1")).toBeVisible({
        timeout: 15000,
      });
      await expect(displayPage.getByText("Team A2")).toBeVisible({
        timeout: 15000,
      });

      // Score round 1; the display updates live and the teams remain named.
      await confirmRound(gameId, 1);
      await expect(
        displayPage.getByTestId("leaderboard-row").first(),
      ).toBeVisible({ timeout: 15000 });
      await expect(displayPage.getByText("Team A1")).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      if (displayPage) await displayPage.context().close();
      await closeSeatDevices(seats);
    }
  });

  test("the director traveller frames a board as a team match (open/closed rooms)", async ({
    browser,
  }) => {
    test.setTimeout(150_000);

    const tables = 2;
    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Swiss Teams Traveller ${Date.now()}`,
      recordOpeningLead: false,
      gameType: "TEAMS",
      teamsScoring: "IMP_VP",
    });

    let seats: Record<string, Page> = {};
    try {
      await setTableCount(directorPage, tables);
      await pickSwissTeamsMovement(directorPage);
      seats = await seatTeamsFieldOnDevices(
        () => newParticipant(browser),
        gameId,
        tables,
      );
      await startGame(directorPage, gameId);
      await confirmRound(gameId, 1);

      // Open board 1's director traveller. For a teams game it is framed as a
      // team match: the two teams by name (with a "v"), and each physical table
      // shown as a selectable room row (traveller-row-{round}-{table}).
      await openDirectorTraveller(directorPage, gameId, 1);

      await expect(
        directorPage.getByText("Team A1 v Team A2"),
      ).toBeVisible({ timeout: 15000 });
      // Both rooms of the match are present as selectable rows (round 1,
      // tables 1 and 2 — the open and closed rooms).
      await expect(
        directorPage.getByTestId("traveller-row-1-1"),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        directorPage.getByTestId("traveller-row-1-2"),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await closeSeatDevices(seats);
    }
  });
});
