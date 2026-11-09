import { test, expect } from "@playwright/test";
import {
  closeDevices,
  newDevice,
  openDirector,
  seatStorage,
  seedGame,
} from "../fixtures/seeded-game";
import { openSetupStep } from "../fixtures/game-setup";
import { gotoStable } from "./support";

/**
 * Pre-start setup screens that sit around the movement picker: editing the
 * event details after creation, and marking empty seats "expected late" so the
 * game can start short. Seeded with `prestart` (seated, movement chosen, not
 * started); manual equivalents are docs/e2e/11 (EL-*) and 01.
 */
test.describe("Edit Event Details", () => {
  test("renaming saves; changing the scoring asks first and clears the movement", async ({
    browser,
    request,
  }) => {
    test.setTimeout(90_000);
    const game = await seedGame({
      scoring: "MP",
      rounds: 3,
      eventName: `Edit Details ${Date.now()}`,
      scenario: { prestart: true },
    });
    const director = await openDirector(
      browser,
      game,
      `/game/${game.gameId}/create`,
    );
    try {
      const gameRow = async () =>
        (await (await request.get(`/api/games/${game.gameId}`)).json()).result
          .game as {
          eventName: string;
          scoringType: string;
          selectedMovement: string | null;
        };
      expect((await gameRow()).selectedMovement).toBeTruthy();

      // The setup flow's back arrow leads out to Edit Event Details.
      await director.getByRole("button", { name: "Go back" }).click();
      await expect(director.getByText("Edit Event Details")).toBeVisible({
        timeout: 15000,
      });

      // A rename alone needs no confirmation and keeps the movement.
      const newName = `Renamed ${Date.now()}`;
      await director.getByLabel("Event Name").fill(newName);
      await director.getByRole("button", { name: "Save", exact: true }).click();
      await expect.poll(async () => (await gameRow()).eventName).toBe(newName);
      expect((await gameRow()).selectedMovement).toBeTruthy();

      // Changing the scoring clears the movement, so it is confirmed first.
      await director.getByRole("button", { name: "Go back" }).click();
      await director.getByLabel("Scoring").selectOption("XIMP");
      let message = "";
      director.once("dialog", (d) => {
        message = d.message();
        void d.dismiss();
      });
      await director.getByRole("button", { name: "Save", exact: true }).click();
      await expect.poll(() => message).toMatch(/clear the movement/);
      // Dismissed: nothing changed.
      expect((await gameRow()).scoringType).toBe("MP");

      director.once("dialog", (d) => void d.accept());
      await director.getByRole("button", { name: "Save", exact: true }).click();
      await expect.poll(async () => (await gameRow()).scoringType).toBe("XIMP");
      expect((await gameRow()).selectedMovement).toBeFalsy();
    } finally {
      await closeDevices(director);
    }
  });
});

test.describe("Expected-late seats before the start", () => {
  test("one empty seat may sit out; more must be marked expected late", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);
    // Two empty seats on different tables (A3EW and A2NS), nothing marked.
    const game = await seedGame({
      scoring: "MP",
      rounds: 3,
      eventName: `Expected Late ${Date.now()}`,
      scenario: { prestart: true, empty: ["A3EW", "A2NS"] },
    });
    const director = await openDirector(
      browser,
      game,
      `/game/${game.gameId}/create`,
    );
    try {
      // Two empty seats are more than the single permitted sit-out.
      await openSetupStep(director, "Start Game");
      await expect(
        director.getByText(/More than one pair is missing/),
      ).toBeVisible({ timeout: 15000 });
      await expect(director.getByText("Tap to Start Game")).toHaveCount(0);

      // Mark both empty seats expected late.
      for (const table of [2, 3]) {
        await openSetupStep(director, "Tables");
        await director
          .getByRole("button", { name: `Manage table ${table}` })
          .click();
        await expect(
          director.getByText(
            /Start without this pair; seat them when they arrive/,
          ),
        ).toBeVisible({ timeout: 15000 });
        const yes = director
          .getByRole("group", { name: "Expected late" })
          .getByRole("button", { name: "Yes", exact: true });
        await yes.click();
        await expect(yes).toHaveAttribute("aria-pressed", "true", {
          timeout: 15000,
        });
        // The toggle flips at once; wait for the server to hold it too before
        // moving on, so the Start Game check reads the saved state.
        const seat = table === 2 ? "A2NS" : "A3EW";
        await expect
          .poll(
            async () =>
              (
                await (
                  await request.get(
                    `/api/games/${game.gameId}/expected-late-seats`,
                  )
                ).json()
              ).result.seats,
            { timeout: 15000 },
          )
          .toContain(seat);
        await director
          .getByRole("button", { name: "Done", exact: true })
          .click();
      }

      // Now any number of expected-late seats is fine: the game can start.
      await openSetupStep(director, "Start Game");
      await expect(director.getByText("Everything’s ready")).toBeVisible({
        timeout: 15000,
      });
      await director.getByRole("button", { name: "Start game" }).click();

      // Started: the Manage menu now offers Pairs, where the empty seats show
      // as Not arrived rather than being sat out.
      await gotoStable(director, `/game/${game.gameId}/manage/pairs`);
      await expect(
        director.getByText("Not arrived", { exact: true }),
      ).toHaveCount(2, { timeout: 15000 });
    } finally {
      await closeDevices(director);
    }
  });
});

test.describe("Splitting into sections with pairs already seated", () => {
  test("seats are renumbered and each waiting device follows its seat", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    // Five tables, everyone seated, not started. Splitting renumbers the
    // seats that move into the new section.
    const game = await seedGame({
      scoring: "MP",
      tables: 5,
      rounds: 5,
      eventName: `Split Sections ${Date.now()}`,
      scenario: { prestart: true },
    });
    const director = await openDirector(
      browser,
      game,
      `/game/${game.gameId}/create`,
    );
    // The pair on the last table is the one that moves into the new section.
    const moverContext = await newDevice(browser, seatStorage(game, "A5NS"));
    const mover = await moverContext.newPage();
    await mover.goto(`/game/${game.gameId}/play/A5NS`, { waitUntil: "commit" });
    await expect(mover.getByText("You're seated", { exact: true })).toBeVisible(
      {
        timeout: 15000,
      },
    );
    try {
      await openSetupStep(director, "Tables");
      // Divide the existing section: the pairs at the moved tables come across.
      await director
        .getByRole("button", { name: /Split into sections/ })
        .click();
      await director.getByText("Split existing", { exact: true }).click();
      await director
        .getByRole("button", { name: "Split", exact: true })
        .click();
      await expect(
        director.getByRole("tab", { name: /Section B/ }),
      ).toBeVisible({
        timeout: 15000,
      });

      // The waiting device is moved to its renumbered seat without any action.
      await mover.waitForURL(/\/play\/B\d(NS|EW)$/, { timeout: 20000 });
      expect(mover.url()).not.toContain("/play/A5NS");
    } finally {
      await closeDevices(director, mover);
    }
  });
});
