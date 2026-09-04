import { Page, expect } from "@playwright/test";

/**
 * Pure-UI game setup helpers, driven through the director setup tabs at
 * `/game/{id}/create`: Tables (table count + seating overview), Movement
 * (recommended movement picker) and the Start Game action.
 *
 * A two-table game is the smallest field that yields a recommended movement
 * (a single table offers none), so the live-update journeys use two tables.
 */

// The NumberStepper decrement glyph is a MINUS SIGN (U+2212), not a hyphen.
const MINUS = "\u2212";

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
  await page.getByRole("tab", { name: "Tables" }).click();
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
 */
export async function pickFirstMovement(page: Page): Promise<void> {
  await page.getByRole("tab", { name: "Movement" }).click();
  const firstCard = page.getByTestId("movement-card").first();
  await expect(firstCard).toBeVisible({ timeout: 15000 });
  await firstCard.click();
}

/**
 * Start the game from the Tables tab. Requires a valid movement and full
 * seating; the Start Game button stays disabled until both hold. Starting is
 * director-authorised, so this must run in the game-creating context.
 */
export async function startGame(page: Page, gameId: string): Promise<void> {
  // Seating leaves the director on the last pair's play page, so return to the
  // setup route before driving the Tables tab.
  await page.goto(`/game/${gameId}/create`);
  await page.getByRole("tab", { name: "Tables" }).click();
  const startButton = page.getByRole("button", { name: "Start Game" });
  await expect(startButton).toBeEnabled({ timeout: 15000 });
  await startButton.click();
  // handleStartGame emits START_GAME (acked) then revalidates the game; the
  // button flips to "Starting…" while in flight. Wait for it to settle back so
  // the START_GAME ack has resolved before players enter the round.
  await expect(
    page.getByRole("button", { name: "Starting", exact: false }),
  ).toHaveCount(0, { timeout: 15000 });
}
