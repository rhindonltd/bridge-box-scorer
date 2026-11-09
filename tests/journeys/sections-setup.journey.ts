import { test, expect, Page } from "@playwright/test";

import { createGame } from "../fixtures/game-create";
import {
  setTableCount,
  openSetupStep,
  addSection,
  selectSection,
} from "../fixtures/game-setup";
import { deleteGame } from "../fixtures/delete-game";
import { newParticipant } from "./support";

/**
 * Sections setup UI journey.
 *
 * The Movement step shows the shared section pills (with a "+ Add section"
 * pill) above the per-section movement picker. Section rename/delete lives in
 * the section header on the Tables screen.
 */

async function openMovementTab(page: Page, gameId: string): Promise<void> {
  await page.goto(`/game/${gameId}/create`);
  await openSetupStep(page, "Movement");
}

test.describe("Sections setup", () => {
  test("single-section shows the pills and the movement picker", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await newParticipant(browser);
    const { gameId } = await createGame(page, {
      eventName: `Sections One ${Date.now()}`,
      recordOpeningLead: false,
    });

    try {
      await setTableCount(page, 2);
      await openMovementTab(page, gameId);

      // Single-section: no "Section A" pill, just a "Split into sections" pill,
      // above the movement picker's recommendation cards.
      await expect(
        page.getByRole("button", { name: /Split into sections/ }),
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole("tab", { name: "Section A" })).toHaveCount(0);
      await expect(page.getByTestId("movement-card").first()).toBeVisible();
    } finally {
      await deleteGame(page, gameId);
      await page.context().close();
    }
  });

  test("adding a section reveals a pill; rename and delete work on the Tables screen", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await newParticipant(browser);
    const { gameId } = await createGame(page, {
      eventName: `Sections CRUD ${Date.now()}`,
      recordOpeningLead: false,
    });

    try {
      await setTableCount(page, 2);
      await openMovementTab(page, gameId);

      // Add a second section via the pill + naming modal -> a Section B pill.
      await addSection(page);
      await expect(
        page.getByRole("tab", { name: /Section A/ }),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByRole("tab", { name: /Section B/ }),
      ).toBeVisible();

      // Rename / delete happen in the section header on the Tables screen.
      await openSetupStep(page, "Tables");
      await selectSection(page, "B");

      const label = page.getByLabel("Section label");
      await label.fill("Evening");
      await label.blur();
      await expect(
        page.getByRole("tab", { name: /Section B — Evening/ }),
      ).toBeVisible({ timeout: 15000 });

      // Delete controls are present while there is more than one section.
      const deleteButton = page.getByRole("button", { name: "Delete section" });
      await expect(deleteButton).toHaveCount(1);

      // Delete section B (accept the confirm dialog) -> back to single section.
      page.once("dialog", (d) => d.accept());
      await deleteButton.click();
      await expect(page.getByRole("tab", { name: /Section B/ })).toHaveCount(0, {
        timeout: 15000,
      });
    } finally {
      await deleteGame(page, gameId);
      await page.context().close();
    }
  });

  test("a movement can be chosen per section via the pills", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await newParticipant(browser);
    const { gameId } = await createGame(page, {
      eventName: `Sections Movement ${Date.now()}`,
      recordOpeningLead: false,
    });

    try {
      await setTableCount(page, 2);
      await openMovementTab(page, gameId);
      await addSection(page);

      // Pick the first recommended movement for section A.
      await selectSection(page, "A");
      const cardA = page.getByTestId("movement-card").first();
      await expect(cardA).toBeVisible({ timeout: 15000 });
      await cardA.click();
      const confirmA = page.getByRole("button", { name: "Select Movement" });
      await expect(confirmA).toBeEnabled({ timeout: 15000 });
      await confirmA.click();
      await expect(
        page.getByRole("button", { name: /Select Movement|Selecting/ }),
      ).toHaveCount(0, { timeout: 15000 });

      // Switch to section B and confirm its own recommendations are offered.
      await selectSection(page, "B");
      await expect(
        page.getByTestId("movement-card").first(),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteGame(page, gameId);
      await page.context().close();
    }
  });
});
