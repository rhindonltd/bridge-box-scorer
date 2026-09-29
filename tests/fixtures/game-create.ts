import { Page, expect } from "@playwright/test";

/**
 * Pure-UI game creation helper.
 *
 * Drives the `/create` form exactly as a director would: fills the event and
 * director name, submits, and waits for the redirect to the per-game setup
 * route (`/game/{id}/create`). The director token is written to localStorage
 * by the app during creation, so the returned {@link CreatedGame.page} context
 * is authorised to manage the game (start it, override travellers, delete it).
 */

export interface CreatedGame {
  gameId: string;
  /** The director token the app stored in localStorage for this game. */
  directorToken: string;
}

export async function createGame(
  page: Page,
  opts: {
    eventName: string;
    directorName?: string;
    /**
     * Whether the game records opening leads. Defaults to true (the app's
     * default). When false, the "Record Opening Lead" toggle is switched off
     * so the ContractWizard omits its opening-lead step.
     */
    recordOpeningLead?: boolean;
    /**
     * The event type. Defaults to "PAIRS" (the form's default). "TEAMS"
     * switches the "Event Type" dropdown to Teams, which in turn swaps the
     * Scoring options over to the teams set (see {@link teamsScoring}).
     */
    gameType?: "PAIRS" | "TEAMS";
    /**
     * For a Teams game, which teams scoring to select. Defaults to "IMP"
     * (the form's default). Ignored for a Pairs game.
     */
    teamsScoring?: "IMP" | "IMP_VP" | "BAM" | "PAB";
  },
): Promise<CreatedGame> {
  await page.goto("/create");

  // The create page fires a BridgeWebs-events fetch on mount; when it resolves
  // it re-renders the form. Filling before that settles can drop the first
  // field's value in WebKit (the re-render lands between the input event and
  // React committing the state). Wait for the page to go idle first.
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Event Name").fill(opts.eventName);
  await page.getByLabel("Director Name").fill(opts.directorName ?? "E2E Director");

  // Event Type is a native <select> ("Pairs" / "Teams"), defaulting to Pairs.
  // Switching to Teams re-renders the Scoring dropdown with the teams options.
  if (opts.gameType === "TEAMS") {
    await page.getByLabel("Event Type").selectOption("TEAMS");
    if (opts.teamsScoring) {
      // The Scoring dropdown now carries the teams options; select by value.
      await page.getByLabel("Scoring").selectOption(opts.teamsScoring);
    }
  }

  // "Record Opening Lead" is a two-button toggle (No / Yes), defaulting to Yes.
  // Only click when the caller wants it off, to keep the default path untouched.
  // Scope to the toggle by its label — the form has other No/Yes toggles
  // ("Allow Hand Entry"), so an unscoped "No" match is ambiguous.
  if (opts.recordOpeningLead === false) {
    await page
      .getByLabel("Record Opening Lead")
      .getByRole("button", { name: "No", exact: true })
      .click();
  }

  await page.getByRole("button", { name: "Create Game", exact: true }).click();

  await page.waitForURL(/\/game\/.+\/create/, { timeout: 15000 });

  const match = /\/game\/([^/]+)\/create/.exec(page.url());
  if (!match) {
    throw new Error(`Unexpected create URL: ${page.url()}`);
  }
  const gameId = match[1];

  // The setup page hydrates asynchronously; wait for it to leave the
  // "Loading game..." state before returning so callers can act immediately.
  // The header hamburger ("Setup menu") is present once the setup page renders.
  await expect(page.getByRole("button", { name: "Setup menu" })).toBeVisible({
    timeout: 15000,
  });

  const directorToken = await page.evaluate(
    (id) => localStorage.getItem(`director:${id}`),
    gameId,
  );
  if (!directorToken) {
    throw new Error(`Director token was not stored for game ${gameId}`);
  }

  return { gameId, directorToken };
}
