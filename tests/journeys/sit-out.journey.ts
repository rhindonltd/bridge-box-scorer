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
  }) => {
    test.setTimeout(120_000);

    const { directorPage, gameId } = await setUpOnePairShortGame(
      browser,
      `Sit Out ${Date.now()}`,
    );

    // The three seated seats. One of these draws the sit-out in round 1
    // (exactly one seat sits out per round); we scan them to find it.
    const seatedSeats = ["A1NS", "A1EW", "A2NS"];

    const seatPages: Record<string, Page> = {};
    for (const seat of seatedSeats) {
      seatPages[seat] = await newParticipant(browser);
    }

    try {
      // Find whichever seated pair is sitting out this round: its play page
      // shows the "Sit Out" screen instead of "Enter Round".
      let sitOutPage: Page | null = null;
      for (const seat of seatedSeats) {
        const page = seatPages[seat];
        await page.goto(`/game/${gameId}/play/${seat}`);
        // Either "Enter Round" (playing) or a Sit Out heading appears.
        await expect(
          page
            .getByTestId("play-enter-round")
            .or(page.getByText(/Sit Out/)),
        ).toBeVisible({ timeout: 15000 });

        if (await page.getByText(/Sit Out/).isVisible()) {
          sitOutPage = page;
          break;
        }
      }

      // Exactly one seated pair should be sitting out in round 1.
      expect(sitOutPage, "expected one seated pair to have a sit-out").not.toBeNull();

      // The Sit Out screen offers Continue, which advances the flow (to the
      // next round's move/round info) without error.
      await sitOutPage!
        .getByRole("button", { name: "Continue", exact: true })
        .click();
      await expect(sitOutPage!.getByText(/Sit Out/)).toBeHidden({
        timeout: 15000,
      });

      // The server rejects a result submitted against a sit-out board. The
      // normal UI never offers a sit-out board for entry, so we assert the ack
      // over a direct socket connection from the test process. Table 2 sits
      // out in round 1 (its EW seat is the empty one), so its boards are
      // SIT_OUT this round.
      const ack = await submitAgainstSitOutBoard(gameId);
      expect(ack.success).toBe(false);
      expect((ack.error ?? "").toLowerCase()).toContain("sit-out");
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      for (const seat of seatedSeats) {
        await seatPages[seat].context().close();
      }
    }
  });
});

/**
 * Open a direct socket.io connection from the test process and try to submit a
 * result against the sitting-out table's boards until the server reports the
 * sit-out rejection (or the candidates are exhausted). Returns the rejecting
 * ack, or `{success:true}` if no board rejected (which fails the assertion).
 *
 * Table 2's EW seat is the empty one, so table 2 sits out in round 1 and its
 * boards have status SIT_OUT; submitting any of them must be refused.
 */
async function submitAgainstSitOutBoard(
  gameId: string,
): Promise<{ success: boolean; error?: string }> {
  const socket: Socket = ioClient("http://localhost:3000");

  try {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("socket connect timeout")), 10_000);
      socket.on("connect", () => {
        clearTimeout(t);
        resolve();
      });
    });

    const submit = (boardNumber: number) =>
      new Promise<{ success: boolean; error?: string }>((resolve) => {
        socket.emit(
          "game:submitResult",
          {
            gameId,
            seat: "A2NS",
            roundNumber: 1,
            tableNumber: 2,
            boardNumber,
            result: "PO",
          },
          (res: { success: boolean; error?: string }) => resolve(res),
        );
      });

    for (let board = 1; board <= 12; board++) {
      const res = await submit(board);
      if (!res.success && (res.error ?? "").toLowerCase().includes("sit")) {
        return res;
      }
    }
    return { success: true };
  } finally {
    socket.disconnect();
  }
}
