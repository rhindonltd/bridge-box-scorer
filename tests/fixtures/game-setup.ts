import { Page, expect } from "@playwright/test";

/**
 * Pure-UI game setup helpers, driven through the director setup menu at
 * `/game/{id}/create`: Tables (table count + seating overview), Movement
 * (recommended movement picker), and the Start Game screen. The views are
 * reached from a hamburger menu in the header's top-right (aria-label
 * "Setup menu"), whose entries include Tables / Movement / Timer / Start Game.
 *
 * A two-table game is the smallest field that yields a recommended movement
 * (a single table offers none), so the live-update journeys use two tables.
 */

// The Tables NumberStepper exposes its controls via aria-labels (the visible
// glyphs are decorative), and the current value via a spinbutton labelled
// "Tables".
const DECREASE_TABLES = "Decrease Tables";
const INCREASE_TABLES = "Increase Tables";

/**
 * Open the header hamburger ("Setup menu") and switch to the named setup view
 * (Tables / Movement / Timer). Replaces the old segmented tab bar, so callers
 * that previously clicked a `tab` now go through this menu.
 */
export async function openSetupStep(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Setup menu" }).click();
  // Wait for the menu item to be actionable before clicking: the menu animates
  // open, and on the narrow mobile viewport a click fired before it settles can
  // miss (leaving the menu open and the view unchanged, which later steps then
  // hang on). getByRole scopes to the open menu; toBeVisible waits out the
  // animation.
  const item = page.getByRole("menuitem", { name });
  await expect(item).toBeVisible({ timeout: 15000 });
  await item.click();
  // The menu closes once a view is chosen; wait for it to go away so a
  // subsequent interaction isn't intercepted by the closing overlay.
  await expect(page.getByRole("menuitem", { name })).toBeHidden({
    timeout: 15000,
  });
}

/**
 * Add a section via the shared "+ Add section" pill and its naming modal. Works
 * from any setup page (Tables / Movement / Timer). The modal accepts the
 * prefilled letter names, so this creates the next section (and, on the first
 * add, keeps the existing section's default name). Assumes the current setup
 * page is already open.
 */
export async function addSection(page: Page): Promise<void> {
  // Single-section games show "Split into sections"; multi-section games show
  // "Add section". Match either.
  await page
    .getByRole("button", { name: /Split into sections|Add section/ })
    .click();
  // The modal prefills the letter name(s); accept the defaults and confirm.
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add", exact: true }),
  ).toHaveCount(0, { timeout: 15000 });
}

/** Switch to a section via its pill (e.g. "Section B"). */
export async function selectSection(
  page: Page,
  section: string,
): Promise<void> {
  await page.getByRole("tab", { name: new RegExp(`Section ${section}`) }).click();
}

async function readTableCount(page: Page): Promise<number> {
  // The current count is the value of the "Tables" spinbutton.
  const value = await page
    .getByRole("spinbutton", { name: "Tables" })
    .inputValue();
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Could not read table count (saw "${value}")`);
  }
  return n;
}

/**
 * Drive the Tables stepper to the requested count using the increase/decrease
 * buttons, exactly as a director would (there is no direct text entry).
 */
export async function setTableCount(page: Page, target: number): Promise<void> {
  await openSetupStep(page, "Tables");
  await expect(
    page.getByRole("button", { name: DECREASE_TABLES, exact: true }),
  ).toBeVisible();

  for (let guard = 0; guard < 20; guard++) {
    const current = await readTableCount(page);
    if (current === target) return;
    const name = current > target ? DECREASE_TABLES : INCREASE_TABLES;
    await page.getByRole("button", { name, exact: true }).click();
    // The stepper re-renders the seating grid; give it a beat to settle.
    await page.waitForTimeout(150);
  }

  throw new Error(`Failed to reach table count ${target}`);
}

/**
 * Open the Movement tab and select the first recommended movement card.
 *
 * Clicking a card only PREVIEWS it; the choice is not committed until the
 * "Select Movement" confirm button on the preview screen is pressed. Both
 * clicks are required, otherwise no movement is persisted and the game never
 * becomes startable.
 */
export async function pickFirstMovement(page: Page): Promise<void> {
  await openSetupStep(page, "Movement");
  const firstCard = page.getByTestId("movement-card").first();
  await expect(firstCard).toBeVisible({ timeout: 15000 });
  await firstCard.click();
  await confirmMovementSelection(page);
}

/**
 * Confirm the previewed movement via the "Select Movement" button and wait for
 * the preview screen to close (the button flips to "Selecting…" while the save
 * is in flight, then the picker returns to the movement list).
 */
async function confirmMovementSelection(page: Page): Promise<void> {
  // The preview fetches its table/round layout before the confirm button
  // enables, so wait for enabled (not just visible) before clicking.
  const confirm = page.getByRole("button", { name: "Select Movement" });
  await expect(confirm).toBeEnabled({ timeout: 15000 });
  await confirm.click();
  await expect(
    page.getByRole("button", { name: /Select Movement|Selecting/ }),
  ).toHaveCount(0, { timeout: 15000 });
}

/**
 * Open the Movement tab and select the first recommended movement card whose
 * name contains `nameSubstring` (case-insensitive). Returns the selected card's
 * full name. Throws if no matching card is offered for the current table count.
 *
 * The movement card's name is in its `<h3>`; recommendations are filtered by
 * table count, so callers must set a table count that offers the wanted family.
 */
export async function pickMovementByName(
  page: Page,
  nameSubstring: string,
): Promise<string> {
  await openSetupStep(page, "Movement");
  const cards = page.getByTestId("movement-card");
  await expect(cards.first()).toBeVisible({ timeout: 15000 });

  const needle = nameSubstring.toLowerCase();
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const name = (await card.locator("h3").textContent())?.trim() ?? "";
    if (name.toLowerCase().includes(needle)) {
      await card.click();
      await confirmMovementSelection(page);
      return name;
    }
  }
  throw new Error(
    `No recommended movement matching "${nameSubstring}" for this table count`,
  );
}

/**
 * Open the Movement tab and set up a Swiss Pairs movement. Swiss is offered
 * only for a single-section game and is not a recommendation card, so it has
 * its own option (`swiss-movement-option`) that opens a setup dialog. This taps
 * it, accepts the dialog's defaults for rounds/boards-per-round, and confirms.
 */
export async function pickSwissMovement(page: Page): Promise<void> {
  await openSetupStep(page, "Movement");
  const swiss = page.getByTestId("swiss-movement-option");
  await expect(swiss).toBeVisible({ timeout: 15000 });
  await swiss.click();

  const confirm = page.getByRole("button", { name: "Select Movement" });
  await expect(confirm).toBeEnabled({ timeout: 15000 });
  await confirm.click();
  await expect(
    page.getByRole("button", { name: /Select Movement|Saving/ }),
  ).toHaveCount(0, { timeout: 15000 });
}

/**
 * Open the Movement tab and set up a Swiss Pairs movement that uses "2 half
 * matches" for an odd field. Taps the Swiss card to open its dialog, trims the
 * round count down to `rounds` (default 2 — enough for the half-match journey),
 * selects the "2 half matches" odd-handling radio (which reveals the per-round
 * plan, defaulting every round to a half match), and confirms. Used by the
 * odd-field half-match journey.
 *
 * The rounds are trimmed FIRST, before expanding the per-round plan, so the
 * dialog stays short: on the narrow phone viewport the full 7-round plan pushes
 * the "Select Movement" button below the (non-scrolling) dialog, and the
 * confirm click can never land. Fewer rounds keeps the whole dialog on-screen.
 */
export async function pickSwissHalfMatchMovement(
  page: Page,
  rounds = 2,
): Promise<void> {
  await openSetupStep(page, "Movement");
  const swiss = page.getByTestId("swiss-movement-option");
  await expect(swiss).toBeVisible({ timeout: 15000 });
  await swiss.click();

  // Wait for the Swiss setup dialog to open (its confirm button is present)
  // before interacting with it.
  const confirm = page.getByRole("button", { name: "Select Movement" });
  await expect(confirm).toBeVisible({ timeout: 15000 });

  // Trim rounds down to the requested count via the Rounds stepper, so the
  // revealed per-round plan is short and the dialog fits the viewport.
  const decreaseRounds = page.getByRole("button", {
    name: "Decrease Rounds",
    exact: true,
  });
  for (let guard = 0; guard < 40; guard++) {
    const value = Number(
      await page.getByRole("spinbutton", { name: "Rounds" }).inputValue(),
    );
    if (value <= rounds) break;
    await decreaseRounds.click();
    await page.waitForTimeout(50);
  }

  // Choose "2 half matches" so every round resolves an odd pair with a group.
  const halfMatches = page.getByRole("radio", { name: /2 half matches/i });
  await expect(halfMatches).toBeVisible({ timeout: 15000 });
  await halfMatches.click();
  await expect(halfMatches).toBeChecked({ timeout: 5000 });

  await expect(confirm).toBeEnabled({ timeout: 15000 });
  await confirm.click();
  await expect(
    page.getByRole("button", { name: /Select Movement|Saving/ }),
  ).toHaveCount(0, { timeout: 15000 });
}

/**
 * Open the Movement tab and set up a Swiss Teams movement. Like Swiss Pairs it
 * is offered only for a single-section game, in place of the Swiss Pairs card
 * when the game's event type is Teams. Its option (`swiss-teams-movement-option`)
 * opens the Swiss Teams setup dialog; this taps it, accepts the dialog's
 * defaults (rounds / boards-per-round / odd-handling; the team count is fixed
 * by the table count), and confirms.
 */
export async function pickSwissTeamsMovement(page: Page): Promise<void> {
  await openSetupStep(page, "Movement");
  const swissTeams = page.getByTestId("swiss-teams-movement-option");
  await expect(swissTeams).toBeVisible({ timeout: 15000 });
  await swissTeams.click();

  const confirm = page.getByRole("button", { name: "Select Movement" });
  await expect(confirm).toBeEnabled({ timeout: 15000 });
  await confirm.click();
  await expect(
    page.getByRole("button", { name: /Select Movement|Saving/ }),
  ).toHaveCount(0, { timeout: 15000 });
}

/**
 * Open the Movement tab and set up a Swiss Teams movement that resolves an ODD
 * field with triples, following a per-round plan. Taps the Swiss Teams card to
 * open its dialog, trims the round count down to `plan.length` (so the revealed
 * per-round plan is short and fits the phone viewport), selects the "Triple"
 * odd-handling radio (which reveals the per-round builder), sets each round to
 * its planned kind ("BYE" | "SHORT" | "LONG"), and confirms.
 *
 * A LONG takes two rounds, so the plan must place "LONG" on two neighbouring
 * rounds (the dialog rejects a lone LONG). Used by the odd-field triple journey.
 */
export async function pickSwissTeamsTripleMovement(
  page: Page,
  plan: Array<"BYE" | "SHORT" | "LONG">,
): Promise<void> {
  await openSetupStep(page, "Movement");
  const swissTeams = page.getByTestId("swiss-teams-movement-option");
  await expect(swissTeams).toBeVisible({ timeout: 15000 });
  await swissTeams.click();

  const confirm = page.getByRole("button", { name: "Select Movement" });
  await expect(confirm).toBeVisible({ timeout: 15000 });

  // Trim rounds down to the plan length via the Rounds stepper so the revealed
  // per-round plan is short and the dialog fits the viewport.
  const decreaseRounds = page.getByRole("button", {
    name: "Decrease Rounds",
    exact: true,
  });
  for (let guard = 0; guard < 40; guard++) {
    const value = Number(
      await page.getByRole("spinbutton", { name: "Rounds" }).inputValue(),
    );
    if (value <= plan.length) break;
    await decreaseRounds.click();
    await page.waitForTimeout(50);
  }

  // Choose "Triple" to reveal the per-round plan builder.
  const triple = page.getByRole("radio", { name: /triple/i });
  await expect(triple).toBeVisible({ timeout: 15000 });
  await triple.click();

  // Set each round to its planned kind. The per-round plan is a table of radios
  // labelled "Bye for round N" / "Short for round N" / "Long for round N";
  // "Short" is the default.
  const planBuilder = page.getByTestId("teams-odd-round-plan");
  await expect(planBuilder).toBeVisible({ timeout: 15000 });
  for (let i = 0; i < plan.length; i++) {
    const label = {
      BYE: `Bye for round ${i + 1}`,
      SHORT: `Short for round ${i + 1}`,
      LONG: `Long for round ${i + 1}`,
    }[plan[i]];
    await planBuilder.getByRole("radio", { name: label }).click();
  }

  await expect(confirm).toBeEnabled({ timeout: 15000 });
  await confirm.click();
  await expect(
    page.getByRole("button", { name: /Select Movement|Saving/ }),
  ).toHaveCount(0, { timeout: 15000 });
}

/**
 * Start the game from the "Start Game" screen in the Setup menu. Requires a
 * valid movement and full seating; the Start Game button stays disabled until
 * both hold. Starting is director-authorised, so this must run in the
 * game-creating context.
 */
export async function startGame(page: Page, gameId: string): Promise<void> {
  // Seating leaves the director on the last pair's play page, so return to the
  // setup route before opening the Start Game screen.
  await page.goto(`/game/${gameId}/create`);
  await openSetupStep(page, "Start Game");
  const startButton = page.getByRole("button", { name: "Start Game" });
  await expect(startButton).toBeEnabled({ timeout: 15000 });
  await startButton.click();
  // handleStartGame POSTs /api/games/[id]/start then revalidates the game; the
  // button flips to "Starting…" while in flight. Wait for it to settle back so
  // the request has resolved before players enter the round.
  await expect(
    page.getByRole("button", { name: "Starting", exact: false }),
  ).toHaveCount(0, { timeout: 15000 });
}
