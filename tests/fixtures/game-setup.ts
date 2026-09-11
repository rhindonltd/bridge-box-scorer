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

// The NumberStepper decrement glyph is a MINUS SIGN (U+2212), not a hyphen.
const MINUS = "\u2212";

/**
 * Open the header hamburger ("Setup menu") and switch to the named setup view
 * (Tables / Movement / Timer). Replaces the old segmented tab bar, so callers
 * that previously clicked a `tab` now go through this menu.
 */
export async function openSetupStep(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Setup menu" }).click();
  await page.getByRole("menuitem", { name }).click();
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
  const value = await page.evaluate(() => {
    const minus = [...document.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "\u2212",
    );
    // The stepper value sits between the − and + buttons in the same row.
    const row = minus?.parentElement;
    const text = row?.textContent?.replace(/[\u2212+]/g, "").trim();
    return text ?? "";
  });
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Could not read table count (saw "${value}")`);
  }
  return n;
}

/**
 * Drive the Tables stepper to the requested count using the +/− buttons,
 * exactly as a director would (there is no direct text entry).
 */
export async function setTableCount(page: Page, target: number): Promise<void> {
  await openSetupStep(page, "Tables");
  await expect(page.getByRole("button", { name: MINUS, exact: true })).toBeVisible();

  for (let guard = 0; guard < 20; guard++) {
    const current = await readTableCount(page);
    if (current === target) return;
    const name = current > target ? MINUS : "+";
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
