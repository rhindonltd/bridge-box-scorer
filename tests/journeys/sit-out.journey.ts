import { test, expect, Browser, Page } from "@playwright/test";
import { io as ioClient, Socket } from "socket.io-client";

import { createGame } from "../fixtures/game-create";
import { setTableCount, pickFirstMovement, startGame } from "../fixtures/game-setup";
import { seatPair, SEEDED_EBU } from "../fixtures/join";
import { deleteGame } from "../fixtures/delete-game";
import { newParticipant } from "./support";

/**
 * Sit-out journey (pure UI, no socket seam).
 *
 * A two-table pairs movement expects four pairs (one per seat). Seating only
 * THREE leaves exactly one empty seat, which the start validator turns into a
 * per-round sit-out (`sitOutSeat`, e.g. "A3EW") while still allowing the game
 * to start (`canStart: true`). This journey:
 *
 *   1. Sets up such a one-pair-short game and starts it.
 *   2. Drives the pair that draws the sit-out and asserts the Sit Out screen
 *      renders and Continue advances the flow.
 *   3. Asserts the server refuses a result submitted against a sit-out board
 *      with the ack error "This board is a sit-out".
 *
 * Opening-lead recording is off to keep any contract entry short.
 */

/**
 * Create a started two-table game seated ONE pair short (three of four seats
 * filled), so exactly one seat sits out each round. Returns the director page,
 * gameId, and the seat left empty (the sit-out seat).
 */
async function setUpOnePairShortGame(
  browser: Browser,
  eventName: string,
): Promise<{ directorPage: Page; gameId: string; emptySeat: string }> {
  const directorPage = await newParticipant(browser);

  const { gameId } = await createGame(directorPage, {
    eventName,
    recordOpeningLead: false,
  });
  await setTableCount(directorPage, 2);
  await pickFirstMovement(directorPage);

  const { jacquelineCollier, davidCollier, celiaOram, denisKing } = SEEDED_EBU;

  // Seat three of the four seats: table 1 NS + EW, and table 2 NS. Table 2 EW
  // is left empty, so "A2EW" becomes the sit-out seat.
  await seatPair(directorPage, gameId, 0, "NS", jacquelineCollier, davidCollier);
  await seatPair(directorPage, gameId, 0, "EW", celiaOram, denisKing);
  await seatPair(directorPage, gameId, 1, "NS", jacquelineCollier, davidCollier);

  await startGame(directorPage, gameId);

  return { directorPage, gameId, emptySeat: "A2EW" };
}

test.describe("Sit-out flow", () => {
  test("a one-pair-short game shows the sit-out screen and refuses sit-out submissions", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { directorPage, gameId } = await setUpOnePairShortGame(
      browser,
      // Deliberately avoid the words "Sit Out" in the event name so it can't
      // collide with the sit-out heading locators below.
      `Short Field ${Date.now()}`,
    );

    // Discover which seat sits out and in which round, straight from the
    // schedule — the movement decides this, we don't assume it.
    const { seat: sitOutSeat, round: sitOutRound } = await findSitOutSeat(
      request,
      gameId,
      ["A1NS", "A1EW", "A2NS"],
    );

    // The play flow skips sit-out (and completed) rounds when resolving the
    // FIRST screen on mount, so a fresh load never lands on a sit-out. The
    // SitOutPage is reached in-session: after the player finishes the rounds
    // BEFORE the sit-out and continues, the flow lands on the sit-out round.
    // We therefore live-play the sitting-out pair up to its sit-out round.
    const sitOutPlayer = await newParticipant(browser);
    const partnerSeat = tablePartnerSeat(sitOutSeat); // opponent sharing its table
    const partnerPlayer = await newParticipant(browser);

    try {
      // The board lists for the rounds the sitting pair plays BEFORE its
      // sit-out come straight from its schedule, so we drive those exact
      // boards in order rather than guessing from the (schedule-lagged) UI.
      const playerRounds = await seatSchedule(request, gameId, sitOutSeat);
      const roundsBeforeSitOut = playerRounds.filter(
        (r) => r.round < sitOutRound && !r.sitOut,
      );

      await playRoundsUpToSitOut(
        sitOutPlayer,
        partnerPlayer,
        gameId,
        sitOutSeat,
        partnerSeat,
        roundsBeforeSitOut,
      );

      // Now the sitting-out pair's page shows the SitOutPage. Its heading
      // ("Sit Out at Table N") is unique to that screen.
      const sitOutHeading = /Sit Out at Table/;
      await expect(sitOutPlayer.getByText(sitOutHeading)).toBeVisible({
        timeout: 15000,
      });

      // Continue advances past the sit-out without error.
      await sitOutPlayer
        .getByRole("button", { name: "Continue", exact: true })
        .click();
      await expect(sitOutPlayer.getByText(sitOutHeading)).toBeHidden({
        timeout: 15000,
      });

      // The server rejects a result submitted against a sit-out board. The
      // normal UI never offers a sit-out board for entry, so we discover a real
      // SIT_OUT board instance from the boards API and assert the rejection ack
      // over a direct socket connection from the test process.
      const ack = await submitAgainstSitOutBoard(request, gameId);
      expect(ack.success).toBe(false);
      expect((ack.error ?? "").toLowerCase()).toContain("sit-out");
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await sitOutPlayer.context().close();
      await partnerPlayer.context().close();
    }
  });
});

type RoundInfo = {
  round: number;
  table: number | null;
  sitOut: boolean;
  boards: number[];
};

/** Fetch a seat's schedule rounds (round/table/sitOut/boards). */
async function seatSchedule(
  request: import("@playwright/test").APIRequestContext,
  gameId: string,
  seat: string,
): Promise<RoundInfo[]> {
  const res = await request.get(`/api/games/${gameId}/schedule/${seat}`);
  expect(res.ok()).toBeTruthy();
  const rounds = (await res.json()).result.rounds as Array<{
    roundNumber: number;
    tableNumber: number | null;
    sitOut?: boolean;
    boards: number[];
  }>;
  return rounds.map((r) => ({
    round: r.roundNumber,
    table: r.tableNumber,
    sitOut: r.sitOut ?? false,
    boards: r.boards,
  }));
}

/**
 * Among the candidate seats, pick one whose sit-out round is >= 2 (so there is
 * at least one playable round before it, making the SitOutPage reachable via
 * the in-session flow) and minimal. Returns that seat and its sit-out round.
 */
async function findSitOutSeat(
  request: import("@playwright/test").APIRequestContext,
  gameId: string,
  candidates: string[],
): Promise<{ seat: string; round: number }> {
  let best: { seat: string; round: number } | null = null;
  for (const seat of candidates) {
    const rounds = await seatSchedule(request, gameId, seat);
    const sitOut = rounds.find((r) => r.sitOut && r.round >= 2);
    if (sitOut && (best === null || sitOut.round < best.round)) {
      best = { seat, round: sitOut.round };
    }
  }
  if (!best) {
    throw new Error("no seated pair sits out in round >= 2");
  }
  return best;
}

/** The opposite direction seat at the same table (e.g. A1NS <-> A1EW). */
function tablePartnerSeat(seat: string): string {
  return seat.endsWith("NS")
    ? seat.replace(/NS$/, "EW")
    : seat.replace(/EW$/, "NS");
}

/**
 * Live-play the sitting-out pair through every round BEFORE its sit-out round,
 * keeping its page mounted so the flow transitions into the SitOutPage (which
 * a fresh load would skip). For each such round, both the pair and its
 * round-opponent enter matching Pass Outs for every board, then advance.
 *
 * The pairs share a table within a round, so the opponent is the same-table
 * opposite-direction seat. This helper assumes the pre-sit-out rounds are not
 * themselves sit-outs for this pair (true for the minimal case, e.g. A1EW which
 * plays round 1 then sits out round 2).
 */
async function playRoundsUpToSitOut(
  player: Page,
  partner: Page,
  gameId: string,
  seat: string,
  partnerSeat: string,
  rounds: RoundInfo[],
): Promise<void> {
  await player.goto(`/game/${gameId}/play/${seat}`);
  await partner.goto(`/game/${gameId}/play/${partnerSeat}`);

  // Play each round before the sit-out, driving that round's exact board list
  // (from the schedule) in order. The play flow advances board-by-board via
  // its own state, so we pick each specific board rather than the first
  // enabled one (the board-select step's "played" flags can lag the schedule).
  for (const round of rounds) {
    await enterRoundToBoardSelect(player);
    await enterRoundToBoardSelect(partner);

    for (const board of round.boards) {
      // Player enters this board, then the partner enters the same board.
      await passOutSpecificBoard(player, board);
      await passOutSpecificBoard(partner, board);

      // Player confirms -> Board Results; advance to the next board/round.
      await expect(player.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });
      await player.getByTestId("board-results-next").click();
      if (
        await partner
          .getByTestId("board-results-next")
          .isVisible()
          .catch(() => false)
      ) {
        await partner.getByTestId("board-results-next").click();
      }
    }

    // After the last board of the round, the player is on the move-info screen.
    // Continue moves into the next round (the sit-out on the final iteration).
    const cont = player.getByRole("button", { name: "Continue", exact: true });
    await expect(cont).toBeVisible({ timeout: 15000 });
    await cont.click();
    const pcont = partner.getByRole("button", { name: "Continue", exact: true });
    if (await pcont.isVisible().catch(() => false)) await pcont.click();
  }
}

/** Click "Enter Round" and wait for the board-select step to render. */
async function enterRoundToBoardSelect(page: Page): Promise<void> {
  const enterRound = page.getByTestId("play-enter-round");
  await expect(enterRound).toBeVisible({ timeout: 15000 });
  await enterRound.click();
  await expect(
    page.locator('[data-testid^="wizard-board-"]').first(),
  ).toBeVisible({ timeout: 15000 });
}

/**
 * Enter a Pass Out for a SPECIFIC board. Waits for the board-select step, picks
 * that board, then Pass Out -> Submit. The player flow reopens the board-select
 * step for each board of the round, so we always target the intended board.
 */
async function passOutSpecificBoard(page: Page, board: number): Promise<void> {
  const boardButton = page.getByTestId(`wizard-board-${board}`);
  await expect(boardButton).toBeVisible({ timeout: 15000 });
  await boardButton.click();
  await page.getByTestId("wizard-pass-out").click();
  await page.getByTestId("wizard-submit").click();
}

/**
 * Discover a real SIT_OUT board instance from the boards API, then submit a
 * result against it over a direct socket connection and return the ack. The
 * server must refuse it with "This board is a sit-out".
 *
 * Which table sits out in which round is decided by the movement's phantom
 * rotation, so we don't assume it — we scan the board instances for one whose
 * status is SIT_OUT and target that exact (round, table, board).
 */
async function submitAgainstSitOutBoard(
  request: import("@playwright/test").APIRequestContext,
  gameId: string,
): Promise<{ success: boolean; error?: string }> {
  // Find a SIT_OUT instance.
  const boardsRes = await request.get(`/api/games/${gameId}/boards`);
  const boardNumbers: number[] = (await boardsRes.json()).result.boards;

  let target:
    | { roundNumber: number; tableNumber: number; boardNumber: number }
    | null = null;
  for (const boardNumber of boardNumbers) {
    const res = await request.get(`/api/games/${gameId}/boards/${boardNumber}`);
    const rows: Array<{
      roundNumber: number;
      tableNumber: number;
      boardNumber: number;
      status: string | null;
    }> = (await res.json()).result.instances;
    const sitOut = rows.find((r) => r.status === "SIT_OUT");
    if (sitOut) {
      target = {
        roundNumber: sitOut.roundNumber,
        tableNumber: sitOut.tableNumber,
        boardNumber: sitOut.boardNumber,
      };
      break;
    }
  }

  if (!target) {
    throw new Error("no SIT_OUT board instance found for the short field");
  }

  const socket: Socket = ioClient("http://localhost:3000");
  try {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("socket connect timeout")), 10_000);
      socket.on("connect", () => {
        clearTimeout(t);
        resolve();
      });
    });

    return await new Promise<{ success: boolean; error?: string }>((resolve) => {
      socket.emit(
        "game:submitResult",
        {
          gameId,
          seat: `A${target!.tableNumber}NS`,
          roundNumber: target!.roundNumber,
          tableNumber: target!.tableNumber,
          boardNumber: target!.boardNumber,
          result: "PO",
        },
        (res: { success: boolean; error?: string }) => resolve(res),
      );
    });
  } finally {
    socket.disconnect();
  }
}
