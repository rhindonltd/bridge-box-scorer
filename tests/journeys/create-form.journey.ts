import { test, expect, Page } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { newParticipant } from "./support";

/**
 * Create-game form journey.
 *
 * Exercises the two-step `/create` wizard directly: details (event + director
 * name, blank values refused), then options (event type, lead toggle),
 * successful navigation to the setup route, and the failure path (the create is
 * an HTTP POST to /api/games; failing that request surfaces the inline error).
 */

async function extractGameId(page: Page): Promise<string> {
  const match = /\/game\/([^/]+)\/create/.exec(page.url());
  if (!match) throw new Error(`Unexpected URL: ${page.url()}`);
  return match[1];
}

test.describe("Create game form", () => {
  test("fields, event type and lead toggle behave", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await newParticipant(browser);
    let gameId: string | null = null;

    try {
      await page.goto("/create");
      // Let the on-mount BridgeWebs fetch settle before filling; its re-render
      // can otherwise drop the field values by submit time (WebKit).
      await page.waitForLoadState("networkidle");

      // Fields accept input.
      await page.getByLabel("Event Name").fill("Thursday Pairs");
      await expect(page.getByLabel("Event Name")).toHaveValue("Thursday Pairs");
      await page.getByLabel("Director Name").fill("Jane Director");
      await expect(page.getByLabel("Director Name")).toHaveValue("Jane Director");

      // The form is a two-step wizard: details first, then options.
      await page.getByRole("button", { name: "Next", exact: true }).click();

      // Event Type offers the four choices; default Pairs.
      const eventType = page.getByLabel("Event Type");
      await expect(eventType).toBeVisible();
      await expect(eventType.locator("option")).toHaveText([
        "Pairs",
        "Teams",
        "Swiss Pairs",
        "Swiss Teams",
      ]);
      await expect(eventType).toHaveValue("PAIRS");
      await eventType.selectOption({ label: "Teams" });
      await eventType.selectOption({ label: "Pairs" });

      // "Record Opening Lead" toggle: switch to No then back to Yes.
      const lead = page.getByLabel("Record Opening Lead");
      await lead.getByRole("button", { name: "No", exact: true }).click();
      await expect(
        lead.getByRole("button", { name: "No", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await lead.getByRole("button", { name: "Yes", exact: true }).click();
      await expect(
        lead.getByRole("button", { name: "Yes", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");

      // Submit -> navigates to the setup route. The setup page opens a live
      // (WebSocket) connection that never lets the "load" event fire, so wait
      // for the URL to change on commit rather than on load.
      await page.getByRole("button", { name: "Create Game", exact: true }).click();
      await page.waitForURL(/\/game\/.+\/create/, {
        timeout: 15000,
        waitUntil: "commit",
      });
      gameId = await extractGameId(page);
      await expect(page.getByRole("button", { name: "Setup menu" })).toBeVisible({
        timeout: 15000,
      });
    } finally {
      if (gameId) await deleteGame(page, gameId);
      await page.context().close();
    }
  });

  test("blank details are rejected and the form stays on the details step", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await newParticipant(browser);

    try {
      await page.goto("/create");
      // The page fires a BridgeWebs-events fetch on mount that re-renders the
      // form; let it settle before submitting so the click isn't lost (WebKit).
      await page.waitForLoadState("networkidle");
      // Advance with both names blank. The details step refuses to move on:
      // the empty fields are flagged invalid and the options step (with its
      // "Create Game" action) never appears.
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(page.getByLabel("Event Name")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      await expect(page.getByLabel("Director Name")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      await expect(
        page.getByRole("button", { name: "Create Game", exact: true }),
      ).toHaveCount(0);
      await expect(page).toHaveURL(/\/create$/);
    } finally {
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
      // Let the on-mount fetch settle so the field fill isn't lost (WebKit).
      await page.waitForLoadState("networkidle");
      await page.getByLabel("Event Name").fill("Doomed Game");
      await page.getByLabel("Director Name").fill("E2E Director");
      await page.getByRole("button", { name: "Next", exact: true }).click();

      // The create is an HTTP POST to /api/games. Fail that request so the
      // client's create call rejects and surfaces the inline error. Installed
      // only now so the page loaded fine.
      await page.route("**/api/games", (route) =>
        route.request().method() === "POST"
          ? route.fulfill({
              status: 500,
              contentType: "application/json",
              body: JSON.stringify({ error: "Internal server error" }),
            })
          : route.continue(),
      );

      await page.getByRole("button", { name: "Create Game", exact: true }).click();

      // The inline error shows and the button returns to "Create Game"
      // (re-enabled) once the failed create settles.
      await expect(
        page.getByText("Failed to create game. Please try again."),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByRole("button", { name: "Create Game", exact: true }),
      ).toBeEnabled();
    } finally {
      await page.unroute("**/api/games").catch(() => {});
      await page.context().close();
    }
  });
});
