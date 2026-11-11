import { test, expect } from "@playwright/test";
import {
  closeDevices,
  openDirector,
  openSeat,
  seedGame,
} from "../fixtures/seeded-game";
import { gotoStable, newParticipant } from "./support";

/**
 * Withdrawals, reinstating, the missed-boards choice and late arrivals
 * (design §11), driven through the real screens on seeded 3-table pairs games
 * (Mitchell, 3 rounds). Seeded pairs are named after their seat
 * ("PA1NS North & PA1NS South"); the manual equivalents are
 * docs/e2e/11-withdrawals-late-arrivals.md.
 */
const BASE = { scoring: "MP", rounds: 3 } as const;

/** Open the Pairs screen and expand the card for `names`. */
async function openPair(
  director: import("@playwright/test").Page,
  gameId: string,
  names: RegExp,
) {
  await gotoStable(director, `/game/${gameId}/manage/pairs`);
  await director.getByRole("button", { name: names }).click();
}

async function absences(
  request: import("@playwright/test").APIRequestContext,
  gameId: string,
) {
  const res = await request.get(`/api/games/${gameId}/absences`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()).result.absences as Array<{
    seat: string;
    kind: string;
    treatment: string;
    round?: number;
  }>;
}

test.describe("A pair withdraws from its own phone", () => {
  test("Going back changes nothing; withdrawing signs the device out and moves the opponent on", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const game = await seedGame({
      ...BASE,
      play: "round1",
      eventName: `Player Withdraw ${Date.now()}`,
    });
    const director = await openDirector(browser, game);
    const leaver = await openSeat(browser, game, "A1NS");
    const opponent = await openSeat(browser, game, "A3EW");
    try {
      // Menu -> Withdraw offers a page that explains what happens.
      await leaver.getByRole("button", { name: "Menu" }).click();
      await leaver.getByRole("menuitem", { name: "Withdraw" }).click();
      // The bold headline (a heading, so Next.js's page announcer also reads
      // it out to screen readers on arrival).
      await expect(
        leaver.getByRole("heading", {
          name: "Withdraw your pair from the event?",
        }),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        leaver.getByText(/Results you.ve already entered stand/),
      ).toBeVisible();

      // One action only: there is no Cancel button; the header back arrow
      // cancels. Afterwards the pair is still Active on the director's screen.
      await expect(leaver.getByRole("button", { name: "Cancel" })).toHaveCount(
        0,
      );
      await leaver
        .getByRole("button", { name: "Go back", exact: true })
        .click();
      await gotoStable(director, `/game/${game.gameId}/manage/pairs`);
      const row = director.getByRole("listitem").filter({ hasText: "1NS" });
      await expect(row.getByText("Active", { exact: true })).toBeVisible({
        timeout: 15000,
      });

      // Withdraw for real.
      await leaver.getByRole("button", { name: "Menu" }).click();
      await leaver.getByRole("menuitem", { name: "Withdraw" }).click();
      await leaver
        .getByRole("button", { name: "Withdraw", exact: true })
        .click();
      await expect(leaver.getByText(/Your pair has withdrawn/)).toBeVisible({
        timeout: 15000,
      });

      // The director's screen follows live, without a refresh.
      await expect(row.getByText("Withdrawn", { exact: true })).toBeVisible({
        timeout: 15000,
      });
      await expect(
        row.getByText(/Withdrew in round 2 — 6 boards not played/),
      ).toBeVisible();

      // The device was signed out: joining again offers the seat picker.
      await leaver.getByRole("button", { name: "Done" }).click();
      await leaver.waitForURL((u) => u.pathname === "/");
      await leaver.goto(`/game/${game.gameId}/join`);
      await expect(leaver.getByTestId("seat-A1NS")).toBeVisible({
        timeout: 15000,
      });

      // The opponent (A1NS's round-2 opponent) is moved on to round 3.
      await expect(opponent.getByText(/Round 3/).first()).toBeVisible({
        timeout: 20000,
      });
    } finally {
      await closeDevices(director, leaver, opponent);
    }
  });
});

test.describe("The director withdraws and reinstates a pair", () => {
  test("withdraw (with confirm), then reinstate on a new device by code", async ({
    browser,
    request,
  }) => {
    test.setTimeout(150_000);
    const game = await seedGame({
      ...BASE,
      play: "round1",
      eventName: `Director Withdraw ${Date.now()}`,
    });
    const director = await openDirector(browser, game);
    const oldDevice = await openSeat(browser, game, "A1NS");
    const returning = await newParticipant(browser);
    try {
      await openPair(director, game.gameId, /PA1NS North/);

      // Cancel at the confirm step changes nothing.
      await director
        .getByRole("button", { name: "Withdraw this pair" })
        .click();
      await expect(
        director.getByText(/They won.t play any more boards/),
      ).toBeVisible();
      await director.getByRole("button", { name: "Cancel" }).click();
      expect(await absences(request, game.gameId)).toHaveLength(0);

      // Confirm: withdrawn from the round it is on.
      await director
        .getByRole("button", { name: "Withdraw this pair" })
        .click();
      await director.getByRole("button", { name: "Confirm" }).click();
      const row = director.getByRole("listitem").filter({ hasText: "1NS" });
      await expect(row.getByText("Withdrawn", { exact: true })).toBeVisible({
        timeout: 15000,
      });
      await expect(
        row.getByText(/Withdrew in round 2 — 6 boards not played/),
      ).toBeVisible();

      // Only Active pairs offer a withdrawal.
      await expect(
        director.getByRole("button", { name: "Withdraw this pair" }),
      ).toHaveCount(0);

      // Reinstate: the director shows a code; the returning device claims it.
      await director
        .getByRole("button", { name: "Reinstate on a device" })
        .click();
      const codeEl = director.getByTestId("seat-transfer-code");
      await expect(codeEl).toBeVisible({ timeout: 15000 });
      const code = (await codeEl.textContent())?.trim() ?? "";
      expect(code).toHaveLength(6);

      await returning.goto(`/game/${game.gameId}/join`);
      await returning
        .getByRole("button", { name: /Moving from another device/i })
        .click();
      await returning.getByLabel("Transfer code").fill(code);
      await returning.getByRole("button", { name: "Take over seat" }).click();
      // No names are asked for: the pair is already on record.
      await returning.waitForURL(new RegExp(`/game/${game.gameId}/play/A1NS`), {
        timeout: 15000,
        waitUntil: "commit",
      });

      // Back to Active on the director's screen, live.
      await expect(row.getByText("Active", { exact: true })).toBeVisible({
        timeout: 15000,
      });
      await expect(row.getByText("Withdrawn", { exact: true })).toHaveCount(0);

      // Codes are single use.
      const second = await newParticipant(browser);
      try {
        await second.goto(`/game/${game.gameId}/join`);
        await second
          .getByRole("button", { name: /Moving from another device/i })
          .click();
        await second.getByLabel("Transfer code").fill(code);
        await second.getByRole("button", { name: "Take over seat" }).click();
        await expect(
          second.getByText("Code has already been used"),
        ).toBeVisible({ timeout: 15000 });
        await expect(second).not.toHaveURL(/\/play\//);
      } finally {
        await second.context().close();
      }
    } finally {
      await closeDevices(director, oldDevice, returning);
    }
  });
});

test.describe("Missed boards: AVE−/AVE+ or Remove", () => {
  test("the director's choice saves immediately and persists", async ({
    browser,
    request,
  }) => {
    test.setTimeout(90_000);
    const game = await seedGame({
      ...BASE,
      play: "partial",
      eventName: `Missed Boards ${Date.now()}`,
      scenario: { withdraw: ["A1NS@3"] },
    });
    const director = await openDirector(browser, game);
    try {
      // Default is AVE−/AVE+.
      expect(await absences(request, game.gameId)).toEqual([
        expect.objectContaining({ seat: "A1NS", treatment: "AVERAGE" }),
      ]);

      await openPair(director, game.gameId, /PA1NS North/);
      await expect(
        director.getByText(
          "This pair gets AVE− and its opponents AVE+ on each missed board.",
        ),
      ).toBeVisible({ timeout: 15000 });

      // Remove: saves with no Save button.
      await director.getByLabel("Remove").click();
      await expect(
        director.getByText(/The boards are taken out of the movement/),
      ).toBeVisible({ timeout: 15000 });
      await expect
        .poll(async () => (await absences(request, game.gameId))[0].treatment)
        .toBe("REMOVED");

      // And back again.
      await director.getByLabel("AVE− / AVE+").click();
      await expect
        .poll(async () => (await absences(request, game.gameId))[0].treatment)
        .toBe("AVERAGE");
    } finally {
      await closeDevices(director);
    }
  });
});

test.describe("A seat expected late, then a late arrival", () => {
  test("the empty seat shows Not arrived; a latecomer joining it turns Late", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const game = await seedGame({
      ...BASE,
      play: "partial",
      eventName: `Late Arrival ${Date.now()}`,
      scenario: { expectedLate: ["A3EW"] },
    });
    const director = await openDirector(browser, game);
    const waiting = await openSeat(browser, game, "A1NS");
    const latecomer = await newParticipant(browser);
    try {
      // The empty seat: amber Not arrived, with every board unplayed.
      await gotoStable(director, `/game/${game.gameId}/manage/pairs`);
      const row = director.getByRole("listitem").filter({ hasText: "3EW" });
      await expect(row.getByText("Not arrived", { exact: true })).toBeVisible({
        timeout: 15000,
      });
      await expect(row.getByText("Seat not filled")).toBeVisible();
      await expect(
        row.getByText(/Not arrived yet — 9 boards unplayed/),
      ).toBeVisible();

      // A1NS is due to meet the empty seat and is told to wait.
      await expect(
        waiting.getByText(/Your opponents haven.t arrived yet/),
      ).toBeVisible({ timeout: 20000 });
      await expect(
        waiting.getByRole("button", { name: "Move on to next round" }),
      ).toBeVisible();

      // The latecomer joins the empty seat from the Join screen.
      await latecomer.goto(`/game/${game.gameId}/join`);
      await latecomer.getByTestId("seat-A3EW").click();
      for (const [label, ebu] of [
        ["East", "10008"],
        ["West", "10009"],
      ] as const) {
        await latecomer.getByTestId(`player-search-input-${label}`).fill(ebu);
        await latecomer.getByTestId("player-search-result").first().click();
      }
      await latecomer.getByRole("button", { name: "Enter Pair" }).click();
      await latecomer.waitForURL(new RegExp(`/game/${game.gameId}/play/A3EW`), {
        timeout: 15000,
        waitUntil: "commit",
      });

      // Late, joining the round the room is on, with the earlier boards absent.
      await expect(row.getByText("Late", { exact: true })).toBeVisible({
        timeout: 15000,
      });
      await expect(
        row.getByText(/Arrived in round 2 — 3 boards missed/),
      ).toBeVisible();

      // The waiting pair's notice goes away without a reload.
      await expect(
        waiting.getByText(/Your opponents haven.t arrived yet/),
      ).toHaveCount(0, { timeout: 20000 });
    } finally {
      await closeDevices(director, waiting, latecomer);
    }
  });
});
