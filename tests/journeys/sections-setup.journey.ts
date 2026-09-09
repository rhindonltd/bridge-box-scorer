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
 * pill) above the per-section movement picker. Section rename/delete lives on
 * the separate "Manage sections" screen, reached from the Setup menu.
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

      // Single-section: the Section A pill and the "+ Add section" pill show,
      // above the movement picker's recommendation cards.
      await expect(
        page.getByRole("tab", { name: "Section A" }),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByRole("button", { name: /Add section/ }),
      ).toBeVisible();
      await expect(page.getByTestId("movement-card").first()).toBeVisible();
    } finally {
      await deleteGame(page, gameId);
      await page.context().close();
    }
  });

  test("adding a section reveals a pill; rename and delete work on Manage sections", async ({
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

      // Rename / delete happen on the Manage sections screen.
      await openSetupStep(page, "Manage sections");

      const labels = page.getByLabel("Label");
      await labels.nth(1).fill("Evening");
      await labels.nth(1).blur();
      await expect(labels.nth(1)).toHaveValue("Evening", { timeout: 15000 });

      // Delete controls are present while there is more than one section.
      const deleteButtons = page.getByRole("button", { name: "Delete" });
      await expect(deleteButtons).toHaveCount(2);

      // Delete section B (accept the confirm dialog) -> back to single section.
      page.once("dialog", (d) => d.accept());
      await deleteButtons.nth(1).click();
      await expect(page.getByText("Section B", { exact: true })).toBeHidden({
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
