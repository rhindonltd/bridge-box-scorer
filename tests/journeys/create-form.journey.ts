import { test, expect, Page } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { newParticipant } from "./support";

/**
 * Create-game form journey.
 *
 * Exercises the `/create` form directly (fields, event type, date, lead
 * toggle), the no-validation edge (blank names are accepted), the "Creating…"
 * in-flight state, successful navigation to the setup route, and the failure
 * path (the create goes over Socket.IO; aborting that transport makes the
 * acknowledged emit time out, surfacing the inline error).
 */

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

async function extractGameId(page: Page): Promise<string> {
  const match = /\/game\/([^/]+)\/create/.exec(page.url());
  if (!match) throw new Error(`Unexpected URL: ${page.url()}`);
  return match[1];
}

test.describe("Create game form", () => {
  test("fields, event type, date default and lead toggle behave", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await newParticipant(browser);
    let gameId: string | null = null;

    try {
      await page.goto("/create");

      // Fields accept input.
      await page.getByLabel("Event Name").fill("Thursday Pairs");
      await expect(page.getByLabel("Event Name")).toHaveValue("Thursday Pairs");
      await page.getByLabel("Director Name").fill("Jane Director");
      await expect(page.getByLabel("Director Name")).toHaveValue("Jane Director");

      // Event Type offers Pairs and Teams; default Pairs.
      const eventType = page.getByLabel("Event Type");
      await expect(eventType).toBeVisible();
      await eventType.selectOption({ label: "Teams" });
      await eventType.selectOption({ label: "Pairs" });

      // Date defaults to today and is editable.
      await expect(page.getByLabel("Date Played")).toHaveValue(todayIso());

      // "Record Opening Lead" toggle: switch to No then back to Yes.
      await page.getByRole("button", { name: "No", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "No", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: "Yes", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Yes", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");

      // Submit -> navigates to the setup route.
      await page.getByRole("button", { name: "Create Game", exact: true }).click();
      await page.waitForURL(/\/game\/.+\/create/, { timeout: 15000 });
      gameId = await extractGameId(page);
      await expect(page.getByRole("tab", { name: "Tables" })).toBeVisible({
        timeout: 15000,
      });
    } finally {
      if (gameId) await deleteGame(page, gameId);
      await page.context().close();
    }
  });

  test("blank event/director names are accepted (no client validation)", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await newParticipant(browser);
    let gameId: string | null = null;

    try {
      await page.goto("/create");
      // Submit immediately with empty names.
      await page.getByRole("button", { name: "Create Game", exact: true }).click();
      await page.waitForURL(/\/game\/.+\/create/, { timeout: 15000 });
      gameId = await extractGameId(page);
      await expect(page.getByRole("tab", { name: "Tables" })).toBeVisible({
        timeout: 15000,
      });
    } finally {
      if (gameId) await deleteGame(page, gameId);
      await page.context().close();
    }
  });

  test("create failure shows the inline error and re-enables the button", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await newParticipant(browser);

    try {
      await page.goto("/create");
      await page.getByLabel("Event Name").fill("Doomed Game");

      // The create is an acknowledged Socket.IO emit. Abort the socket.io
      // transport so the emit never gets its ack and times out (~5s), which
      // surfaces the inline error. Installed only now so the page loaded fine.
      await page.route("**/socket.io/**", (route) => route.abort());

      await page.getByRole("button", { name: "Create Game", exact: true }).click();

      // While in flight the button reads "Creating…".
      await expect(
        page.getByRole("button", { name: "Creating", exact: false }),
      ).toBeVisible({ timeout: 5000 });

      // After the emit times out, the inline error shows and the button is
      // back to "Create Game" (re-enabled).
      await expect(
        page.getByText("Failed to create game. Please try again."),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByRole("button", { name: "Create Game", exact: true }),
      ).toBeEnabled();
    } finally {
      await page.unroute("**/socket.io/**").catch(() => {});
      await page.context().close();
    }
  });
});
