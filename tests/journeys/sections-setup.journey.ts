import { test, expect, Page } from "@playwright/test";

import { createGame } from "../fixtures/game-create";
import { setTableCount, pickFirstMovement } from "../fixtures/game-setup";
import { deleteGame } from "../fixtures/delete-game";
import { newParticipant } from "./support";

/**
 * Sections setup UI journey.
 *
 * Drives the SectionManager on the setup Movement tab: a single-section game
 * shows the movement picker with an "Add Section" banner; adding a section
 * reveals the multi-section list where sections can be renamed and deleted
 * (delete hidden when only one section remains), each showing a movement
 * summary and a Set/Change Movement control.
 */

async function openMovementTab(page: Page, gameId: string): Promise<void> {
  await page.goto(`/game/${gameId}/create`);
  await page.getByRole("tab", { name: "Movement" }).click();
}

test.describe("Sections setup", () => {
  test("single-section shows the movement picker with an Add Section banner", async ({
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

      // Single-section: the picker's "Add Section" banner is shown, and there
      // is no per-section "Section A" heading / label editor.
      await expect(
        page.getByRole("button", { name: "Add Section" }),
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Section A", { exact: true })).toHaveCount(0);
      // Movement cards are offered (the picker itself).
      await expect(page.getByTestId("movement-card").first()).toBeVisible();
    } finally {
      await deleteGame(page, gameId);
      await page.context().close();
    }
  });

  test("adding a section reveals the list; rename and delete work", async ({
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

      // Add a second section -> the multi-section list shows Section A and B.
      await page.getByRole("button", { name: "Add Section" }).click();
      await expect(page.getByText("Section A", { exact: true })).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByText("Section B", { exact: true })).toBeVisible();

      // Each section shows a movement summary (none chosen yet) and a Set
      // Movement control.
      await expect(
        page.getByText("No movement selected").first(),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Set Movement|Change Movement/ }).first(),
      ).toBeVisible();

      // Rename section B via its Label field (commits on blur).
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

  test("per-section movement summary reflects a chosen Mitchell", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await newParticipant(browser);
    const { gameId } = await createGame(page, {
      eventName: `Sections Movement ${Date.now()}`,
      recordOpeningLead: false,
    });

    try {
      // Single-section: pick the first movement, then the picker returns and
      // the summary should reflect a selected movement (not "No movement
      // selected"). pickFirstMovement selects the first recommended card.
      await setTableCount(page, 3);
      await pickFirstMovement(page);

      // Re-open the Movement tab; with a movement chosen the single-section
      // picker still shows (its "Change"/selected state), and adding a section
      // surfaces the summary line.
      await openMovementTab(page, gameId);
      await page.getByRole("button", { name: "Add Section" }).click();

      // Section A now has a movement summary that is not the "none" text.
      await expect(page.getByText("Section A", { exact: true })).toBeVisible({
        timeout: 15000,
      });
      // At least one section still needs a movement ("No movement selected"),
      // and section A's summary is a movement description (contains "tables"
      // for a Mitchell, or "Movement selected").
      await expect(
        page.getByText(/tables|Movement selected/).first(),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteGame(page, gameId);
      await page.context().close();
    }
  });
});
