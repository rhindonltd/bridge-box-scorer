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
     * The event type (the "Event Type" dropdown's value). Defaults to "PAIRS"
     * (the form's default). "TEAMS" swaps the Scoring options over to the teams
     * set (see {@link teamsScoring}). "SWISS_PAIRS" / "SWISS_TEAMS" create a
     * Swiss game, whose movement is set up inline and drawn round by round;
     * Swiss Teams is always scored by IMP Victory Points, so it has no Scoring
     * choice.
     */
    gameType?: "PAIRS" | "TEAMS" | "SWISS_PAIRS" | "SWISS_TEAMS";
    /**
     * For a (non-Swiss) Teams game, which teams scoring to select. Defaults to
     * "IMP" (the form's default). Ignored for every other event type.
     */
    teamsScoring?: "IMP" | "IMP_VP" | "BAM" | "PAB";
    /**
     * For a (non-Swiss) Pairs game, which scoring to select. Defaults to "MP"
     * (the form's default). Ignored for every other event type.
     */
    pairsScoring?: "MP" | "XIMP";
    /**
     * Whether the game allows players to enter the dealt cards. Defaults to
     * false (the app's default). When true, the "Allow Hand Entry" toggle is
     * switched on so the post-round "Enter cards" step is offered.
     */
    handEntry?: boolean;
  },
): Promise<CreatedGame> {
  await page.goto("/create");

  // The create page fires a BridgeWebs-events fetch on mount; when it resolves
  // it re-renders the form. Filling before that settles can drop the first
  // field's value in WebKit (the re-render lands between the input event and
  // React committing the state). Wait for the page to go idle first.
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Event Name").fill(opts.eventName);
  await page
    .getByLabel("Director Name")
    .fill(opts.directorName ?? "E2E Director");

  // The create form is a two-step wizard: step 1 collects the event + director
  // name (gated behind "Next"), step 2 the event type / scoring / toggles with
  // the final "Create Game" action. Advance past the details step before
  // touching any options-step control.
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Event Type is a native <select> (Pairs / Teams / Swiss Pairs / Swiss Teams),
  // defaulting to Pairs. Switching to Teams re-renders the Scoring dropdown
  // with the teams options.
  if (opts.gameType && opts.gameType !== "PAIRS") {
    await page.getByLabel("Event Type").selectOption(opts.gameType);
  }
  if (
    (opts.gameType === undefined || opts.gameType === "PAIRS") &&
    opts.pairsScoring
  ) {
    await page.getByLabel("Scoring").selectOption(opts.pairsScoring);
  }
  if (opts.gameType === "TEAMS" && opts.teamsScoring) {
    // The Scoring dropdown now carries the teams options; select by value.
    await page.getByLabel("Scoring").selectOption(opts.teamsScoring);
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

  // "Allow Hand Entry" is a two-button toggle (No / Yes), defaulting to No.
  // Only click when the caller wants it on. Scope to the toggle by its label
  // so the "Yes" match isn't ambiguous with the other No/Yes toggles.
  if (opts.handEntry === true) {
    await page
      .getByLabel("Allow Hand Entry")
      .getByRole("button", { name: "Yes", exact: true })
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
